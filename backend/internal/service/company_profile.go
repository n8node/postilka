package service

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var ErrInvalidCompanyProfile = errors.New("invalid company profile")

type CompanyProfileService struct {
	repo  *repository.CompanyProfileRepository
	wsSvc *WorkspaceService
}

func NewCompanyProfileService(repo *repository.CompanyProfileRepository, wsSvc *WorkspaceService) *CompanyProfileService {
	return &CompanyProfileService{repo: repo, wsSvc: wsSvc}
}

func (s *CompanyProfileService) workspace(ctx context.Context, userID string, r *http.Request, role model.WorkspaceRole) (*model.Workspace, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil || ws == nil {
		return ws, err
	}
	_, err = s.wsSvc.RequireMembership(ctx, userID, ws.ID, role)
	return ws, err
}
func validateCompanyProfile(in model.CompanyProfileInput) error {
	if strings.TrimSpace(in.Name) == "" {
		return ErrInvalidCompanyProfile
	}
	if len(in.Name) > 120 || len(in.Description) > 500 || len(in.TargetAudience) > 500 || len(in.TextInstructions) > 1000 || len(in.VisualStyle) > 500 || len(in.VisualAvoid) > 500 {
		return ErrInvalidCompanyProfile
	}
	return nil
}
func (s *CompanyProfileService) List(ctx context.Context, userID string, r *http.Request) ([]model.CompanyProfile, error) {
	ws, err := s.workspace(ctx, userID, r, model.RoleViewer)
	if err != nil {
		return nil, err
	}
	return s.repo.List(ctx, ws.ID)
}
func (s *CompanyProfileService) Create(ctx context.Context, userID string, r *http.Request, in model.CompanyProfileInput) (*model.CompanyProfile, error) {
	if err := validateCompanyProfile(in); err != nil {
		return nil, err
	}
	ws, err := s.workspace(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	return s.repo.Create(ctx, ws.ID, in)
}
func (s *CompanyProfileService) Update(ctx context.Context, userID string, r *http.Request, id string, in model.CompanyProfileInput) (*model.CompanyProfile, error) {
	if err := validateCompanyProfile(in); err != nil {
		return nil, err
	}
	ws, err := s.workspace(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	return s.repo.Update(ctx, ws.ID, id, in)
}
func (s *CompanyProfileService) Delete(ctx context.Context, userID string, r *http.Request, id string) error {
	ws, err := s.workspace(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return err
	}
	return s.repo.Delete(ctx, ws.ID, id)
}
func (s *CompanyProfileService) PromptContext(ctx context.Context, workspaceID, id, mediaType string) (string, error) {
	return s.repo.PromptContext(ctx, workspaceID, id, mediaType)
}
