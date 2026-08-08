package service

import (
	"context"
	"errors"
	"strings"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrPlanNotFound   = errors.New("plan not found")
	ErrPlanInUse      = errors.New("plan is assigned to workspaces")
	ErrPlanSlugTaken  = errors.New("plan slug already exists")
	ErrNoPrimaryWS    = errors.New("user has no workspace")
)

type PlanService struct {
	plans      *repository.PlanRepository
	workspaces *repository.WorkspaceRepository
}

func NewPlanService(plans *repository.PlanRepository, workspaces *repository.WorkspaceRepository) *PlanService {
	return &PlanService{plans: plans, workspaces: workspaces}
}

func (s *PlanService) List(ctx context.Context) ([]model.Plan, error) {
	return s.plans.List(ctx)
}

func (s *PlanService) Get(ctx context.Context, id string) (*model.Plan, error) {
	p, err := s.plans.GetByID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrPlanNotFound
	}
	return p, err
}

type PlanInput struct {
	Slug                 string
	Name                 string
	Description          string
	IsFree               bool
	IsActive             bool
	IsPopular            bool
	PriceMonthlyCents    *int
	PriceYearlyCents     *int
	MaxChannels          *int
	MaxPostsPerPeriod    *int
	MaxSeats             *int
	StorageBytes         *int64
	MaxFileSizeBytes     *int64
	TrashRetentionDays   int
	AITextTokensQuota    *int
	AIMediaCreditsQuota  *int
	FreePlanDurationDays *int
	SortOrder            int
}

func (s *PlanService) Create(ctx context.Context, in PlanInput) (*model.Plan, error) {
	name := strings.TrimSpace(in.Name)
	if name == "" {
		return nil, ErrInvalidInput
	}
	slug := strings.TrimSpace(in.Slug)
	if slug == "" {
		slug = repository.NormalizePlanSlug(name)
	}
	exists, err := s.plans.SlugExists(ctx, slug, "")
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrPlanSlugTaken
	}

	p := &model.Plan{
		Slug:                 slug,
		Name:                 name,
		Description:          strings.TrimSpace(in.Description),
		IsFree:               in.IsFree,
		IsActive:             in.IsActive,
		IsPopular:            in.IsPopular,
		PriceMonthlyCents:    in.PriceMonthlyCents,
		PriceYearlyCents:     in.PriceYearlyCents,
		MaxChannels:          in.MaxChannels,
		MaxPostsPerPeriod:    in.MaxPostsPerPeriod,
		MaxSeats:             in.MaxSeats,
		StorageBytes:         in.StorageBytes,
		MaxFileSizeBytes:     in.MaxFileSizeBytes,
		TrashRetentionDays:   in.TrashRetentionDays,
		AITextTokensQuota:    in.AITextTokensQuota,
		AIMediaCreditsQuota:  in.AIMediaCreditsQuota,
		FreePlanDurationDays: in.FreePlanDurationDays,
		SortOrder:            in.SortOrder,
	}
	return s.plans.Create(ctx, p)
}

func (s *PlanService) Update(ctx context.Context, id string, in PlanInput) (*model.Plan, error) {
	existing, err := s.plans.GetByID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrPlanNotFound
	}
	if err != nil {
		return nil, err
	}

	name := strings.TrimSpace(in.Name)
	if name == "" {
		return nil, ErrInvalidInput
	}
	slug := strings.TrimSpace(in.Slug)
	if slug == "" {
		slug = existing.Slug
	}
	exists, err := s.plans.SlugExists(ctx, slug, id)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrPlanSlugTaken
	}

	p := &model.Plan{
		ID:                   id,
		Slug:                 slug,
		Name:                 name,
		Description:          strings.TrimSpace(in.Description),
		IsFree:               in.IsFree,
		IsActive:             in.IsActive,
		IsPopular:            in.IsPopular,
		PriceMonthlyCents:    in.PriceMonthlyCents,
		PriceYearlyCents:     in.PriceYearlyCents,
		MaxChannels:          in.MaxChannels,
		MaxPostsPerPeriod:    in.MaxPostsPerPeriod,
		MaxSeats:             in.MaxSeats,
		StorageBytes:         in.StorageBytes,
		MaxFileSizeBytes:     in.MaxFileSizeBytes,
		TrashRetentionDays:   in.TrashRetentionDays,
		AITextTokensQuota:    in.AITextTokensQuota,
		AIMediaCreditsQuota:  in.AIMediaCreditsQuota,
		FreePlanDurationDays: in.FreePlanDurationDays,
		SortOrder:            in.SortOrder,
	}
	return s.plans.Update(ctx, p)
}

func (s *PlanService) Delete(ctx context.Context, id string) error {
	n, err := s.plans.CountWorkspaces(ctx, id)
	if err != nil {
		return err
	}
	if n > 0 {
		return ErrPlanInUse
	}
	err = s.plans.Delete(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrPlanNotFound
	}
	return err
}

// AssignToUserPrimaryWorkspace sets the plan on the user's primary workspace.
func (s *PlanService) AssignToUserPrimaryWorkspace(ctx context.Context, userID, planID string) (*model.Plan, *model.Workspace, error) {
	plan, err := s.plans.GetByID(ctx, planID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, nil, ErrPlanNotFound
	}
	if err != nil {
		return nil, nil, err
	}

	ws, err := s.workspaces.GetPrimaryForUser(ctx, userID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, nil, ErrNoPrimaryWS
	}
	if err != nil {
		return nil, nil, err
	}

	if err := s.workspaces.SetPlan(ctx, ws.ID, plan.ID); err != nil {
		return nil, nil, err
	}
	return plan, ws, nil
}
