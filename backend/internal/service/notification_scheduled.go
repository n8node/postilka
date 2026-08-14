package service

import (
	"context"
	"fmt"
	"time"

	"github.com/postilka/postilka/internal/model"
)

func (s *NotificationService) ProcessScheduled(ctx context.Context) error {
	if s == nil {
		return nil
	}
	s.processPlanExpiry(ctx)
	s.processTrashExpiring(ctx)
	return nil
}

func (s *NotificationService) processPlanExpiry(ctx context.Context) {
	if s.subs == nil || s.plans == nil {
		return
	}
	now := time.Now().UTC()
	due, err := s.subs.ListEndingBetween(ctx, now, now.Add(7*24*time.Hour), 100)
	if err != nil {
		s.warn("list expiring subscriptions", err)
		return
	}
	for i := range due {
		sub := due[i]
		planName := "текущий"
		if plan, err := s.plans.GetByID(ctx, sub.PlanID); err == nil && plan != nil {
			if plan.IsFree {
				continue
			}
			planName = plan.Name
		}
		daysLeft := int(sub.PeriodEnd.Sub(now).Hours() / 24)
		if daysLeft < 0 {
			continue
		}
		if daysLeft <= 3 {
			s.CreateForWorkspaceDeduped(ctx, sub.WorkspaceID, adminRoles(), NotificationInput{
				Type:     model.NotifyPlanExpiry3d,
				Category: model.NotificationWarning,
				Title:    "Тариф заканчивается через 3 дня",
				Body:     fmt.Sprintf("Тариф «%s» действует до %s.", planName, sub.PeriodEnd.Local().Format("02.01.2006")),
				Payload:  map[string]any{"subscription_id": sub.ID, "days": 3},
				Href:     "/plans",
			}, "subscription_id", sub.ID, 24*time.Hour)
			continue
		}
		s.CreateForWorkspaceDeduped(ctx, sub.WorkspaceID, adminRoles(), NotificationInput{
			Type:     model.NotifyPlanExpiry7d,
			Category: model.NotificationInfo,
			Title:    "Тариф заканчивается через 7 дней",
			Body:     fmt.Sprintf("Тариф «%s» действует до %s.", planName, sub.PeriodEnd.Local().Format("02.01.2006")),
			Payload:  map[string]any{"subscription_id": sub.ID, "days": 7},
			Href:     "/plans",
		}, "subscription_id", sub.ID, 24*time.Hour)
	}
}

func (s *NotificationService) processTrashExpiring(ctx context.Context) {
	if s.folders == nil || s.files == nil || s.quota == nil {
		return
	}
	ids, err := s.folders.WorkspaceIDsWithTrash(ctx)
	if err != nil {
		s.warn("list trash workspaces", err)
		return
	}
	now := time.Now().UTC()
	for _, wsID := range ids {
		plan, _, err := s.quota.getWorkspacePlan(ctx, wsID)
		if err != nil || plan == nil || plan.TrashRetentionDays <= 1 {
			continue
		}
		retention := time.Duration(plan.TrashRetentionDays) * 24 * time.Hour
		soonCutoff := now.Add(-(retention - 24*time.Hour))
		finalCutoff := now.Add(-retention)
		soon, err := s.files.ListExpiredTrashed(ctx, wsID, soonCutoff)
		if err != nil {
			continue
		}
		n := 0
		for _, f := range soon {
			if f.DeletedAt != nil && !f.DeletedAt.Before(finalCutoff) {
				n++
			}
		}
		if n == 0 {
			continue
		}
		s.CreateForWorkspaceDeduped(ctx, wsID, editorRoles(), NotificationInput{
			Type:     model.NotifyTrashExpiring,
			Category: model.NotificationWarning,
			Title:    "Файлы в корзине скоро удалятся",
			Body:     fmt.Sprintf("За сутки будут удалены навсегда: %d.", n),
			Payload:  map[string]any{"workspace_id": wsID},
			Href:     "/files",
		}, "workspace_id", wsID, 24*time.Hour)
	}
}
