package service

import (
	"strings"
	"testing"
)

func TestGenerationWorkerOwner(t *testing.T) {
	owner := generationWorkerOwner()
	if strings.TrimSpace(owner) == "" {
		t.Fatal("worker owner is empty")
	}
	if !strings.Contains(owner, "-") {
		t.Fatalf("worker owner %q does not include process separator", owner)
	}
}
