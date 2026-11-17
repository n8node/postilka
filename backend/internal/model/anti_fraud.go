package model

import "time"

type AntiFraudMode string

const (
	AntiFraudModeMonitoring AntiFraudMode = "monitoring"
	AntiFraudModeSoft       AntiFraudMode = "soft"
	AntiFraudModeStrict     AntiFraudMode = "strict"
)

type AntiFraudAction string

const (
	AntiFraudActionObserve      AntiFraudAction = "observe"
	AntiFraudActionChallenge    AntiFraudAction = "challenge"
	AntiFraudActionLimit        AntiFraudAction = "limit_generation"
	AntiFraudActionManualReview AntiFraudAction = "manual_review"
	AntiFraudActionBlock        AntiFraudAction = "block"
	AntiFraudActionAllowlist    AntiFraudAction = "allowlist"
)

type AntiFraudRule struct {
	Key         string          `json:"key"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Enabled     bool            `json:"enabled"`
	Weight      int             `json:"weight"`
	Threshold   int             `json:"threshold"`
	Action      AntiFraudAction `json:"action"`
}

type AntiFraudSettings struct {
	Enabled                 bool            `json:"enabled"`
	Mode                    AntiFraudMode   `json:"mode"`
	MediumThreshold         int             `json:"medium_threshold"`
	HighThreshold           int             `json:"high_threshold"`
	CriticalThreshold       int             `json:"critical_threshold"`
	DeviceAccountsThreshold int             `json:"device_accounts_threshold"`
	DeviceImageLimit        int             `json:"device_image_limit"`
	DeviceVideoLimit        int             `json:"device_video_limit"`
	RetentionDays           int             `json:"retention_days"`
	Rules                   []AntiFraudRule `json:"rules"`
}

type AntiFraudUserProfile struct {
	UserID          string     `json:"user_id"`
	Email           string     `json:"email"`
	Name            string     `json:"name"`
	IsBlocked       bool       `json:"is_blocked"`
	IsPlatformAdmin bool       `json:"is_platform_admin"`
	RiskScore       int        `json:"risk_score"`
	RiskLevel       string     `json:"risk_level"`
	RelatedAccounts int        `json:"related_accounts"`
	Signals         []string   `json:"signals"`
	Decision        string     `json:"decision"`
	DecisionReason  string     `json:"decision_reason,omitempty"`
	DecisionBy      string     `json:"decision_by,omitempty"`
	DecisionAt      *time.Time `json:"decision_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	LastActivityAt  *time.Time `json:"last_activity_at,omitempty"`
}

type AntiFraudDecision struct {
	Decision string `json:"decision"`
	Reason   string `json:"reason"`
}
