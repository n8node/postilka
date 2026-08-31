package service

import "testing"

func TestTelegramBotPollKeepsCallbackQuery(t *testing.T) {
	found := false
	for _, item := range telegramBotPollAllowedUpdates {
		if item == "callback_query" {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("shared getUpdates must keep callback_query")
	}
}

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

func TestTelegramAPIMessageID(t *testing.T) {
	if got := telegramAPIMessageID("42"); got != int64(42) {
		t.Fatalf("expected int64 42, got %#v", got)
	}
	if got := telegramAPIMessageID("abc"); got != "abc" {
		t.Fatalf("expected raw string, got %#v", got)
	}
}

func TestNextTelegramUpdateOffset(t *testing.T) {
	got := nextTelegramUpdateOffset([]adminBotUpdate{{UpdateID: 7}, {UpdateID: 9}}, 1)
	if got != 10 {
		t.Fatalf("expected 10, got %d", got)
	}
}

func TestIsTelegramGetUpdatesConflict(t *testing.T) {
	if !isTelegramGetUpdatesConflict(errString("Conflict: terminated by other getUpdates request")) {
		t.Fatal("expected conflict")
	}
	if !isTelegramGetUpdatesConflict(errString("can't use getUpdates method while webhook is active")) {
		t.Fatal("expected webhook conflict")
	}
	if isTelegramGetUpdatesConflict(errString("timeout")) {
		t.Fatal("timeout is not a getUpdates conflict")
	}
}

type errString string

func (e errString) Error() string { return string(e) }

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
