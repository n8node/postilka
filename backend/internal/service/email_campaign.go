package service

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

const CommunityPromoCampaignType = "community_promo"

type EmailCampaignService struct {
	queue *repository.EmailCampaignQueueRepository
	users *repository.UserRepository
	email *EmailService
	log   *slog.Logger
}

func NewEmailCampaignService(queue *repository.EmailCampaignQueueRepository, users *repository.UserRepository, email *EmailService, logger *slog.Logger) *EmailCampaignService {
	return &EmailCampaignService{queue: queue, users: users, email: email, log: logger}
}

func (s *EmailCampaignService) EnqueueCommunityPromo(ctx context.Context, userIDs []string, cfg model.CommunityPromoTemplate) (queued, skipped int, err error) {
	for _, id := range userIDs {
		user, getErr := s.users.GetByID(ctx, strings.TrimSpace(id))
		if getErr != nil || user.IsBlocked || !model.IsDeliverableEmail(user.Email) {
			skipped++
			continue
		}
		if err := s.ValidatePause(cfg.SendIntervalSeconds); err != nil {
			return queued, skipped, err
		}
		next := time.Now().Add(time.Duration(queued*cfg.SendIntervalSeconds) * time.Second)
		if err := s.queue.Enqueue(ctx, model.EmailCampaignQueueItem{CampaignType: CommunityPromoCampaignType, RecipientEmail: user.Email, RecipientName: user.Name, Subject: cfg.Subject, Preheader: cfg.Preheader, ContentHTML: cfg.ContentHTML, CTALabel: cfg.CTALabel, CTAURL: cfg.CTAURL, SendIntervalSeconds: cfg.SendIntervalSeconds}, next); err != nil {
			return queued, skipped, err
		}
		queued++
	}
	return queued, skipped, nil
}

func (s *EmailCampaignService) ProcessOne(ctx context.Context) (bool, error) {
	item, err := s.queue.ClaimOne(ctx, time.Now().Add(-15*time.Minute))
	if err != nil || item == nil {
		return item != nil, err
	}
	err = s.email.Send(ctx, item.RecipientEmail, item.Subject, CommunityPromoEmailBody(model.CommunityPromoTemplate{Preheader: item.Preheader, ContentHTML: item.ContentHTML, CTALabel: item.CTALabel, CTAURL: item.CTAURL}))
	if err == nil {
		return true, s.queue.MarkSent(ctx, item.ID)
	}
	_ = s.queue.MarkFailed(ctx, item.ID, err.Error(), time.Now().Add(1*time.Minute))
	if s.log != nil {
		s.log.Warn("email campaign delivery failed", "id", item.ID, "error", err)
	}
	return true, nil
}

func (s *EmailCampaignService) ValidatePause(seconds int) error {
	if seconds < 1 || seconds > 3600 {
		return fmt.Errorf("send interval must be between 1 and 3600 seconds")
	}
	return nil
}
