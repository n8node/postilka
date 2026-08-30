package service

import "testing"

func TestIsPrivateTelegramChatID(t *testing.T) {
	if !isPrivateTelegramChatID("123456789") {
		t.Fatal("user chat should be private")
	}
	if isPrivateTelegramChatID("-1001234567890") {
		t.Fatal("supergroup should not be treated as private")
	}
	if isPrivateTelegramChatID("") {
		t.Fatal("empty chat is not private")
	}
}

func TestTakeHealthMessagesFilters(t *testing.T) {
	s := &TelegramService{}
	s.trackHealthMessage("1", "10")
	s.trackHealthMessage("1", "11")
	s.trackHealthMessage("2", "20")

	got := s.takeHealthMessages("1", "11")
	if len(got) != 1 || got[0].messageID != "11" {
		t.Fatalf("expected one matching message, got %+v", got)
	}
	rest := s.takeHealthMessages("1", "")
	if len(rest) != 1 || rest[0].messageID != "10" {
		t.Fatalf("expected remaining chat message, got %+v", rest)
	}
}
