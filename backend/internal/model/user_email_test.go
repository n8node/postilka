package model

import (
	"testing"
	"time"
)

func TestIsPlaceholderLoginEmail(t *testing.T) {
	cases := []struct {
		email string
		want  bool
	}{
		{"vk_476259064@login.postilka.local", true},
		{"VK_476259064@Login.Postilka.Local", true},
		{" max_1@login.postilka.local ", true},
		{"user@postilka.ru", false},
		{"vk_476259064@login.postilka.ru", false},
		{"login.postilka.local", false},
		{"", false},
	}
	for _, tc := range cases {
		if got := IsPlaceholderLoginEmail(tc.email); got != tc.want {
			t.Fatalf("IsPlaceholderLoginEmail(%q)=%v want %v", tc.email, got, tc.want)
		}
	}
}

func TestIsDeliverableEmail(t *testing.T) {
	if !IsDeliverableEmail("hi@postilka.ru") {
		t.Fatal("real email should be deliverable")
	}
	if IsDeliverableEmail("") {
		t.Fatal("empty email is not deliverable")
	}
	if IsDeliverableEmail("vk_1@login.postilka.local") {
		t.Fatal("oauth placeholder must not be deliverable")
	}
}

func TestUserHasDeliverableEmail(t *testing.T) {
	if (*User)(nil).HasDeliverableEmail() {
		t.Fatal("nil user")
	}
	now := time.Now()
	u := &User{Email: "vk_1@login.postilka.local", EmailVerifiedAt: &now}
	if u.HasDeliverableEmail() {
		t.Fatal("placeholder user")
	}
	u.Email = "owner@example.com"
	u.EmailVerifiedAt = nil
	if u.HasDeliverableEmail() {
		t.Fatal("unverified mailbox must not receive notifications")
	}
	u.EmailVerifiedAt = &now
	if !u.HasDeliverableEmail() {
		t.Fatal("verified real mailbox")
	}
}

func TestUserNeedsEmailBind(t *testing.T) {
	u := &User{Email: "vk_1@login.postilka.local"}
	if !u.NeedsEmailBind() {
		t.Fatal("placeholder without pending email")
	}
	u.PendingEmail = "owner@example.com"
	if u.NeedsEmailBind() {
		t.Fatal("pending bind in progress")
	}
	u.Email = "owner@example.com"
	u.PendingEmail = ""
	if u.NeedsEmailBind() {
		t.Fatal("real email is already bound")
	}
}
