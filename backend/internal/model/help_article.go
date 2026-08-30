package model

import "time"

const (
	HelpRouteDashboard     = "dashboard"
	HelpRouteChannels      = "channels"
	HelpRoutePosts         = "posts"
	HelpRouteCalendar      = "calendar"
	HelpRouteFiles         = "files"
	HelpRouteWorkflows     = "workflows"
	HelpRouteAI            = "ai"
	HelpRoutePlans         = "plans"
	HelpRouteTeam          = "team"
	HelpRouteAnalytics     = "analytics"
	HelpRouteSettings      = "settings"
	HelpRouteNotifications = "notifications"
	HelpRouteSupport       = "support"
	HelpRouteInvites       = "invites"
)

var HelpRouteKeys = []string{
	HelpRouteDashboard,
	HelpRouteChannels,
	HelpRoutePosts,
	HelpRouteCalendar,
	HelpRouteFiles,
	HelpRouteWorkflows,
	HelpRouteAI,
	HelpRoutePlans,
	HelpRouteTeam,
	HelpRouteAnalytics,
	HelpRouteSettings,
	HelpRouteNotifications,
	HelpRouteSupport,
	HelpRouteInvites,
}

type HelpArticle struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	RouteKey    string    `json:"route_key"`
	BodyHTML    string    `json:"body_html"`
	Excerpt     string    `json:"excerpt"`
	IsPublished bool      `json:"is_published"`
	SortOrder   int       `json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type HelpArticleSummary struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	RouteKey    string    `json:"route_key"`
	Excerpt     string    `json:"excerpt"`
	IsPublished bool      `json:"is_published"`
	SortOrder   int       `json:"sort_order"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type HelpImage struct {
	ID          string `json:"id"`
	StorageKey  string `json:"-"`
	ContentType string `json:"content_type"`
}

func HelpArticleToSummary(a HelpArticle) HelpArticleSummary {
	return HelpArticleSummary{
		ID:          a.ID,
		Title:       a.Title,
		RouteKey:    a.RouteKey,
		Excerpt:     a.Excerpt,
		IsPublished: a.IsPublished,
		SortOrder:   a.SortOrder,
		UpdatedAt:   a.UpdatedAt,
	}
}
