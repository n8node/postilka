package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
)

type WorkflowApprovalRunResolver interface {
	CompleteApprovalRun(ctx context.Context, workspaceID, runID, postID string, approved bool) error
}

type WorkflowApprovalDraftInput struct {
	WorkflowID     string
	WorkflowRunID  string
	WorkflowNodeID string
	Text           string
	FileID         string
	ChannelIDs     []string
	ApproverIDs    []string
	DueAt          *time.Time
}

func (s *PostService) SetWorkflowApprovalResolver(resolver WorkflowApprovalRunResolver) {
	s.workflowRuns = resolver
}

func (s *PostService) CreateWorkflowApprovalPost(
	ctx context.Context,
	workspaceID, userID string,
	in WorkflowApprovalDraftInput,
) (*model.Post, error) {
	if err := s.requireVerifiedEmail(ctx, userID); err != nil {
		return nil, err
	}
	if _, err := s.workspaces.RequireMembership(ctx, userID, workspaceID, model.RoleEditor); err != nil {
		return nil, err
	}

	approvers := model.NormalizeUserIDs(in.ApproverIDs)
	if len(approvers) == 0 {
		return nil, fmt.Errorf("%w: выберите, кто должен согласовать публикацию", ErrInvalidPost)
	}
	channels := model.NormalizeUserIDs(in.ChannelIDs)
	if len(channels) == 0 {
		return nil, fmt.Errorf("%w: выберите канал для согласования", ErrInvalidPost)
	}
	text := strings.TrimSpace(in.Text)
	fileID := strings.TrimSpace(in.FileID)
	if text == "" && fileID == "" {
		return nil, fmt.Errorf("%w: укажите текст или медиафайл", ErrInvalidPost)
	}
	if in.DueAt != nil && !in.DueAt.After(time.Now()) {
		return nil, fmt.Errorf("%w: время публикации должно быть в будущем", ErrInvalidPost)
	}

	targets := make([]model.PostTargetInput, 0, len(channels))
	for _, id := range channels {
		targets = append(targets, model.PostTargetInput{ChannelID: id})
	}
	var media []model.PostMediaInput
	if fileID != "" {
		media = []model.PostMediaInput{{FileID: fileID}}
	}

	req := model.PostSaveRequest{
		Content: model.PostContent{
			Format:    "message",
			Text:      text,
			ParseMode: "HTML",
		},
		Settings: model.PostSettings{
			ApprovalRequired: true,
			ApproverUserIDs:  approvers,
			WorkflowID:       strings.TrimSpace(in.WorkflowID),
			WorkflowRunID:    strings.TrimSpace(in.WorkflowRunID),
			WorkflowNodeID:   strings.TrimSpace(in.WorkflowNodeID),
		},
		Targets: targets,
		Media:   media,
		Origin:  model.PostOriginUser,
	}
	if err := s.validate(ctx, workspaceID, req, false); err != nil {
		return nil, err
	}

	post, err := s.posts.Create(ctx, workspaceID, userID, req)
	if err != nil {
		return nil, err
	}
	if err := ValidatePostForPublication(*post); err != nil {
		return nil, err
	}
	if err := s.validateExistingTargets(ctx, post); err != nil {
		return nil, err
	}

	updated, err := s.posts.SetPendingApproval(ctx, workspaceID, post.ID, in.DueAt)
	if err != nil {
		return nil, err
	}
	if _, err := s.approvals.AddEvent(ctx, workspaceID, post.ID, userID, "submit", "Отправлено из процесса"); err != nil {
		return nil, err
	}
	if s.notify != nil {
		s.notify.NotifyApprovalSubmitted(ctx, *updated, userID)
	}
	return updated, nil
}

func (s *PostService) resolveWorkflowApprovalRun(ctx context.Context, post *model.Post, approved bool) {
	if s.workflowRuns == nil || post == nil {
		return
	}
	runID := strings.TrimSpace(post.Settings.WorkflowRunID)
	if runID == "" {
		return
	}
	_ = s.workflowRuns.CompleteApprovalRun(ctx, post.WorkspaceID, runID, post.ID, approved)
}
