package service

import (
	"context"
	"testing"

	"github.com/postilka/postilka/internal/model"
)

func TestShouldSubmitForApproval_HonorsFlagForAnyRole(t *testing.T) {
	s := &PostService{}
	ok, err := s.shouldSubmitForApproval(context.Background(), "user", model.Post{
		Settings: model.PostSettings{ApprovalRequired: true},
	})
	if err != nil {
		t.Fatal(err)
	}
	if ok {
		t.Fatal("approval without selected people should not submit")
	}
	ok, err = s.shouldSubmitForApproval(context.Background(), "user", model.Post{
		Settings: model.PostSettings{ApprovalRequired: true, ApproverUserIDs: []string{"admin-1"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Fatal("approval_required should submit even if the author is an admin")
	}
	ok, err = s.shouldSubmitForApproval(context.Background(), "user", model.Post{})
	if err != nil {
		t.Fatal(err)
	}
	if ok {
		t.Fatal("empty settings should not submit")
	}
}
