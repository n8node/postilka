package model

import "time"

type LoadMonitorSettings struct {
	ReportEnabled bool `json:"report_enabled"`
	ReportHour    int  `json:"report_hour"`
	ServerRAMGB   int  `json:"server_ram_gb"`
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
	Day              time.Time `json:"day"`
	AvgPublishBacklog float64  `json:"avg_publish_backlog"`
	MaxPublishBacklog int      `json:"max_publish_backlog"`
	AvgGenJobsActive  float64  `json:"avg_gen_jobs_active"`
	MaxGenJobsActive  int      `json:"max_gen_jobs_active"`
	AvgDBPoolUtil     float64  `json:"avg_db_pool_util"`
}

type LoadTrendLevel string

const (
	LoadTrendStable  LoadTrendLevel = "stable"
	LoadTrendWatch   LoadTrendLevel = "watch"
	LoadTrendGrowing LoadTrendLevel = "growing"
)

type LoadTrendAssessment struct {
	Level       LoadTrendLevel `json:"level"`
	Summary     string         `json:"summary"`
	RAMAdvice   string         `json:"ram_advice"`
	Signals     []string       `json:"signals"`
}

type LoadMonitorDashboard struct {
	Settings         LoadMonitorSettings   `json:"settings"`
	Current          LoadSnapshot          `json:"current"`
	History          []LoadDailyAggregate  `json:"history"`
	Trend            LoadTrendAssessment   `json:"trend"`
	WorkerAlive      bool                  `json:"worker_alive"`
	WorkerAgeSec     *int                  `json:"worker_age_sec,omitempty"`
	LastSnapshotAt   *time.Time            `json:"last_snapshot_at,omitempty"`
	ScalingPlanPath  string                `json:"scaling_plan_path"`
	PlanPauseAfterStep int                 `json:"plan_pause_after_step"`
}
