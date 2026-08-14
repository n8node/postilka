package service

import (
	"context"
	"fmt"
	"net/http"
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
	ws, err := s.requireAdmin(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	post, err := s.posts.Get(ctx, ws.ID, postID)
	if err != nil {
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
	if s.notify != nil {
		s.notify.NotifyApprovalDecision(ctx, *post, true, req.Comment)
	}
	if req.Publish || dueAt == nil || !dueAt.After(time.Now()) {
		if err := s.posts.SetPublishing(ctx, ws.ID, postID); err != nil {
			return nil, ErrPostConflict
		}
		return s.publishAndGet(ctx, ws.ID, postID)
	}
	return s.posts.SetScheduled(ctx, ws.ID, postID, *dueAt)
}

func (s *PostService) RejectPost(
	ctx context.Context,
	userID string,
	r *http.Request,
	postID string,
	req model.PostApprovalDecisionRequest,
) (*model.Post, error) {
	ws, err := s.requireAdmin(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	post, err := s.posts.Get(ctx, ws.ID, postID)
	if err != nil {
		return nil, err
	}
	if post.Status != model.PostStatusPendingApproval {
		return nil, fmt.Errorf("%w: публикация не ожидает согласования", ErrInvalidPost)
	}
	updated, err := s.posts.RejectApproval(ctx, ws.ID, postID)
	if err != nil {
		return nil, err
	}
	if _, err := s.approvals.AddEvent(ctx, ws.ID, postID, userID, "reject", req.Comment); err != nil {
		return nil, err
	}
	if s.notify != nil {
		s.notify.NotifyApprovalDecision(ctx, *updated, false, req.Comment)
	}
	return updated, nil
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

func (s *PostService) requireAdmin(
	ctx context.Context,
	userID string,
	r *http.Request,
) (*model.Workspace, error) {
	ws, err := s.requireEditor(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	member, err := s.workspaces.RequireMembership(ctx, userID, ws.ID, model.RoleAdmin)
	if err != nil {
		return nil, err
	}
	return member, nil
}

func (s *PostService) workspaceRole(
	ctx context.Context,
	userID, workspaceID string,
) (model.WorkspaceRole, error) {
	ws, err := s.workspaces.RequireMembership(ctx, userID, workspaceID, model.RoleViewer)
	if err != nil {
		return "", err
	}
	return model.WorkspaceRole(ws.Role), nil
}

func (s *PostService) shouldSubmitForApproval(
	ctx context.Context,
	userID string,
	post model.Post,
) (bool, error) {
	if !post.Settings.ApprovalRequired {
		return false, nil
	}
	role, err := s.workspaceRole(ctx, userID, post.WorkspaceID)
	if err != nil {
		return false, err
	}
	return !role.AtLeast(model.RoleAdmin), nil
}
