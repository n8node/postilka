package model

import "time"

type RuntimeTuningSettings struct {
	// Zero means "use env default".
	PublishConcurrency int `json:"publish_concurrency"`
	PublishIntervalSec int `json:"publish_interval_sec"`
	DatabaseMaxConns   int `json:"database_max_conns"`
}

type StreamingSettings struct {
	ImageMaxMB             int `json:"image_max_mb"`
	VideoMaxMB             int `json:"video_max_mb"`
	ImageUploadConcurrency int `json:"image_upload_concurrency"`
	VideoUploadConcurrency int `json:"video_upload_concurrency"`
	MemoryBudgetMB         int `json:"memory_budget_mb"`
	MultipartPartMB        int `json:"multipart_part_mb"`
}

type RuntimeTuningEffective struct {
	PublishConcurrency              int  `json:"publish_concurrency"`
	PublishIntervalSec              int  `json:"publish_interval_sec"`
	DatabaseMaxConns                int  `json:"database_max_conns"`
	DatabaseMaxConnsRequiresRestart bool `json:"database_max_conns_requires_restart"`
	PoolMaxConnsCurrent             int  `json:"pool_max_conns_current"`
	EstimatedPostsPerHour           int  `json:"estimated_posts_per_hour"`
}

type RuntimeTuningRecommendations struct {
	PublishConcurrencyMin int    `json:"publish_concurrency_min"`
	PublishConcurrencyMax int    `json:"publish_concurrency_max"`
	PublishIntervalSec    int    `json:"publish_interval_sec"`
	DatabaseMaxConnsMin   int    `json:"database_max_conns_min"`
	DatabaseMaxConnsMax   int    `json:"database_max_conns_max"`
	Summary               string `json:"summary"`
	EnvHint               string `json:"env_hint"`
}

type LoadMonitorSettings struct {
	ReportEnabled bool                  `json:"report_enabled"`
	ReportHour    int                   `json:"report_hour"`
	ServerRAMGB   int                   `json:"server_ram_gb"`
	RuntimeTuning RuntimeTuningSettings `json:"runtime_tuning"`
	Streaming     StreamingSettings     `json:"streaming"`
}

type LoadSnapshot struct {
	ID                    int64     `json:"id"`
	CollectedAt           time.Time `json:"collected_at"`
	PublishBacklog        int       `json:"publish_backlog"`
	PostsDueNextHour      int       `json:"posts_due_next_hour"`
	GenJobsActive         int       `json:"gen_jobs_active"`
	WorkflowRunsRunning   int       `json:"workflow_runs_running"`
	DBPoolMax             int       `json:"db_pool_max"`
	DBPoolAcquired        int       `json:"db_pool_acquired"`
	WorkerHeartbeatAgeSec *int      `json:"worker_heartbeat_age_sec,omitempty"`
}

type LoadDailyAggregate struct {
	Day               time.Time `json:"day"`
	AvgPublishBacklog float64   `json:"avg_publish_backlog"`
	MaxPublishBacklog int       `json:"max_publish_backlog"`
	AvgGenJobsActive  float64   `json:"avg_gen_jobs_active"`
	MaxGenJobsActive  int       `json:"max_gen_jobs_active"`
	AvgDBPoolUtil     float64   `json:"avg_db_pool_util"`
}

type LoadTrendLevel string

const (
	LoadTrendStable  LoadTrendLevel = "stable"
	LoadTrendWatch   LoadTrendLevel = "watch"
	LoadTrendGrowing LoadTrendLevel = "growing"
)

type LoadTrendAssessment struct {
	Level     LoadTrendLevel `json:"level"`
	Summary   string         `json:"summary"`
	RAMAdvice string         `json:"ram_advice"`
	Signals   []string       `json:"signals"`
}

type LoadMonitorDashboard struct {
	Settings           LoadMonitorSettings          `json:"settings"`
	EffectiveTuning    RuntimeTuningEffective       `json:"effective_tuning"`
	Recommendations    RuntimeTuningRecommendations `json:"recommendations"`
	Current            LoadSnapshot                 `json:"current"`
	History            []LoadDailyAggregate         `json:"history"`
	Trend              LoadTrendAssessment          `json:"trend"`
	WorkerAlive        bool                         `json:"worker_alive"`
	WorkerAgeSec       *int                         `json:"worker_age_sec,omitempty"`
	LastSnapshotAt     *time.Time                   `json:"last_snapshot_at,omitempty"`
	ScalingPlanPath    string                       `json:"scaling_plan_path"`
	PlanPauseAfterStep int                          `json:"plan_pause_after_step"`
}
