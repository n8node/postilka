package service

import (
	"testing"
	"time"

	"github.com/postilka/postilka/internal/model"
)

func TestCalcProrateCreditMidPeriod(t *testing.T) {
	start := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC)
	now := time.Date(2026, 3, 16, 0, 0, 0, 0, time.UTC)
	credit := CalcProrateCredit(now, start, end, 100000)
	if credit < 48000 || credit > 52000 {
		t.Fatalf("expected ~half credit, got %d", credit)
	}
}

func TestCalcProrateCreditExpired(t *testing.T) {
	start := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC)
	now := time.Date(2026, 4, 2, 0, 0, 0, 0, time.UTC)
	if CalcProrateCredit(now, start, end, 100000) != 0 {
		t.Fatal("expected zero credit after period end")
	}
}

func TestPeriodEndFromStart(t *testing.T) {
	start := time.Date(2026, 1, 15, 12, 0, 0, 0, time.UTC)
	monthly := PeriodEndFromStart(start, model.BillingPeriodMonthly)
	if !monthly.Equal(time.Date(2026, 2, 15, 12, 0, 0, 0, time.UTC)) {
		t.Fatalf("monthly end: %v", monthly)
	}
	yearly := PeriodEndFromStart(start, model.BillingPeriodYearly)
	if !yearly.Equal(time.Date(2027, 1, 15, 12, 0, 0, 0, time.UTC)) {
		t.Fatalf("yearly end: %v", yearly)
	}
}
