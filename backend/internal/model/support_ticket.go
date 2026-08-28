package model

import "time"

type TicketStatus string

const (
	TicketStatusOpen          TicketStatus = "open"
	TicketStatusAwaitingAdmin TicketStatus = "awaiting_admin"
	TicketStatusAwaitingUser  TicketStatus = "awaiting_user"
	TicketStatusInProgress    TicketStatus = "in_progress"
	TicketStatusResolved      TicketStatus = "resolved"
	TicketStatusClosed        TicketStatus = "closed"
)

type TicketPriority string

const (
	TicketPriorityLow    TicketPriority = "low"
	TicketPriorityNormal TicketPriority = "normal"
	TicketPriorityHigh   TicketPriority = "high"
	TicketPriorityUrgent TicketPriority = "urgent"
)

type TicketMessageAuthor string

const (
	TicketAuthorUser  TicketMessageAuthor = "user"
	TicketAuthorAdmin TicketMessageAuthor = "admin"
)

type SupportTicketTheme struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	Description string    `json:"description"`
	Icon        string    `json:"icon"`
	SortOrder   int       `json:"sort_order"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type SupportTicketMessage struct {
	ID         string              `json:"id"`
	TicketID   string              `json:"ticket_id"`
	AuthorID   string              `json:"author_id"`
	AuthorRole TicketMessageAuthor `json:"author_role"`
	Body       string              `json:"body"`
	CreatedAt  time.Time           `json:"created_at"`
}

type SupportTicketUserSummary struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

type SupportTicketThemeSummary struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Description string `json:"description,omitempty"`
	Icon        string `json:"icon,omitempty"`
}

type SupportTicketAttachment struct {
	ID         string    `json:"id"`
	TicketID   string    `json:"ticket_id"`
	MessageID  string    `json:"message_id"`
	Filename   string    `json:"filename"`
	MimeType   string    `json:"mime_type"`
	SizeBytes  int64     `json:"size_bytes"`
	StorageKey string    `json:"-"`
	URL        string    `json:"url"`
	CreatedAt  time.Time `json:"created_at"`
}

type SupportTicket struct {
	ID              string                     `json:"id"`
	TicketNumber    int                        `json:"ticket_number"`
	UserID          string                     `json:"user_id"`
	ThemeID         string                     `json:"theme_id"`
	Subject         *string                    `json:"subject"`
	Status          TicketStatus               `json:"status"`
	Priority        TicketPriority             `json:"priority"`
	TelegramChatID  string                     `json:"telegram_chat_id,omitempty"`
	TelegramTopicID int                        `json:"telegram_topic_id,omitempty"`
	Messages        []SupportTicketMessageView `json:"messages,omitempty"`
	Theme           *SupportTicketThemeSummary `json:"theme,omitempty"`
	User            *SupportTicketUserSummary  `json:"user,omitempty"`
	CreatedAt       time.Time                  `json:"created_at"`
	UpdatedAt       time.Time                  `json:"updated_at"`
}

type SupportTicketMessageView struct {
	ID          string                    `json:"id"`
	AuthorRole  TicketMessageAuthor       `json:"author_role"`
	AuthorName  string                    `json:"author_name,omitempty"`
	AuthorEmail string                    `json:"author_email,omitempty"`
	Body        string                    `json:"body"`
	Attachments []SupportTicketAttachment `json:"attachments,omitempty"`
	CreatedAt   time.Time                 `json:"created_at"`
}

type SupportTicketCreateRequest struct {
	ThemeID  string         `json:"theme_id"`
	Subject  *string        `json:"subject"`
	Priority TicketPriority `json:"priority"`
	Body     string         `json:"body"`
}

type SupportTicketMessageRequest struct {
	Body string `json:"body"`
}

type SupportTicketStatusUpdateRequest struct {
	Status TicketStatus `json:"status"`
}

type SupportTicketAdminReplyRequest struct {
	Body string `json:"body"`
}

type SupportTicketThemeCreateRequest struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	SortOrder   int    `json:"sort_order"`
	IsActive    *bool  `json:"is_active"`
}

type SupportTicketThemeUpdateRequest struct {
	Name        *string `json:"name"`
	Slug        *string `json:"slug"`
	Description *string `json:"description"`
	Icon        *string `json:"icon"`
	SortOrder   *int    `json:"sort_order"`
	IsActive    *bool   `json:"is_active"`
}

func IsTicketClosed(status TicketStatus) bool {
	return status == TicketStatusResolved || status == TicketStatusClosed
}

func NormalizeTicketPriority(raw string) TicketPriority {
	switch TicketPriority(raw) {
	case TicketPriorityLow, TicketPriorityHigh, TicketPriorityUrgent:
		return TicketPriority(raw)
	default:
		return TicketPriorityNormal
	}
}
