package service

import "testing"

func TestValidateTelegramUploadMedia(t *testing.T) {
	tests := []struct {
		name        string
		mediaType   string
		contentType string
		size        int
		wantErr     bool
	}{
		{name: "image within limit", mediaType: TelegramMediaPhoto, contentType: "image/jpeg", size: 10 << 20},
		{name: "image too large", mediaType: TelegramMediaPhoto, contentType: "image/jpeg", size: (10 << 20) + 1, wantErr: true},
		{name: "video within limit", mediaType: TelegramMediaVideo, contentType: "video/mp4", size: 50 << 20},
		{name: "video too large", mediaType: TelegramMediaVideo, contentType: "video/mp4", size: (50 << 20) + 1, wantErr: true},
		{name: "mismatched content type", mediaType: TelegramMediaPhoto, contentType: "video/mp4", size: 10, wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateTelegramUploadMedia(TelegramMediaInput{
				Type: tt.mediaType, ContentType: tt.contentType, Data: make([]byte, tt.size),
			})
			if (err != nil) != tt.wantErr {
				t.Fatalf("validateTelegramUploadMedia() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

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
