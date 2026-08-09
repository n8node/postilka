package model

type AdminAnalyticsDailyCount struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

type AdminAnalyticsDailyAI struct {
	Date         string `json:"date"`
	Total        int    `json:"total"`
	Succeeded    int    `json:"succeeded"`
	Failed       int    `json:"failed"`
	Credits      int    `json:"credits"`
	QuotaCredits int    `json:"quota_credits"`
	WalletCents  int    `json:"wallet_cents"`
}

type AdminAnalyticsDailyMoney struct {
	Date        string `json:"date"`
	AmountCents int    `json:"amount_cents"`
	Count       int    `json:"count"`
}

type AdminAnalyticsBreakdown struct {
	Label string `json:"label"`
	Count int    `json:"count"`
}

type AdminAnalyticsBreakdownBytes struct {
	Label string `json:"label"`
	Bytes int64  `json:"bytes"`
	Count int    `json:"count"`
}

type AdminAnalyticsOverview struct {
	UsersTotal       int   `json:"users_total"`
	UsersNew         int   `json:"users_new_in_period"`
	WorkspacesTotal  int   `json:"workspaces_total"`
	ChannelsTotal    int   `json:"channels_total"`
	ChannelsActive   int   `json:"channels_active"`
	FilesTotal       int   `json:"files_total"`
	StorageBytes     int64 `json:"storage_bytes"`
	TrashBytes       int64 `json:"trash_bytes"`

	AIGenerationsTotal     int `json:"ai_generations_total"`
	AIGenerationsSucceeded int `json:"ai_generations_succeeded"`
	AIGenerationsFailed    int `json:"ai_generations_failed"`
	AICreditsSpent         int `json:"ai_credits_spent"`
	AIWalletCentsSpent     int `json:"ai_wallet_cents_spent"`

	TopupsCents    int `json:"topups_cents"`
	CheckoutsCents int `json:"checkouts_cents"`

	DailyRegistrations []AdminAnalyticsDailyCount     `json:"daily_registrations"`
	DailyAIGenerations []AdminAnalyticsDailyAI        `json:"daily_ai_generations"`
	DailyTopups        []AdminAnalyticsDailyMoney     `json:"daily_topups"`
	DailyCheckouts     []AdminAnalyticsDailyMoney     `json:"daily_checkouts"`
	DailyNewFiles      []AdminAnalyticsDailyCount     `json:"daily_new_files"`

	AIByMode           []AdminAnalyticsBreakdown      `json:"ai_by_mode"`
	ChannelsByProvider []AdminAnalyticsBreakdown      `json:"channels_by_provider"`
	FilesByType        []AdminAnalyticsBreakdownBytes `json:"files_by_type"`
}
