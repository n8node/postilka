package service

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
)

func (s *PostService) ListApprovalEvents(
	ctx context.Context,
	userID string,
	r *http.Request,
	postID string,
) ([]model.PostApprovalEvent, error) {
	ws, err := s.requireEditor(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if _, err := s.posts.Get(ctx, ws.ID, postID); err != nil {
		return nil, err
	}
	return s.approvals.ListByPost(ctx, ws.ID, postID)
}

func (s *PostService) SubmitForApproval(
	ctx context.Context,
	userID string,
	r *http.Request,
	postID string,
	req model.PostApprovalSubmitRequest,
) (*model.Post, error) {
	if err := s.requireVerifiedEmail(ctx, userID); err != nil {
		return nil, err
	}
	ws, err := s.requireEditor(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	post, err := s.posts.Get(ctx, ws.ID, postID)
	if err != nil {
		return nil, err
	}
	if !post.Settings.ApprovalRequired {
		return nil, fmt.Errorf("%w: для этой публикации согласование не включено", ErrInvalidPost)
	}
	if len(post.Settings.NormalizedApproverIDs()) == 0 {
		return nil, fmt.Errorf("%w: выберите, кто должен согласовать публикацию", ErrInvalidPost)
	}
	if err := ValidatePostForPublication(*post); err != nil {
		return nil, err
	}
	if err := s.validateExistingTargets(ctx, post); err != nil {
		return nil, err
	}
	var dueAt *time.Time
	if req.DueAt != nil && !req.DueAt.IsZero() {
		if !req.DueAt.After(time.Now()) {
			return nil, fmt.Errorf("%w: время публикации должно быть в будущем", ErrInvalidPost)
		}
		next := req.DueAt.UTC()
		dueAt = &next
	}
	updated, err := s.posts.SetPendingApproval(ctx, ws.ID, postID, dueAt)
	if err != nil {
		return nil, err
	}
	if post.Status == model.PostStatusPendingApproval {
		return updated, nil
	}
	if _, err := s.approvals.AddEvent(ctx, ws.ID, postID, userID, "submit", req.Comment); err != nil {
		return nil, err
	}
	if s.notify != nil {
		s.notify.NotifyApprovalSubmitted(ctx, *updated, userID)
	}
	return updated, nil
}

func (s *PostService) ApprovePost(
	ctx context.Context,
	userID string,
	r *http.Request,
	postID string,
	req model.PostApprovalDecisionRequest,
) (*model.Post, error) {
	if err := s.requireVerifiedEmail(ctx, userID); err != nil {
		return nil, err
	}
	ws, err := s.requireEditor(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	post, err := s.posts.Get(ctx, ws.ID, postID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureCanDecideApproval(ctx, userID, ws.ID, *post); err != nil {
		return nil, err
	}
	if post.Status != model.PostStatusPendingApproval {
		return nil, fmt.Errorf("%w: публикация не ожидает согласования", ErrInvalidPost)
	}
	if err := ValidatePostForPublication(*post); err != nil {
		return nil, err
	}
	if err := s.validateExistingTargets(ctx, post); err != nil {
		return nil, err
	}
	if _, err := s.approvals.AddEvent(ctx, ws.ID, postID, userID, "approve", req.Comment); err != nil {
		return nil, err
	}

	dueAt := post.DueAt
	if req.DueAt != nil && !req.DueAt.IsZero() {
		next := req.DueAt.UTC()
		dueAt = &next
	}
	publishNow := req.Publish || dueAt == nil || !dueAt.After(time.Now())
	notifyPost := *post
	if dueAt != nil {
		notifyPost.DueAt = dueAt
	}
	if publishNow {
		if err := s.posts.SetPublishing(ctx, ws.ID, postID); err != nil {
			return nil, ErrPostConflict
		}
		if s.notify != nil {
			s.notify.NotifyApprovalDecision(ctx, notifyPost, userID, true, true, req.Comment)
		}
		published, err := s.publishAndGet(ctx, ws.ID, postID)
		if err == nil {
			s.resolveWorkflowApprovalRun(ctx, published, true)
		}
		return published, err
	}
	scheduled, err := s.posts.SetScheduled(ctx, ws.ID, postID, *dueAt)
	if err != nil {
		return nil, err
	}
	if s.notify != nil {
		s.notify.NotifyApprovalDecision(ctx, *scheduled, userID, true, false, req.Comment)
	}
	s.resolveWorkflowApprovalRun(ctx, scheduled, true)
	return scheduled, nil
}

func (s *PostService) RejectPost(
	ctx context.Context,
	userID string,
	r *http.Request,
	postID string,
	req model.PostApprovalDecisionRequest,
) (*model.Post, error) {
	ws, err := s.requireEditor(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	post, err := s.posts.Get(ctx, ws.ID, postID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureCanDecideApproval(ctx, userID, ws.ID, *post); err != nil {
		return nil, err
	}
	if post.Status != model.PostStatusPendingApproval {
		return nil, fmt.Errorf("%w: публикация не ожидает согласования", ErrInvalidPost)
	}
	if strings.TrimSpace(req.Comment) == "" {
		return nil, fmt.Errorf("%w: укажите комментарий, что нужно доработать", ErrInvalidPost)
	}
	updated, err := s.posts.RejectApproval(ctx, ws.ID, postID)
	if err != nil {
		return nil, err
	}
	if _, err := s.approvals.AddEvent(ctx, ws.ID, postID, userID, "reject", req.Comment); err != nil {
		return nil, err
	}
	if s.notify != nil {
		s.notify.NotifyApprovalDecision(ctx, *updated, userID, false, false, req.Comment)
	}
	s.resolveWorkflowApprovalRun(ctx, updated, false)
	tmp := []model.Post{*updated}
	s.stampApprovalMeta(ctx, tmp)
	return &tmp[0], nil
}

func (s *PostService) CommentPost(
	ctx context.Context,
	userID string,
	r *http.Request,
	postID string,
	req model.PostApprovalCommentRequest,
) (*model.PostApprovalEvent, error) {
	ws, err := s.requireEditor(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if req.Comment == "" {
		return nil, fmt.Errorf("%w: комментарий не может быть пустым", ErrInvalidPost)
	}
	if _, err := s.posts.Get(ctx, ws.ID, postID); err != nil {
		return nil, err
	}
	event, err := s.approvals.AddEvent(ctx, ws.ID, postID, userID, "comment", req.Comment)
	if err != nil {
		return nil, err
	}
	if s.notify != nil {
		if post, getErr := s.posts.Get(ctx, ws.ID, postID); getErr == nil {
			s.notify.NotifyApprovalComment(ctx, *post, userID, req.Comment)
		}
	}
	return event, nil
}

func (s *PostService) maybeSubmitForApproval(
	ctx context.Context,
	userID string,
	r *http.Request,
	post *model.Post,
) (*model.Post, error) {
	if post == nil {
		return post, nil
	}
	submit, err := s.shouldSubmitForApproval(ctx, userID, *post)
	if err != nil {
		return nil, err
	}
	if !submit {
		return post, nil
	}
	if err := ValidatePostForPublication(*post); err != nil {
		return post, nil
	}
	if err := s.validateExistingTargets(ctx, post); err != nil {
		return post, nil
	}
	return s.SubmitForApproval(ctx, userID, r, post.ID, model.PostApprovalSubmitRequest{DueAt: post.DueAt})
}

func (s *PostService) shouldSubmitForApproval(
	_ context.Context,
	_ string,
	post model.Post,
) (bool, error) {
	return post.Settings.ApprovalRequired && len(post.Settings.NormalizedApproverIDs()) > 0, nil
}

func (s *PostService) ensureCanDecideApproval(ctx context.Context, userID, workspaceID string, post model.Post) error {
	if post.Settings.HasApprover(userID) {
		return nil
	}
	if _, err := s.workspaces.RequireMembership(ctx, userID, workspaceID, model.RoleAdmin); err != nil {
		return fmt.Errorf("%w: вас не назначили согласующим эту публикацию", ErrForbidden)
	}
	return nil
}
