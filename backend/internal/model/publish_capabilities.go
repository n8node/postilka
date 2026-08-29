package model

import "strings"

type PublishCapabilities struct {
	Text             bool     `json:"text"`
	Photo            bool     `json:"photo"`
	Video            bool     `json:"video"`
	Feed             bool     `json:"feed,omitempty"`
	Schedule         bool     `json:"schedule,omitempty"`
	Formats          []string `json:"formats,omitempty"`
	RichText         bool     `json:"rich_text,omitempty"`
	Entities         bool     `json:"entities,omitempty"`
	TelegramRich     bool     `json:"telegram_rich_messages,omitempty"`
	InlineButtons    bool     `json:"inline_buttons,omitempty"`
	StyledButtons    bool     `json:"styled_buttons,omitempty"`
	CustomEmoji      bool     `json:"custom_emoji,omitempty"`
	FirstComment     bool     `json:"first_comment,omitempty"`
	Location         bool     `json:"location,omitempty"`
	LinkPreview      bool     `json:"link_preview,omitempty"`
	MediaAlbum       bool     `json:"media_album,omitempty"`
	MaxMedia         int      `json:"max_media,omitempty"`
	MaxTextLength    int      `json:"max_text_length,omitempty"`
	MaxButtons       int      `json:"max_buttons,omitempty"`
	// Composer* reports what the posts publication service actually delivers.
	// Legacy provider capabilities above remain provider/API discovery metadata.
	ComposerMedia        bool `json:"composer_media"`
	ComposerFirstComment bool `json:"composer_first_comment"`
	ComposerLocation     bool `json:"composer_location"`
	ComposerLinkPreview  bool `json:"composer_link_preview"`
	ComposerPin          bool `json:"composer_pin,omitempty"`
	ComposerSilent       bool `json:"composer_silent,omitempty"`
	ComposerVideoNote    bool `json:"composer_video_note,omitempty"`
}

func (p ChannelProvider) PublishCapabilities() PublishCapabilities {
	switch p {
	case ChannelProviderTelegram:
		return PublishCapabilities{
			Text: true, Photo: true, Video: true,
			Formats: []string{"message", "rich_message", "article", "short_video"},
			RichText: true, Entities: true, TelegramRich: true,
			InlineButtons: true, StyledButtons: true, CustomEmoji: true,
			LinkPreview: true, ComposerMedia: true, ComposerLinkPreview: true,
			ComposerPin: true, ComposerSilent: true, ComposerVideoNote: true,
			MediaAlbum: true, MaxMedia: 10, MaxTextLength: 4096, MaxButtons: 100,
		}
	case ChannelProviderVK:
		return PublishCapabilities{
			Text: true, Photo: true, Video: true, Formats: []string{"wall_post"},
			LinkPreview: true,
			ComposerFirstComment: true,
			ComposerLocation:     true,
			MediaAlbum: true, MaxMedia: 10, MaxTextLength: 16384,
		}
	case ChannelProviderMAX:
		return PublishCapabilities{
			Text: true, Photo: true, Video: true,
			Formats: []string{"message"},
			ComposerMedia: true,
			MediaAlbum:    true,
			InlineButtons: true,
			MaxMedia:      12,
			MaxTextLength: 4000,
			MaxButtons:    210,
		}
	case ChannelProviderRutube:
		return PublishCapabilities{
			Text:     true,
			Photo:    true,
			Video:    true,
			Feed:     true,
			Schedule: true,
			Formats:  []string{"feed", "video"},
			LinkPreview: true,
			MaxMedia: 1,
			MaxTextLength: 5000,
		}
	case ChannelProviderDzen:
		return PublishCapabilities{
			Text: true, Photo: true, Formats: []string{"brief", "article"},
			RichText: true, LinkPreview: true, MaxMedia: 1, MaxTextLength: 50000,
		}
	case ChannelProviderYouTube:
		return PublishCapabilities{
			Video:    true,
			Schedule: true,
			Formats:  []string{"video", "shorts"},
			ComposerMedia: true,
			MaxMedia: 1,
			MaxTextLength: 5000,
		}
	case ChannelProviderPhotochka:
		return PublishCapabilities{
			Text:          true,
			Photo:         true,
			Video:         true,
			Formats:       []string{"message"},
			ComposerMedia: true,
			MediaAlbum:    true,
			MaxMedia:      10,
			MaxTextLength: 3000,
		}
	case ChannelProviderWordPress:
		return PublishCapabilities{
			Text:          true,
			Photo:         true,
			Formats:       []string{"article"},
			RichText:      true,
			ComposerMedia: true,
			MediaAlbum:    true,
			MaxMedia:      10,
			MaxTextLength: 50000,
		}
	default:
		return PublishCapabilities{}
	}
}

func (p SocialProvider) PublishCapabilities() PublishCapabilities {
	return ChannelProvider(p).PublishCapabilities()
}

func PublishCapabilitiesForChannel(ch Channel) PublishCapabilities {
	if ch.Provider == ChannelProviderTelegram && ch.ChatType == TelegramChatTypeBusiness {
		return PublishCapabilities{
			Text: true, Photo: true, Video: true,
			Formats:          []string{"story"},
			ComposerMedia:    true,
			MediaAlbum:       false,
			MaxMedia:         1,
			MaxTextLength:    2048,
		}
	}
	caps := ch.Provider.PublishCapabilities()
	if ch.Provider == ChannelProviderTelegram {
		caps.ComposerLocation = true
		if ch.ChatType == "channel" && strings.TrimSpace(ch.Metadata.LinkedChatID) != "" {
			caps.ComposerFirstComment = true
		}
	}
	return caps
}
