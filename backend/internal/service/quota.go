package service

import (
	"context"
	"errors"
	"time"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

type QuotaService struct {
	plans      *repository.PlanRepository
	workspaces *repository.WorkspaceRepository
	subs       *repository.SubscriptionRepository
	usage      *repository.UsageRepository
	channels   *repository.ChannelRepository
	workflows  *repository.WorkflowRepository
}

func NewQuotaService(
	plans *repository.PlanRepository,
	workspaces *repository.WorkspaceRepository,
	subs *repository.SubscriptionRepository,
	usage *repository.UsageRepository,
	channels *repository.ChannelRepository,
	workflows *repository.WorkflowRepository,
) *QuotaService {
	return &QuotaService{
		plans: plans, workspaces: workspaces, subs: subs,
		usage: usage, channels: channels, workflows: workflows,
	}
}

func (s *QuotaService) periodStartForWorkspace(ctx context.Context, workspaceID string, fallback time.Time) time.Time {
	sub, err := s.subs.GetActiveForWorkspace(ctx, workspaceID)
	if err == nil {
		return sub.PeriodStart.UTC()
	}
	return fallback.UTC()
}

func (s *QuotaService) periodEndForWorkspace(ctx context.Context, workspaceID string, fallback time.Time) time.Time {
	sub, err := s.subs.GetActiveForWorkspace(ctx, workspaceID)
	if err == nil {
		return sub.PeriodEnd.UTC()
	}
	start := fallback.UTC()
	return start.AddDate(0, 1, 0)
}

func (s *QuotaService) GetUsage(ctx context.Context, workspaceID string, planAssignedAt time.Time) (model.BillingUsage, error) {
	periodStart := s.periodStartForWorkspace(ctx, workspaceID, planAssignedAt)
	posts, err := s.usage.SumForPeriod(ctx, workspaceID, "posts", periodStart)
	if err != nil {
		return model.BillingUsage{}, err
	}
	aiText, err := s.usage.SumForPeriod(ctx, workspaceID, "ai_text_tokens", periodStart)
	if err != nil {
		return model.BillingUsage{}, err
	}
	aiMedia, err := s.usage.SumForPeriod(ctx, workspaceID, "ai_media_credits", periodStart)
	if err != nil {
		return model.BillingUsage{}, err
	}
	channelsUsed := 0
	if s.channels != nil {
		if n, err := s.channels.CountByWorkspace(ctx, workspaceID); err == nil {
			channelsUsed = n
		}
	}
	workflowsUsed := 0
	if s.workflows != nil {
		if n, err := s.workflows.CountByWorkspace(ctx, workspaceID); err == nil {
			workflowsUsed = n
		}
	}
	return model.BillingUsage{
		ChannelsUsed:       channelsUsed,
		PostsUsed:          posts,
		WorkflowsUsed:      workflowsUsed,
		AITextTokensUsed:   aiText,
		AIMediaCreditsUsed: aiMedia,
		PeriodStart:        periodStart.Format("2006-01-02"),
	}, nil
}

func (s *QuotaService) CheckPostQuota(ctx context.Context, workspaceID string) error {
	plan, assignedAt, err := s.getWorkspacePlan(ctx, workspaceID)
	if err != nil {
		return err
	}
	if plan.MaxPostsPerPeriod == nil {
		return nil
	}
	usage, err := s.GetUsage(ctx, workspaceID, assignedAt)
	if err != nil {
		return err
	}
	if usage.PostsUsed >= *plan.MaxPostsPerPeriod {
		return ErrQuotaExceeded
	}
	return nil
}

func (s *QuotaService) CheckChannelQuota(ctx context.Context, workspaceID string, currentCount int) error {
	plan, _, err := s.getWorkspacePlan(ctx, workspaceID)
	if err != nil {
		return err
	}
	if plan.MaxChannels == nil {
		return nil
	}
	if currentCount >= *plan.MaxChannels {
		return ErrQuotaExceeded
	}
	return nil
}

func (s *QuotaService) CheckWorkflowQuota(ctx context.Context, workspaceID string, currentCount int) error {
	plan, _, err := s.getWorkspacePlan(ctx, workspaceID)
	if err != nil {
		return err
	}
	if plan.MaxWorkflows == nil {
		return nil
	}
	if currentCount >= *plan.MaxWorkflows {
		return ErrQuotaExceeded
	}
	return nil
}

func (s *QuotaService) RecordTextTokens(ctx context.Context, workspaceID string, tokens int) error {
	if tokens <= 0 {
		return nil
	}
	_, assignedAt, err := s.getWorkspacePlan(ctx, workspaceID)
	if err != nil {
		return err
	}
	periodStart := s.periodStartForWorkspace(ctx, workspaceID, assignedAt)
	return s.usage.Record(ctx, workspaceID, "ai_text_tokens", tokens, periodStart)
}

func (s *QuotaService) RecordPost(ctx context.Context, workspaceID string) error {
	_, assignedAt, err := s.getWorkspacePlan(ctx, workspaceID)
	if err != nil {
		return err
	}
	if err := s.CheckPostQuota(ctx, workspaceID); err != nil {
		return err
	}
	periodStart := s.periodStartForWorkspace(ctx, workspaceID, assignedAt)
	return s.usage.Record(ctx, workspaceID, "posts", 1, periodStart)
}

func (s *QuotaService) CheckAIMediaCredits(ctx context.Context, workspaceID, userID string, creditCost int) error {
	// Delegated to AIBillingService.PrefailCheck at call sites; kept for quota layer extension.
	plan, assignedAt, err := s.getWorkspacePlan(ctx, workspaceID)
	if err != nil {
		return err
	}
	if plan.AIMediaCreditsQuota == nil {
		return nil
	}
	usage, err := s.GetUsage(ctx, workspaceID, assignedAt)
	if err != nil {
		return err
	}
	if usage.AIMediaCreditsUsed+creditCost <= *plan.AIMediaCreditsQuota {
		return nil
	}
	_ = userID
	return ErrQuotaExceeded
}

func (s *QuotaService) getWorkspacePlan(ctx context.Context, workspaceID string) (*model.Plan, time.Time, error) {
	planID, assignedAt, err := s.workspaces.GetPlanMeta(ctx, workspaceID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			// Workspace without assigned plan — use default free tier for quota checks.
			free, freeErr := s.plans.GetDefaultFree(ctx)
			if freeErr != nil {
				return nil, time.Time{}, freeErr
			}
			return free, assignedAt, nil
		}
		return nil, time.Time{}, err
	}
	plan, err := s.plans.GetByID(ctx, planID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			free, freeErr := s.plans.GetDefaultFree(ctx)
			if freeErr != nil {
				return nil, time.Time{}, freeErr
			}
			return free, assignedAt, nil
		}
		return nil, time.Time{}, err
	}
	return plan, assignedAt, nil
}
