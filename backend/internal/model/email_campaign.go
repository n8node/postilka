package model

import "time"

type EmailCampaignQueueStatus string

const (
	EmailCampaignPending    EmailCampaignQueueStatus = "pending"
	EmailCampaignProcessing EmailCampaignQueueStatus = "processing"
	EmailCampaignSent       EmailCampaignQueueStatus = "sent"
	EmailCampaignFailed     EmailCampaignQueueStatus = "failed"
)

type EmailCampaignQueueItem struct {
	ID                  string
	CampaignType        string
	RecipientEmail      string
	RecipientName       string
	Subject             string
	Preheader           string
	ContentHTML         string
	CTALabel            string
	CTAURL              string
	SendIntervalSeconds int
	TemplateSettings    EmailTemplateSettings
	Status              EmailCampaignQueueStatus
	AttemptCount        int
	NextAttemptAt       time.Time
	LastError           string
	LockedAt            *time.Time
	SentAt              *time.Time
}
