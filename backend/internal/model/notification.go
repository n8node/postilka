package model

import "time"

type NotificationCategory string

const (
	NotificationInfo    NotificationCategory = "info"
	NotificationWarning NotificationCategory = "warning"
	NotificationSuccess NotificationCategory = "success"
	NotificationError   NotificationCategory = "error"
)

type NotificationType string

const (
	NotifyPostPublished     NotificationType = "post_published"
	NotifyPostFailed        NotificationType = "post_failed"
	NotifyPostPartial       NotificationType = "post_partial"
	NotifyPostQuotaBlocked  NotificationType = "post_quota_blocked"
	NotifyChannelReconnect  NotificationType = "channel_reconnect"
	NotifyYouTubeReconnect  NotificationType = "youtube_reconnect"
	NotifyPlanPaid          NotificationType = "plan_paid"
	NotifyWalletTopup       NotificationType = "wallet_topup"
	NotifyWalletAdminGrant  NotificationType = "wallet_admin_grant"
	NotifyPlanExpiry7d      NotificationType = "plan_expiry_7d"
	NotifyPlanExpiry3d      NotificationType = "plan_expiry_3d"
	NotifyPlanPastDue       NotificationType = "plan_past_due"
	NotifyPlanRenewed       NotificationType = "plan_renewed"
	NotifyPlanDowngraded    NotificationType = "plan_downgraded"
	NotifyWalletLow         NotificationType = "wallet_low"
	NotifyQuotaPosts80      NotificationType = "quota_posts_80"
	NotifyQuotaAIText80     NotificationType = "quota_ai_text_80"
	NotifyQuotaAIMedia80    NotificationType = "quota_ai_media_80"
	NotifyQuotaStorage90    NotificationType = "quota_storage_90"
	NotifyQuotaChannels80   NotificationType = "quota_channels_80"
	NotifyAIImageDone       NotificationType = "ai_image_done"
	NotifyAIVideoDone       NotificationType = "ai_video_done"
	NotifyAIImageFailed     NotificationType = "ai_image_failed"
	NotifyAIVideoFailed     NotificationType = "ai_video_failed"
	NotifyTrashExpiring     NotificationType = "trash_expiring"
	NotifyTrashPurged       NotificationType = "trash_purged"
	NotifyInviteAccepted    NotificationType = "invite_accepted"
	NotifyApprovalSubmitted NotificationType = "approval_submitted"
	NotifyApprovalApproved  NotificationType = "approval_approved"
	NotifyApprovalRejected  NotificationType = "approval_rejected"
	NotifyApprovalComment   NotificationType = "approval_comment"
)

type NotificationPrefKey string

const (
	NotifyPrefPosts    NotificationPrefKey = "posts"
	NotifyPrefChannels NotificationPrefKey = "channels"
	NotifyPrefBilling  NotificationPrefKey = "billing"
	NotifyPrefQuota    NotificationPrefKey = "quota"
	NotifyPrefAI       NotificationPrefKey = "ai"
	NotifyPrefFiles    NotificationPrefKey = "files"
	NotifyPrefTeam     NotificationPrefKey = "team"
)

type Notification struct {
	ID          string               `json:"id"`
	UserID      string               `json:"user_id"`
	WorkspaceID *string              `json:"workspace_id,omitempty"`
	Type        NotificationType     `json:"type"`
	Category    NotificationCategory `json:"category"`
	Title       string               `json:"title"`
	Body        string               `json:"body,omitempty"`
	Payload     map[string]any       `json:"payload,omitempty"`
	Href        string               `json:"href,omitempty"`
	ReadAt      *time.Time           `json:"read_at,omitempty"`
	CreatedAt   time.Time            `json:"created_at"`
}

type NotificationList struct {
	Items       []Notification `json:"items"`
	Total       int            `json:"total"`
	UnreadCount int            `json:"unread_count"`
}

type NotificationPreferences struct {
	Posts    bool `json:"posts"`
	Channels bool `json:"channels"`
	Billing  bool `json:"billing"`
	Quota    bool `json:"quota"`
	AI       bool `json:"ai"`
	Files    bool `json:"files"`
	Team     bool `json:"team"`
}

func DefaultNotificationPreferences() NotificationPreferences {
	return NotificationPreferences{
		Posts:    true,
		Channels: true,
		Billing:  true,
		Quota:    true,
		AI:       true,
		Files:    true,
		Team:     true,
	}
}

func (p NotificationPreferences) Enabled(key NotificationPrefKey) bool {
	switch key {
	case NotifyPrefPosts:
		return p.Posts
	case NotifyPrefChannels:
		return p.Channels
	case NotifyPrefBilling:
		return p.Billing
	case NotifyPrefQuota:
		return p.Quota
	case NotifyPrefAI:
		return p.AI
	case NotifyPrefFiles:
		return p.Files
	case NotifyPrefTeam:
		return p.Team
	default:
		return true
	}
}

func NotificationPrefKeyForType(t NotificationType) NotificationPrefKey {
	switch t {
	case NotifyPostPublished, NotifyPostFailed, NotifyPostPartial, NotifyPostQuotaBlocked:
		return NotifyPrefPosts
	case NotifyChannelReconnect, NotifyYouTubeReconnect:
		return NotifyPrefChannels
	case NotifyPlanPaid, NotifyWalletTopup, NotifyWalletAdminGrant,
		NotifyPlanExpiry7d, NotifyPlanExpiry3d, NotifyPlanPastDue,
		NotifyPlanRenewed, NotifyPlanDowngraded, NotifyWalletLow:
		return NotifyPrefBilling
	case NotifyQuotaPosts80, NotifyQuotaAIText80, NotifyQuotaAIMedia80,
		NotifyQuotaStorage90, NotifyQuotaChannels80:
		return NotifyPrefQuota
	case NotifyAIImageDone, NotifyAIVideoDone, NotifyAIImageFailed, NotifyAIVideoFailed:
		return NotifyPrefAI
	case NotifyTrashExpiring, NotifyTrashPurged:
		return NotifyPrefFiles
	case NotifyInviteAccepted, NotifyApprovalSubmitted, NotifyApprovalApproved,
		NotifyApprovalRejected, NotifyApprovalComment:
		return NotifyPrefTeam
	default:
		return NotifyPrefPosts
	}
}
