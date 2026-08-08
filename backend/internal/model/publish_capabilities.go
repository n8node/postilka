package model

type PublishCapabilities struct {
	Text     bool     `json:"text"`
	Photo    bool     `json:"photo"`
	Video    bool     `json:"video"`
	Feed     bool     `json:"feed,omitempty"`
	Schedule bool     `json:"schedule,omitempty"`
	Formats  []string `json:"formats,omitempty"`
}

func (p ChannelProvider) PublishCapabilities() PublishCapabilities {
	switch p {
	case ChannelProviderTelegram:
		return PublishCapabilities{Text: true, Formats: []string{"message"}}
	case ChannelProviderVK:
		return PublishCapabilities{Text: true, Photo: true, Video: true, Formats: []string{"wall_post"}}
	case ChannelProviderMAX:
		return PublishCapabilities{Text: true, Formats: []string{"message"}}
	case ChannelProviderRutube:
		return PublishCapabilities{
			Text:     true,
			Photo:    true,
			Video:    true,
			Feed:     true,
			Schedule: true,
			Formats:  []string{"feed", "video"},
		}
	case ChannelProviderDzen:
		return PublishCapabilities{Text: true, Photo: true, Formats: []string{"brief", "article"}}
	case ChannelProviderYouTube:
		return PublishCapabilities{
			Video:    true,
			Schedule: true,
			Formats:  []string{"video"},
		}
	default:
		return PublishCapabilities{}
	}
}

func (p SocialProvider) PublishCapabilities() PublishCapabilities {
	return ChannelProvider(p).PublishCapabilities()
}
