package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/mail"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrWorkspaceInviteInvalid = errors.New("invalid or expired workspace invite")
	ErrWorkspaceInviteEmail   = errors.New("invite email mismatch")
)

const workspaceInviteTTL = 7 * 24 * time.Hour

type WorkspaceInviteService struct {
	invites *repository.WorkspaceInviteRepository
	workspaces *repository.WorkspaceRepository
	users   *repository.UserRepository
	wsSvc   *WorkspaceService
	emails  *TransactionalEmailService
	cfg     *config.Config
	logger  *slog.Logger
}

func NewWorkspaceInviteService(
	invites *repository.WorkspaceInviteRepository,
	workspaces *repository.WorkspaceRepository,
	users *repository.UserRepository,
	wsSvc *WorkspaceService,
	emails *TransactionalEmailService,
	cfg *config.Config,
	logger *slog.Logger,
) *WorkspaceInviteService {
	return &WorkspaceInviteService{
		invites: invites, workspaces: workspaces, users: users,
		wsSvc: wsSvc, emails: emails, cfg: cfg, logger: logger,
	}
}

func (s *WorkspaceInviteService) List(ctx context.Context, userID, workspaceID string) ([]model.WorkspaceInvite, error) {
	if _, err := s.wsSvc.RequireMembership(ctx, userID, workspaceID, model.RoleAdmin); err != nil {
		return nil, err
	}
	return s.invites.ListPendingForWorkspace(ctx, workspaceID)
}

func (s *WorkspaceInviteService) Create(
	ctx context.Context,
	userID, workspaceID, email string,
	role model.WorkspaceRole,
) (*model.WorkspaceInvite, error) {
	if role == model.RoleOwner || role == "" {
		return nil, ErrInvalidInput
	}
	ws, err := s.wsSvc.RequireMembership(ctx, userID, workspaceID, model.RoleAdmin)
	if err != nil {
		return nil, err
	}

	email = normalizeEmail(email)
	if _, err := mail.ParseAddress(email); err != nil {
		return nil, ErrInvalidInput
	}

	if existing, _, err := s.users.GetByEmail(ctx, email); err == nil {
		if _, err := s.workspaces.GetMembership(ctx, workspaceID, existing.ID); err == nil {
			return nil, ErrInvalidInput
		}
	} else if !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}

	if err := s.invites.RevokePendingForEmail(ctx, workspaceID, email); err != nil {
		return nil, err
	}

	token, tokenHashBytes, err := newVerificationToken()
	if err != nil {
		return nil, err
	}

	inv, err := s.invites.Create(ctx, workspaceID, email, role, hexEncodeTokenHash(tokenHashBytes), userID, time.Now().Add(workspaceInviteTTL))
	if err != nil {
		return nil, err
	}

	inviter, _ := s.users.GetByID(ctx, userID)
	inviterName := ""
	if inviter != nil {
		inviterName = inviter.Name
	}
	inviteURL := workspaceInviteURL(s.cfg.PublicAppURLNormalized(), token)
	s.emails.SendWorkspaceInviteBestEffort(ctx, email, inviterName, ws.Name, inviteURL, role)

	return inv, nil
}

func (s *WorkspaceInviteService) Accept(ctx context.Context, userID, rawToken string) (*model.Workspace, error) {
	rawToken = strings.TrimSpace(rawToken)
	if rawToken == "" {
		return nil, ErrWorkspaceInviteInvalid
	}

	tokenHash := hexEncodeTokenHash(hashVerificationToken(rawToken))
	inv, err := s.invites.FindValidByTokenHash(ctx, tokenHash)
	if err != nil {
		return nil, ErrWorkspaceInviteInvalid
	}

	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if normalizeEmail(user.Email) != normalizeEmail(inv.Email) {
		return nil, ErrWorkspaceInviteEmail
	}

	if err := s.workspaces.AddMember(ctx, inv.WorkspaceID, userID, inv.Role); err != nil {
		return nil, err
	}
	if err := s.invites.MarkAccepted(ctx, inv.ID); err != nil {
		return nil, err
	}

	ws, err := s.workspaces.GetMembership(ctx, inv.WorkspaceID, userID)
	if err != nil {
		return nil, err
	}
	return ws, nil
}

func (s *WorkspaceInviteService) Preview(ctx context.Context, rawToken string) (map[string]string, error) {
	rawToken = strings.TrimSpace(rawToken)
	if rawToken == "" {
		return nil, ErrWorkspaceInviteInvalid
	}
	tokenHash := hexEncodeTokenHash(hashVerificationToken(rawToken))
	inv, err := s.invites.FindValidByTokenHash(ctx, tokenHash)
	if err != nil {
		return nil, ErrWorkspaceInviteInvalid
	}
	ws, err := s.workspaces.GetByID(ctx, inv.WorkspaceID)
	if err != nil {
		return nil, err
	}
	return map[string]string{
		"workspace_name": ws.Name,
		"email":          inv.Email,
		"role":           string(inv.Role),
	}, nil
}

func hexEncodeTokenHash(hash []byte) string {
	return fmt.Sprintf("%x", hash)
}
