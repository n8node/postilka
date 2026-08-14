package model

import "time"

type AgentTemplateKind string

const (
	AgentTemplateKindSystem AgentTemplateKind = "system"
	AgentTemplateKindUser   AgentTemplateKind = "user"
)

type AgentTemplate struct {
	ID              string            `json:"id"`
	WorkspaceID     string            `json:"workspace_id,omitempty"`
	CreatedByUserID string            `json:"created_by_user_id,omitempty"`
	Kind            AgentTemplateKind `json:"kind"`
	Slug            string            `json:"slug"`
	Name            string            `json:"name"`
	Description     string            `json:"description"`
	Prompt          string            `json:"prompt"`
	Tools           []string          `json:"tools"`
	Settings        AgentTemplateSettings `json:"settings"`
	RequireApproval bool              `json:"require_approval"`
	IsActive        bool              `json:"is_active"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
}

type AgentTemplateSettings struct {
	DefaultMetric    string   `json:"default_metric,omitempty"`
	DefaultFrequency string   `json:"default_frequency,omitempty"`
	ChannelIDs       []string `json:"channel_ids,omitempty"`
}

type AgentTemplateSaveRequest struct {
	Name            string                `json:"name"`
	Description     string                `json:"description"`
	Prompt          string                `json:"prompt"`
	Slug            string                `json:"slug,omitempty"`
	Tools           []string              `json:"tools,omitempty"`
	Settings        AgentTemplateSettings `json:"settings"`
	RequireApproval *bool                 `json:"require_approval,omitempty"`
	IsActive        *bool                 `json:"is_active,omitempty"`
}

type MissionStatus string

const (
	MissionStatusDraft            MissionStatus = "draft"
	MissionStatusClarifying       MissionStatus = "clarifying"
	MissionStatusPlanning         MissionStatus = "planning"
	MissionStatusPendingApproval  MissionStatus = "pending_approval"
	MissionStatusRunning          MissionStatus = "running"
	MissionStatusCompleted        MissionStatus = "completed"
	MissionStatusCanceled         MissionStatus = "canceled"
)

type MissionMetric string

const (
	MissionMetricClicks      MissionMetric = "clicks"
	MissionMetricLikes       MissionMetric = "likes"
	MissionMetricReach       MissionMetric = "reach"
	MissionMetricSubscribers MissionMetric = "subscribers"
	MissionMetricManual      MissionMetric = "manual"
)

type MissionMeasurability string

const (
	MissionMeasurabilityAutomatic MissionMeasurability = "automatic"
	MissionMeasurabilityPartial   MissionMeasurability = "partial"
	MissionMeasurabilityManual    MissionMeasurability = "manual"
)

type MissionBrief struct {
	Product      string `json:"product,omitempty"`
	Audience     string `json:"audience,omitempty"`
	Observations string `json:"observations,omitempty"`
}

type MissionPlanItemRole string

const (
	MissionPlanRoleAttention MissionPlanItemRole = "attention"
	MissionPlanRoleProblem   MissionPlanItemRole = "problem"
	MissionPlanRoleProof     MissionPlanItemRole = "proof"
	MissionPlanRoleChoice    MissionPlanItemRole = "choice"
	MissionPlanRoleObjection MissionPlanItemRole = "objection"
	MissionPlanRoleAction    MissionPlanItemRole = "action"
)

type MissionPlanButton struct {
	Text string `json:"text"`
	URL  string `json:"url"`
}

type MissionPlanItem struct {
	Role        MissionPlanItemRole `json:"role"`
	DueAt       *time.Time          `json:"due_at,omitempty"`
	ChannelIDs  []string            `json:"channel_ids,omitempty"`
	Text        string              `json:"text"`
	Title       string              `json:"title,omitempty"`
	Format      string              `json:"format,omitempty"`
	FileIDs     []string            `json:"file_ids,omitempty"`
	MediaKind   string              `json:"media_kind,omitempty"`
	ImagePrompt string              `json:"image_prompt,omitempty"`
	VideoPrompt string              `json:"video_prompt,omitempty"`
	Buttons     []MissionPlanButton `json:"buttons,omitempty"`
	PostID      string              `json:"post_id,omitempty"`
}

type MissionPlan struct {
	Items           []MissionPlanItem `json:"items,omitempty"`
	ApprovedAt      *time.Time        `json:"approved_at,omitempty"`
	ManuallyChanged bool              `json:"manually_changed,omitempty"`
}

type MissionResult struct {
	Summary string `json:"summary,omitempty"`
	Notes   string `json:"notes,omitempty"`
}

type Mission struct {
	ID               string               `json:"id"`
	WorkspaceID      string               `json:"workspace_id"`
	AgentTemplateID  string               `json:"agent_template_id,omitempty"`
	CreatedByUserID  string               `json:"created_by_user_id,omitempty"`
	Title            string               `json:"title"`
	Goal             string               `json:"goal"`
	Metric           MissionMetric        `json:"metric"`
	MetricTarget     *int                 `json:"metric_target,omitempty"`
	Status           MissionStatus        `json:"status"`
	ChannelIDs       []string             `json:"channel_ids"`
	StartsAt         *time.Time           `json:"starts_at,omitempty"`
	EndsAt           *time.Time           `json:"ends_at,omitempty"`
	Frequency        string               `json:"frequency"`
	Constraints      map[string]any       `json:"constraints"`
	Brief            MissionBrief         `json:"brief"`
	Plan             MissionPlan          `json:"plan"`
	Measurability    MissionMeasurability `json:"measurability"`
	Result           MissionResult        `json:"result"`
	TemplateName     string               `json:"template_name,omitempty"`
	PostCount        int                  `json:"post_count,omitempty"`
	CreatedAt        time.Time            `json:"created_at"`
	UpdatedAt        time.Time            `json:"updated_at"`
}

type MissionCreateRequest struct {
	AgentTemplateID string        `json:"agent_template_id"`
	Title           string        `json:"title"`
	Goal            string        `json:"goal"`
	Metric          MissionMetric `json:"metric"`
	MetricTarget    *int          `json:"metric_target,omitempty"`
	ChannelIDs      []string      `json:"channel_ids"`
	StartsAt        *time.Time    `json:"starts_at,omitempty"`
	EndsAt          *time.Time    `json:"ends_at,omitempty"`
	Frequency       string        `json:"frequency"`
	Brief           MissionBrief  `json:"brief"`
}

type MissionUpdateRequest struct {
	Title        *string        `json:"title,omitempty"`
	Goal         *string        `json:"goal,omitempty"`
	Metric       *MissionMetric `json:"metric,omitempty"`
	MetricTarget *int           `json:"metric_target,omitempty"`
	ChannelIDs   []string       `json:"channel_ids,omitempty"`
	StartsAt     *time.Time     `json:"starts_at,omitempty"`
	EndsAt       *time.Time     `json:"ends_at,omitempty"`
	Frequency    *string        `json:"frequency,omitempty"`
	Brief        *MissionBrief  `json:"brief,omitempty"`
	ClearStart   bool           `json:"clear_start,omitempty"`
	ClearEnd     bool           `json:"clear_end,omitempty"`
}

type MissionPlanUpdateRequest struct {
	Items []MissionPlanItem `json:"items"`
}

type MissionMessage struct {
	ID          string    `json:"id"`
	WorkspaceID string    `json:"workspace_id"`
	MissionID   string    `json:"mission_id"`
	Role        string    `json:"role"`
	Content     string    `json:"content"`
	CreatedAt   time.Time `json:"created_at"`
}

type MissionChatRequest struct {
	Message string `json:"message"`
}

type MissionChatResponse struct {
	Mission  *Mission          `json:"mission"`
	Messages []MissionMessage  `json:"messages,omitempty"`
	Reply    *MissionMessage   `json:"reply"`
}

type MissionCompleteRequest struct {
	Summary string `json:"summary"`
	Notes   string `json:"notes"`
}

type MissionDetailResponse struct {
	Mission  *Mission         `json:"mission"`
	Messages []MissionMessage `json:"messages"`
	Posts    []Post           `json:"posts"`
}

type MissionDraftsResponse struct {
	Mission *Mission `json:"mission"`
	Posts   []Post   `json:"posts"`
}
