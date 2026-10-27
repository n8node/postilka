package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type EmailCampaignQueueRepository struct{ pool *pgxpool.Pool }

func NewEmailCampaignQueueRepository(pool *pgxpool.Pool) *EmailCampaignQueueRepository {
	return &EmailCampaignQueueRepository{pool: pool}
}

func (r *EmailCampaignQueueRepository) Enqueue(ctx context.Context, item model.EmailCampaignQueueItem, next time.Time) error {
	if item.ID == "" {
		item.ID = uuid.NewString()
	}
	templateJSON, err := json.Marshal(item.TemplateSettings)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `
		INSERT INTO email_campaign_queue
		(id, campaign_type, recipient_email, recipient_name, subject, preheader, content_html, cta_label, cta_url, send_interval_seconds, template_settings, status, next_attempt_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',$12)
	`, item.ID, item.CampaignType, item.RecipientEmail, item.RecipientName, item.Subject, item.Preheader, item.ContentHTML, item.CTALabel, item.CTAURL, item.SendIntervalSeconds, templateJSON, next)
	return err
}

func (r *EmailCampaignQueueRepository) ClaimOne(ctx context.Context, staleBefore time.Time) (*model.EmailCampaignQueueItem, error) {
	const q = `
		WITH picked AS (
			SELECT id FROM email_campaign_queue
			WHERE next_attempt_at <= NOW() AND (status IN ('pending','failed') OR (status='processing' AND locked_at <= $1))
			ORDER BY next_attempt_at, created_at LIMIT 1 FOR UPDATE SKIP LOCKED
		)
		UPDATE email_campaign_queue q SET status='processing', locked_at=NOW(), updated_at=NOW()
		FROM picked WHERE q.id=picked.id
		RETURNING q.id,q.campaign_type,q.recipient_email,q.recipient_name,q.subject,q.preheader,q.content_html,q.cta_label,q.cta_url,q.send_interval_seconds,q.template_settings,q.status,q.attempt_count,q.next_attempt_at,q.last_error,q.locked_at,q.sent_at
	`
	item := &model.EmailCampaignQueueItem{}
	var status string
	var templateJSON []byte
	err := r.pool.QueryRow(ctx, q, staleBefore).Scan(&item.ID, &item.CampaignType, &item.RecipientEmail, &item.RecipientName, &item.Subject, &item.Preheader, &item.ContentHTML, &item.CTALabel, &item.CTAURL, &item.SendIntervalSeconds, &templateJSON, &status, &item.AttemptCount, &item.NextAttemptAt, &item.LastError, &item.LockedAt, &item.SentAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	item.Status = model.EmailCampaignQueueStatus(status)
	if len(templateJSON) > 0 {
		if err := json.Unmarshal(templateJSON, &item.TemplateSettings); err != nil {
			return nil, err
		}
	}
	return item, nil
}

func (r *EmailCampaignQueueRepository) MarkSent(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `UPDATE email_campaign_queue SET status='sent', sent_at=NOW(), locked_at=NULL, updated_at=NOW() WHERE id=$1`, id)
	return err
}

func (r *EmailCampaignQueueRepository) MarkFailed(ctx context.Context, id, message string, next time.Time) error {
	_, err := r.pool.Exec(ctx, `UPDATE email_campaign_queue SET status='failed', attempt_count=attempt_count+1, last_error=$2, next_attempt_at=$3, locked_at=NULL, updated_at=NOW() WHERE id=$1`, id, message, next)
	return err
}
