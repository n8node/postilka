package model

import (
	"encoding/json"
	"time"
)

type WorkflowTriggerType string

const (
	WorkflowTriggerManual   WorkflowTriggerType = "manual"
	WorkflowTriggerSchedule WorkflowTriggerType = "schedule"
	WorkflowTriggerWebhook  WorkflowTriggerType = "webhook"
	WorkflowTriggerRSS      WorkflowTriggerType = "rss"
)

type WorkflowRunStatus string

const (
	WorkflowRunStatusPending          WorkflowRunStatus = "pending"
	WorkflowRunStatusRunning          WorkflowRunStatus = "running"
	WorkflowRunStatusCompleted        WorkflowRunStatus = "completed"
	WorkflowRunStatusFailed           WorkflowRunStatus = "failed"
	WorkflowRunStatusCancelled        WorkflowRunStatus = "cancelled"
	WorkflowRunStatusAwaitingApproval WorkflowRunStatus = "awaiting_approval"
)

type WorkflowStepStatus string

const (
	WorkflowStepStatusPending   WorkflowStepStatus = "pending"
	WorkflowStepStatusRunning   WorkflowStepStatus = "running"
	WorkflowStepStatusCompleted WorkflowStepStatus = "completed"
	WorkflowStepStatusFailed    WorkflowStepStatus = "failed"
	WorkflowStepStatusSkipped   WorkflowStepStatus = "skipped"
)

type NodePosition struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type WorkflowNode struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"`
	Position NodePosition           `json:"position"`
	Data     map[string]interface{} `json:"data"`
}

type WorkflowEdge struct {
	ID           string `json:"id"`
	Source       string `json:"source"`
	Target       string `json:"target"`
	SourceHandle string `json:"sourceHandle,omitempty"`
	TargetHandle string `json:"targetHandle,omitempty"`
}

type WorkflowGraph struct {
	Nodes []WorkflowNode `json:"nodes"`
	Edges []WorkflowEdge `json:"edges"`
}

type Workflow struct {
	ID           string              `json:"id"`
	WorkspaceID  string              `json:"workspace_id"`
	CreatedBy    *string             `json:"created_by,omitempty"`
	Name         string              `json:"name"`
	Description  string              `json:"description"`
	IsActive     bool                `json:"is_active"`
	TriggerType  WorkflowTriggerType `json:"trigger_type"`
	ScheduleCron             string              `json:"schedule_cron"`
	ScheduleTZ               string              `json:"schedule_tz"`
	WebhookSecret            string              `json:"-"`
	RSSFeedURL               string              `json:"rss_feed_url"`
	RSSPollIntervalMinutes   int                 `json:"rss_poll_interval_minutes"`
	NextRunAt                *time.Time          `json:"next_run_at,omitempty"`
	Graph        WorkflowGraph       `json:"graph"`
	CreatedAt    time.Time           `json:"created_at"`
	UpdatedAt    time.Time           `json:"updated_at"`

	// Enriched fields
	LastRun *WorkflowRun `json:"last_run,omitempty"`
}

type WorkflowTemplate struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Category    string        `json:"category"`
	Icon        string        `json:"icon"`
	IsSystem    bool          `json:"is_system"`
	IsActive    bool          `json:"is_active"`
	Graph       WorkflowGraph `json:"graph"`
	SortOrder   int           `json:"sort_order"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

type WorkflowRun struct {
	ID            string                 `json:"id"`
	WorkflowID    string                 `json:"workflow_id"`
	WorkspaceID   string                 `json:"workspace_id"`
	TriggeredBy   *string                `json:"triggered_by,omitempty"`
	TriggerSource string                 `json:"trigger_source"`
	Status        WorkflowRunStatus      `json:"status"`
	ErrorMessage  string                 `json:"error_message,omitempty"`
	ContextData   map[string]interface{} `json:"context_data"`
	TokensUsed    int                    `json:"tokens_used"`
	CreditsUsed   int                    `json:"credits_used"`
	KopecksSpent  int                    `json:"kopecks_spent"`
	StartedAt     *time.Time             `json:"started_at,omitempty"`
	FinishedAt    *time.Time             `json:"finished_at,omitempty"`
	CreatedAt     time.Time              `json:"created_at"`

	// Populated when fetching run details
	Steps []WorkflowRunStep `json:"steps,omitempty"`
}

type WorkflowRunStep struct {
	ID           string                 `json:"id"`
	RunID        string                 `json:"run_id"`
	NodeID       string                 `json:"node_id"`
	NodeType     string                 `json:"node_type"`
	NodeTitle    string                 `json:"node_title"`
	Status       WorkflowStepStatus     `json:"status"`
	Inputs       map[string]interface{} `json:"inputs"`
	Outputs      map[string]interface{} `json:"outputs"`
	ErrorMessage string                 `json:"error_message,omitempty"`
	StartedAt    *time.Time             `json:"started_at,omitempty"`
	FinishedAt   *time.Time             `json:"finished_at,omitempty"`
	DurationMS   int                    `json:"duration_ms"`
}

// Request and Response payloads

type CreateWorkflowRequest struct {
	Name         string              `json:"name"`
	Description  string              `json:"description"`
	TriggerType              WorkflowTriggerType `json:"trigger_type"`
	ScheduleCron             string              `json:"schedule_cron"`
	ScheduleTZ               string              `json:"schedule_tz"`
	RSSFeedURL               string              `json:"rss_feed_url"`
	RSSPollIntervalMinutes   int                 `json:"rss_poll_interval_minutes"`
	Graph                    *WorkflowGraph      `json:"graph,omitempty"`
}

type UpdateWorkflowRequest struct {
	Name         *string              `json:"name,omitempty"`
	Description  *string              `json:"description,omitempty"`
	IsActive     *bool                `json:"is_active,omitempty"`
	TriggerType  *WorkflowTriggerType `json:"trigger_type,omitempty"`
	ScheduleCron           *string              `json:"schedule_cron,omitempty"`
	ScheduleTZ             *string              `json:"schedule_tz,omitempty"`
	RSSFeedURL             *string              `json:"rss_feed_url,omitempty"`
	RSSPollIntervalMinutes *int                 `json:"rss_poll_interval_minutes,omitempty"`
	Graph                  *WorkflowGraph       `json:"graph,omitempty"`
}

type RunWorkflowRequest struct {
	Inputs map[string]interface{} `json:"inputs,omitempty"`
}

type TestNodeRequest struct {
	Node   WorkflowNode           `json:"node"`
	Inputs map[string]interface{} `json:"inputs,omitempty"`
}

type WorkflowWebhookInfoResponse struct {
	WebhookURL       string `json:"webhook_url"`
	WebhookSecretSet bool   `json:"webhook_secret_set"`
}

type WorkflowWebhookTestStatusResponse struct {
	Listening  bool                   `json:"listening"`
	ExpiresAt  *time.Time             `json:"expires_at,omitempty"`
	Received   map[string]interface{} `json:"received,omitempty"`
	ReceivedAt *time.Time             `json:"received_at,omitempty"`
	Error      string                 `json:"error,omitempty"`
}

type SaveTemplateRequest struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Category    string         `json:"category"`
	Icon        string         `json:"icon"`
	IsActive    *bool          `json:"is_active,omitempty"`
	SortOrder   *int           `json:"sort_order,omitempty"`
	Graph       *WorkflowGraph `json:"graph,omitempty"`
}

type WorkflowStatsResponse struct {
	TotalWorkflows  int `json:"total_workflows"`
	ActiveWorkflows int `json:"active_workflows"`
	TotalRuns       int `json:"total_runs"`
	SuccessfulRuns  int `json:"successful_runs"`
	FailedRuns      int `json:"failed_runs"`
}

func (g *WorkflowGraph) UnmarshalJSON(data []byte) error {
	type Alias WorkflowGraph
	aux := &struct {
		*Alias
	}{
		Alias: (*Alias)(g),
	}
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	if g.Nodes == nil {
		g.Nodes = make([]WorkflowNode, 0)
	}
	if g.Edges == nil {
		g.Edges = make([]WorkflowEdge, 0)
	}
	return nil
}
