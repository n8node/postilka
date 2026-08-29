package model

import "testing"

func TestPublishCapabilitiesForChannel_VKExtras(t *testing.T) {
	caps := PublishCapabilitiesForChannel(Channel{Provider: ChannelProviderVK})
	if !caps.ComposerFirstComment || !caps.ComposerLocation {
		t.Fatalf("vk extras: comment=%v location=%v", caps.ComposerFirstComment, caps.ComposerLocation)
	}
}

func TestPublishCapabilitiesForChannel_TelegramDiscussion(t *testing.T) {
	plain := PublishCapabilitiesForChannel(Channel{
		Provider: ChannelProviderTelegram,
		ChatType: "channel",
	})
	if plain.ComposerFirstComment {
		t.Fatal("telegram channel without discussion should hide first comment")
	}
	if !plain.ComposerLocation {
		t.Fatal("telegram channel should allow post location")
	}

	withDiscussion := PublishCapabilitiesForChannel(Channel{
		Provider: ChannelProviderTelegram,
		ChatType: "channel",
		Metadata: ChannelMetadata{LinkedChatID: "-100123"},
	})
	if !withDiscussion.ComposerFirstComment {
		t.Fatal("telegram channel with linked discussion should allow first comment")
	}

	group := PublishCapabilitiesForChannel(Channel{
		Provider: ChannelProviderTelegram,
		ChatType: "supergroup",
		Metadata: ChannelMetadata{LinkedChatID: "-100999"},
	})
	if group.ComposerFirstComment {
		t.Fatal("telegram group should not treat linked_chat_id as a first-comment target")
	}

	business := PublishCapabilitiesForChannel(Channel{
		Provider: ChannelProviderTelegram,
		ChatType: TelegramChatTypeBusiness,
	})
	if business.ComposerFirstComment || business.ComposerLocation {
		t.Fatal("telegram business stories should not use post extras")
	}
}

func TestPublishCapabilitiesForChannel_MAXHidesExtras(t *testing.T) {
	caps := PublishCapabilitiesForChannel(Channel{Provider: ChannelProviderMAX})
	if caps.ComposerFirstComment || caps.ComposerLocation {
		t.Fatalf("max extras: comment=%v location=%v", caps.ComposerFirstComment, caps.ComposerLocation)
	}
}

func TestPublishCapabilitiesForChannel_WordPressArticle(t *testing.T) {
	caps := PublishCapabilitiesForChannel(Channel{Provider: ChannelProviderWordPress})
	if !caps.Text || !caps.RichText || !caps.ComposerMedia {
		t.Fatalf("wordpress caps: %+v", caps)
	}
	if len(caps.Formats) != 1 || caps.Formats[0] != "article" {
		t.Fatalf("wordpress formats: %#v", caps.Formats)
	}
}
