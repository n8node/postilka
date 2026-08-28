package model

import "testing"

func TestNormalizeUserIDs(t *testing.T) {
	got := NormalizeUserIDs([]string{" ", "a", "a", "b", ""})
	if len(got) != 2 || got[0] != "a" || got[1] != "b" {
		t.Fatalf("got %#v", got)
	}
}

func TestPostSettingsHasApprover(t *testing.T) {
	s := PostSettings{ApproverUserIDs: []string{"u1", " u2 "}}
	if !s.HasApprover("u2") {
		t.Fatal("expected u2")
	}
	if s.HasApprover("u3") {
		t.Fatal("unexpected u3")
	}
}
