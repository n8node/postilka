package model

import "time"

type TelegramNotificationStatus string

const (
	TelegramNotificationStatusPending    TelegramNotificationStatus = "pending"
	TelegramNotificationStatusProcessing TelegramNotificationStatus = "processing"
	TelegramNotificationStatusSent       TelegramNotificationStatus = "sent"
	TelegramNotificationStatusFailed     TelegramNotificationStatus = "failed"
)

type TelegramNotificationRecord struct {
	ID            string                     `json:"id"`
	Kind          string                     `json:"kind"`
	Payload       map[string]any             `json:"payload,omitempty"`
	MessageText   string                     `json:"message_text"`
	Status        TelegramNotificationStatus `json:"status"`
	AttemptCount  int                        `json:"attempt_count"`
	NextAttemptAt time.Time                  `json:"next_attempt_at"`
	LastError     string                     `json:"last_error,omitempty"`
	LastAttemptAt *time.Time                 `json:"last_attempt_at,omitempty"`
	SentAt        *time.Time                 `json:"sent_at,omitempty"`
	CreatedAt     time.Time                  `json:"created_at"`
	UpdatedAt     time.Time                  `json:"updated_at"`
}

type TelegramNotificationListResult struct {
	Items  []TelegramNotificationRecord `json:"items"`
	Total  int                          `json:"total"`
	Limit  int                          `json:"limit"`
	Offset int                          `json:"offset"`
}
