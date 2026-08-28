package service

import (
	"context"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
)

func (s *NotificationService) dispatchOutbound(ctx context.Context, in NotificationInput) {
	if s.users == nil || strings.TrimSpace(in.UserID) == "" {
		return
	}
	user, err := s.users.GetByID(ctx, in.UserID)
	if err != nil || user == nil {
		return
	}
	appURL := s.appURL(in.Href)
	if s.email != nil && strings.TrimSpace(user.Email) != "" && !notificationHasDedicatedEmail(in.Type) {
		s.email.SendNotificationNoticeBestEffort(ctx, user, in, appURL)
	}
	if s.messenger != nil {
		text := strings.TrimSpace(in.Title)
		if body := strings.TrimSpace(in.Body); body != "" {
			text = text + "\n\n" + body
		}
		s.messenger.Notify(ctx, user.ID, messengerMessage{
			Text:       text,
			ButtonText: "Открыть в Postilka",
			URL:        appURL,
		})
	}
}

func notificationHasDedicatedEmail(t model.NotificationType) bool {
	switch t {
	case model.NotifyPlanPaid, model.NotifyWalletTopup, model.NotifyYouTubeReconnect, model.NotifySupportTicket:
		return true
	default:
		return false
	}
}

func (s *NotificationService) appURL(href string) string {
	base := ""
	if s.cfg != nil {
		base = strings.TrimSuffix(s.cfg.PublicAppURLNormalized(), "/")
	}
	href = strings.TrimSpace(href)
	if href == "" {
		return base
	}
	if strings.HasPrefix(href, "http://") || strings.HasPrefix(href, "https://") {
		return href
	}
	if !strings.HasPrefix(href, "/") {
		href = "/" + href
	}
	return base + href
}

func skipUserIDs(ids []string, skip string) []string {
	skip = strings.TrimSpace(skip)
	if skip == "" || len(ids) == 0 {
		return ids
	}
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		if id == skip {
			continue
		}
		out = append(out, id)
	}
	return out
}

func approvalDueLabel(dueAt *time.Time, tz string) string {
	if dueAt == nil || dueAt.IsZero() {
		return ""
	}
	loc := time.FixedZone("MSK", 3*3600)
	if strings.TrimSpace(tz) != "" {
		if loaded, err := time.LoadLocation(tz); err == nil {
			loc = loaded
		}
	}
	return dueAt.In(loc).Format("02.01.2006 15:04")
}

func payloadString(payload map[string]any, key string) string {
	if payload == nil {
		return ""
	}
	v, ok := payload[key]
	if !ok || v == nil {
		return ""
	}
	switch t := v.(type) {
	case string:
		return t
	default:
		return ""
	}
}
