package model

import "time"

const (
	MeasurabilityAuto    = "auto"
	MeasurabilityPartial = "partial"
	MeasurabilityManual  = "manual"
)

type PostTargetMetrics struct {
	TargetID         string     `json:"target_id"`
	PostID           string     `json:"post_id"`
	ChannelID        string     `json:"channel_id"`
	Provider         string     `json:"provider"`
	ProviderLabel    string     `json:"provider_label"`
	ChannelName      string     `json:"channel_name,omitempty"`
	Views            int        `json:"views"`
	Likes            int        `json:"likes"`
	Comments         int        `json:"comments"`
	Shares           int        `json:"shares"`
	Reach            int        `json:"reach"`
	Clicks           int        `json:"clicks"`
	ClicksUnique     int        `json:"clicks_unique"`
	MetrikaVisits    int        `json:"metrika_visits"`
	MetrikaUsers     int        `json:"metrika_users"`
	MetrikaGoals     int        `json:"metrika_goals"`
	MetrikaByCounter []MetrikaCounterStats `json:"metrika_by_counter,omitempty"`
	SubscriberCount  *int       `json:"subscriber_count,omitempty"`
	Measurability    string     `json:"measurability"`
	ProviderNote     string     `json:"provider_note,omitempty"`
	HasData          bool       `json:"has_data"`
	FirstDataAt      *time.Time `json:"first_data_at,omitempty"`
	FetchedAt        *time.Time `json:"fetched_at,omitempty"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type PostTargetMetricsSnapshot struct {
	SnapshotAt    time.Time `json:"snapshot_at"`
	Views         int       `json:"views"`
	Likes         int       `json:"likes"`
	Comments      int       `json:"comments"`
	Shares        int       `json:"shares"`
	Reach         int       `json:"reach"`
	Clicks        int       `json:"clicks"`
	MetrikaVisits int       `json:"metrika_visits"`
	MetrikaGoals  int       `json:"metrika_goals"`
}

type AnalyticsOverview struct {
	From              string `json:"from"`
	To                string `json:"to"`
	PublishedPosts    int    `json:"published_posts"`
	PostsWithData     int    `json:"posts_with_data"`
	TotalViews        int    `json:"total_views"`
	TotalReach        int    `json:"total_reach"`
	TotalEngagement   int    `json:"total_engagement"`
	TotalClicks       int    `json:"total_clicks"`
	TotalClicksUnique int    `json:"total_clicks_unique"`
	MetrikaVisits     int    `json:"metrika_visits"`
	MetrikaGoals      int    `json:"metrika_goals"`
	MetrikaConnected  bool   `json:"metrika_connected"`
}

type AnalyticsDailyPoint struct {
	Date          string `json:"date"`
	Views         int    `json:"views"`
	Clicks        int    `json:"clicks"`
	Engagement    int    `json:"engagement"`
	MetrikaVisits int    `json:"metrika_visits"`
}

type AnalyticsProviderBreakdown struct {
	Provider      string `json:"provider"`
	ProviderLabel string `json:"provider_label"`
	Posts         int    `json:"posts"`
	Views         int    `json:"views"`
	Clicks        int    `json:"clicks"`
	Engagement    int    `json:"engagement"`
}

type AnalyticsPostSummary struct {
	PostID        string     `json:"post_id"`
	Preview       string     `json:"preview"`
	PublishedAt   *time.Time `json:"published_at,omitempty"`
	HasData       bool       `json:"has_data"`
	Views         int        `json:"views"`
	Clicks        int        `json:"clicks"`
	Engagement    int        `json:"engagement"`
	ChannelsCount int        `json:"channels_count"`
}

type PostAnalyticsResponse struct {
	PostID      string                    `json:"post_id"`
	Status      string                    `json:"status"`
	Preview     string                    `json:"preview"`
	PublishedAt *time.Time                `json:"published_at,omitempty"`
	HasData     bool                      `json:"has_data"`
	Visible     bool                      `json:"visible"`
	Explanation string                    `json:"explanation,omitempty"`
	Targets     []PostTargetMetrics       `json:"targets"`
	Timeline    []PostTargetMetricsSnapshot `json:"timeline"`
	Totals      PostTargetMetrics         `json:"totals"`
}

type WorkspaceMetrikaStatus struct {
	OAuthReady bool                    `json:"oauth_ready"`
	Counters   []MetrikaCounterSummary `json:"counters"`
}

type MetrikaCounterSummary struct {
	CounterID   int64      `json:"counter_id"`
	Label       string     `json:"label,omitempty"`
	Enabled     bool       `json:"enabled"`
	ConnectedAt time.Time  `json:"connected_at"`
	Visits      int        `json:"visits,omitempty"`
	Goals       int        `json:"goals,omitempty"`
}

type MetrikaCounterStats struct {
	CounterID int64  `json:"counter_id"`
	Label     string `json:"label,omitempty"`
	Visits    int    `json:"visits"`
	Users     int    `json:"users"`
	Goals     int    `json:"goals"`
}

type MetrikaUTMBinding struct {
	PostID      string                `json:"post_id"`
	PostPreview string                `json:"post_preview"`
	TargetID    string                `json:"target_id"`
	ChannelName string                `json:"channel_name,omitempty"`
	PublishedAt *time.Time            `json:"published_at,omitempty"`
	UTMCampaign string                `json:"utm_campaign"`
	UTMSource   string                `json:"utm_source,omitempty"`
	UTMMedium   string                `json:"utm_medium,omitempty"`
	Counters    []MetrikaCounterStats `json:"counters"`
}

type WorkspaceMetrikaSettingsRequest struct {
	CounterID int64  `json:"counter_id"`
	Label     string `json:"label,omitempty"`
}
