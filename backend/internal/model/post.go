package model

import (
	"encoding/json"
	"time"
)

type PostStatus string

const (
	PostStatusDraft           PostStatus = "draft"
	PostStatusPendingApproval PostStatus = "pending_approval"
	PostStatusScheduled       PostStatus = "scheduled"
	PostStatusPublishing      PostStatus = "publishing"
	PostStatusPublished       PostStatus = "published"
	PostStatusFailed          PostStatus = "failed"
	PostStatusCanceled        PostStatus = "canceled"
)

type PostTargetStatus string

const (
	PostTargetPending    PostTargetStatus = "pending"
	PostTargetPublishing PostTargetStatus = "publishing"
	PostTargetPublished  PostTargetStatus = "published"
	PostTargetFailed     PostTargetStatus = "failed"
	PostTargetCanceled   PostTargetStatus = "canceled"
)

type TelegramMessageEntity struct {
	Type          string `json:"type"`
	Offset        int    `json:"offset"`
	Length        int    `json:"length"`
	URL           string `json:"url,omitempty"`
	Language      string `json:"language,omitempty"`
	CustomEmojiID string `json:"custom_emoji_id,omitempty"`
}

type TelegramButtonStyle string

const (
	TelegramButtonDefault TelegramButtonStyle = "default"
	TelegramButtonPrimary TelegramButtonStyle = "primary"
	TelegramButtonSuccess TelegramButtonStyle = "success"
	TelegramButtonDanger  TelegramButtonStyle = "danger"
)

type TelegramInlineButton struct {
	Text              string              `json:"text"`
	Style             TelegramButtonStyle `json:"style,omitempty"`
	IconCustomEmojiID string              `json:"icon_custom_emoji_id,omitempty"`
	URL               string              `json:"url,omitempty"`
	CallbackData      string              `json:"callback_data,omitempty"`
	CopyText          string              `json:"copy_text,omitempty"`
	WebAppURL         string              `json:"web_app_url,omitempty"`
}

type TelegramRichListItem struct {
	Blocks []TelegramRichBlock `json:"blocks"`
}

type TelegramRichTableCell struct {
	Text   string `json:"text"`
	Align  string `json:"align,omitempty"`
	VAlign string `json:"valign,omitempty"`
}

type TelegramRichBlock struct {
	Type       string                    `json:"type"`
	Text       string                    `json:"text,omitempty"`
	Entities   []TelegramMessageEntity   `json:"entities,omitempty"`
	Size       int                       `json:"size,omitempty"`
	Language   string                    `json:"language,omitempty"`
	Credit     string                    `json:"credit,omitempty"`
	Items      []TelegramRichListItem    `json:"items,omitempty"`
	Summary    string                    `json:"summary,omitempty"`
	Blocks     []TelegramRichBlock       `json:"blocks,omitempty"`
	IsOpen     bool                      `json:"is_open,omitempty"`
	Rows       [][]TelegramRichTableCell `json:"rows,omitempty"`
	Bordered   bool                      `json:"bordered,omitempty"`
	Striped    bool                      `json:"striped,omitempty"`
	Expression string                    `json:"expression,omitempty"`
}

type TelegramRichMessage struct {
	Title   string                   `json:"title,omitempty"`
	Blocks  []TelegramRichBlock      `json:"blocks"`
	Buttons [][]TelegramInlineButton `json:"buttons,omitempty"`
}

type PostContent struct {
	Format      string                  `json:"format,omitempty"`
	Text        string                  `json:"text,omitempty"`
	ParseMode   string                  `json:"parse_mode,omitempty"`
	Entities    []TelegramMessageEntity `json:"entities,omitempty"`
	Buttons     [][]TelegramInlineButton `json:"buttons,omitempty"`
	RichMessage *TelegramRichMessage    `json:"rich_message,omitempty"`
}

type PostLocation struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Name      string  `json:"name,omitempty"`
}

type PostLinkSettings struct {
	URL            string `json:"url,omitempty"`
	PreviewEnabled *bool  `json:"preview_enabled,omitempty"`
}

type PostUTMSettings struct {
	Source   string `json:"source,omitempty"`
	Medium   string `json:"medium,omitempty"`
	Campaign string `json:"campaign,omitempty"`
	Shorten  bool   `json:"shorten,omitempty"`
}

type PostRecurrenceSettings struct {
	Enabled      bool       `json:"enabled,omitempty"`
	IntervalDays int        `json:"interval_days,omitempty"`
	MaxRuns      *int       `json:"max_runs,omitempty"`
	EndsAt       *time.Time `json:"ends_at,omitempty"`
	SourcePostID string     `json:"source_post_id,omitempty"`
	RunNumber    int        `json:"run_number,omitempty"`
}

const (
	TelegramMediaLayoutSeparate = "separate"
	TelegramMediaLayoutCaption  = "caption"

	TelegramCaptionPositionAbove = "above"
	TelegramCaptionPositionBelow = "below"

	TelegramMediaOrderMediaFirst = "media_first"
	TelegramMediaOrderTextFirst  = "text_first"

	TelegramStoryPeriod6h  = 21600
	TelegramStoryPeriod12h = 43200
	TelegramStoryPeriod24h = 86400
	TelegramStoryPeriod48h = 172800
)

type TelegramStoryAreaPosition struct {
	XPercentage            float64 `json:"x_percentage"`
	YPercentage            float64 `json:"y_percentage"`
	WidthPercentage        float64 `json:"width_percentage"`
	HeightPercentage       float64 `json:"height_percentage"`
	RotationAngle          float64 `json:"rotation_angle"`
	CornerRadiusPercentage float64 `json:"corner_radius_percentage"`
}

type TelegramStoryLocationAddress struct {
	CountryCode string `json:"country_code,omitempty"`
	State       string `json:"state,omitempty"`
	City        string `json:"city,omitempty"`
	Street      string `json:"street,omitempty"`
}

type TelegramStoryArea struct {
	ID              string                        `json:"id,omitempty"`
	Kind            string                        `json:"kind"`
	Position        TelegramStoryAreaPosition     `json:"position"`
	URL             string                        `json:"url,omitempty"`
	Latitude        float64                       `json:"latitude,omitempty"`
	Longitude       float64                       `json:"longitude,omitempty"`
	Address         *TelegramStoryLocationAddress `json:"address,omitempty"`
	ReactionEmoji   string                        `json:"reaction_emoji,omitempty"`
	ReactionDark    bool                          `json:"reaction_dark,omitempty"`
	ReactionFlipped bool                          `json:"reaction_flipped,omitempty"`
	Temperature     float64                       `json:"temperature,omitempty"`
	WeatherEmoji    string                        `json:"weather_emoji,omitempty"`
	BackgroundColor int64                         `json:"background_color,omitempty"`
}

type TelegramStorySettings struct {
	ActivePeriod   int                 `json:"active_period,omitempty"`
	PostToChatPage bool                `json:"post_to_chat_page,omitempty"`
	ProtectContent bool                `json:"protect_content,omitempty"`
	Areas          []TelegramStoryArea `json:"areas,omitempty"`
}

type PostSettings struct {
	FirstComment            string                  `json:"first_comment,omitempty"`
	Location                *PostLocation           `json:"location,omitempty"`
	Link                    *PostLinkSettings       `json:"link,omitempty"`
	UTM                     *PostUTMSettings        `json:"utm,omitempty"`
	ApprovalRequired        bool                    `json:"approval_required,omitempty"`
	Recurrence              *PostRecurrenceSettings `json:"recurrence,omitempty"`
	TelegramMediaLayout     string                   `json:"telegram_media_layout,omitempty"`
	TelegramCaptionPosition string                   `json:"telegram_caption_position,omitempty"`
	TelegramMediaOrder      string                   `json:"telegram_media_order,omitempty"`
	TelegramPin             bool                     `json:"telegram_pin,omitempty"`
	TelegramSilent          bool                     `json:"telegram_silent,omitempty"`
	TelegramVideoNote       bool                     `json:"telegram_video_note,omitempty"`
	TelegramStory           *TelegramStorySettings   `json:"telegram_story,omitempty"`
	MaxButtons              [][]TelegramInlineButton `json:"max_buttons,omitempty"`
}

type PostTarget struct {
	ID             string           `json:"id"`
	ChannelID      string           `json:"channel_id"`
	Status         PostTargetStatus `json:"status"`
	Settings       json.RawMessage  `json:"settings"`
	ProviderPostID string           `json:"provider_post_id,omitempty"`
	LastError      string           `json:"last_error,omitempty"`
	Attempts       int              `json:"attempts"`
	LastAttemptAt  *time.Time       `json:"last_attempt_at,omitempty"`
	NextAttemptAt  *time.Time       `json:"next_attempt_at,omitempty"`
	PublishedAt    *time.Time       `json:"published_at,omitempty"`
}

type PostTargetSettings struct {
	Detached bool          `json:"detached,omitempty"`
	Content  *PostContent  `json:"content,omitempty"`
	Settings *PostSettings `json:"settings,omitempty"`
}

type PostMedia struct {
	ID       string          `json:"id"`
	FileID   string          `json:"file_id"`
	Position int             `json:"position"`
	Settings json.RawMessage `json:"settings"`
}

type Post struct {
	ID              string          `json:"id"`
	WorkspaceID     string          `json:"workspace_id"`
	CreatedByUserID string          `json:"created_by_user_id,omitempty"`
	Status          PostStatus      `json:"status"`
	Content         PostContent     `json:"content"`
	Settings        PostSettings    `json:"settings"`
	DueAt           *time.Time      `json:"due_at,omitempty"`
	PublishedAt     *time.Time      `json:"published_at,omitempty"`
	LastError       string          `json:"last_error,omitempty"`
	Targets         []PostTarget    `json:"targets"`
	Media           []PostMedia     `json:"media"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

type PostTargetInput struct {
	ChannelID string          `json:"channel_id"`
	Settings  json.RawMessage `json:"settings,omitempty"`
}

type PostMediaInput struct {
	FileID  string          `json:"file_id"`
	Settings json.RawMessage `json:"settings,omitempty"`
}

type PostSaveRequest struct {
	Content  PostContent      `json:"content"`
	Settings PostSettings     `json:"settings"`
	Targets  []PostTargetInput `json:"targets"`
	Media    []PostMediaInput `json:"media,omitempty"`
}

type PostScheduleRequest struct {
	DueAt time.Time `json:"due_at"`
}
