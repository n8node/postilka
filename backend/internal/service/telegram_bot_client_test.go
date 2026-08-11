package service

import "testing"

func TestTelegramVideoNoteFilename(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"", "video.mp4"},
		{"clip", "clip.mp4"},
		{"circle.MP4", "circle.MP4"},
	}
	for _, tt := range tests {
		if got := telegramVideoNoteFilename(tt.in); got != tt.want {
			t.Fatalf("telegramVideoNoteFilename(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

func TestCanPostInChat(t *testing.T) {
	tests := []struct {
		name     string
		chatType string
		member   telegramChatMember
		want     bool
	}{
		{
			name:     "channel admin with post",
			chatType: "channel",
			member:   telegramChatMember{Status: "administrator", CanPostMessages: true},
			want:     true,
		},
		{
			name:     "channel admin without post",
			chatType: "channel",
			member:   telegramChatMember{Status: "administrator", CanPostMessages: false},
			want:     false,
		},
		{
			name:     "supergroup administrator default",
			chatType: "supergroup",
			member:   telegramChatMember{Status: "administrator"},
			want:     true,
		},
		{
			name:     "supergroup administrator anonymous",
			chatType: "supergroup",
			member:   telegramChatMember{Status: "administrator", IsAnonymous: true},
			want:     false,
		},
		{
			name:     "supergroup creator",
			chatType: "supergroup",
			member:   telegramChatMember{Status: "creator"},
			want:     true,
		},
		{
			name:     "group administrator",
			chatType: "group",
			member:   telegramChatMember{Status: "administrator"},
			want:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := canPostInChat(tt.chatType, tt.member); got != tt.want {
				t.Fatalf("canPostInChat() = %v, want %v", got, tt.want)
			}
		})
	}
}
