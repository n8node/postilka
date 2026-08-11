package model

import "testing"

func TestKieVideoSettings_CreditCostForVideoRequest(t *testing.T) {
	s := KieVideoSettings{
		CreditsPerSecondReferenceToVideo: 8,
		CreditsPerExtraReferenceImage:    3,
	}

	got := s.CreditCostForVideoRequest(VideoGenerationCostInput{
		Mode:                   KieVideoModeReferenceToVideo,
		OutputDurationSeconds:  15,
		InputImageCount:        7,
		InputVideoDurationSecs: []float64{5, 10.2},
	})
	if got.OutputDurationSeconds != 15 {
		t.Fatalf("output = %d", got.OutputDurationSeconds)
	}
	if got.InputVideoDurationSeconds != 16 { // ceil(5)+ceil(10.2)
		t.Fatalf("input video sec = %d, want 16", got.InputVideoDurationSeconds)
	}
	if got.BillableSeconds != 31 {
		t.Fatalf("billable = %d, want 31", got.BillableSeconds)
	}
	if got.BaseCredits != 248 { // 31 * 8
		t.Fatalf("base = %d, want 248", got.BaseCredits)
	}
	if got.ExtraImageCount != 2 {
		t.Fatalf("extra images = %d, want 2", got.ExtraImageCount)
	}
	if got.ExtraImageCredits != 6 {
		t.Fatalf("extra image credits = %d, want 6", got.ExtraImageCredits)
	}
	if got.TotalCredits != 254 {
		t.Fatalf("total = %d, want 254", got.TotalCredits)
	}
}

func TestKieVideoSettings_CreditCostForVideo(t *testing.T) {
	s := KieVideoSettings{
		CreditsPerSecondTextToVideo:      5,
		CreditsPerSecondImageToVideo:     6,
		CreditsPerSecondReferenceToVideo: 8,
		KopecksPerMediaCredit:            5000, // 50 ₽ per credit
	}

	tests := []struct {
		mode     string
		duration int
		want     int
	}{
		{"text-to-video", 10, 50},
		{"image-to-video", 10, 60},
		{"reference-to-video", 10, 80},
		{"text-to-video", 4, 20},
		{"text-to-video", 15, 75},
		{"text-to-video", 3, 20},  // clamped to 4 sec
		{"text-to-video", 20, 75}, // clamped to 15 sec
	}
	for _, tt := range tests {
		if got := s.CreditCostForVideo(tt.mode, tt.duration); got != tt.want {
			t.Fatalf("CreditCostForVideo(%q, %d) = %d, want %d", tt.mode, tt.duration, got, tt.want)
		}
	}
}

func TestKieVideoSettings_WalletCostRub(t *testing.T) {
	s := KieVideoSettings{
		CreditsPerSecondTextToVideo: 5,
		KopecksPerMediaCredit:       5000,
	}

	credits := s.CreditCostForVideo("text-to-video", 10) // 50 credits
	if credits != 50 {
		t.Fatalf("credits = %d, want 50", credits)
	}
	if got := s.WalletCostRub(credits); got != 2500 {
		t.Fatalf("WalletCostRub(50) = %d, want 2500", got)
	}
	if got := s.MediaCreditPriceRub(); got != 50 {
		t.Fatalf("MediaCreditPriceRub() = %d, want 50", got)
	}
}

func TestKieVideoSettings_SetMediaCreditPriceRub(t *testing.T) {
	s := &KieVideoSettings{}
	s.SetMediaCreditPriceRub(75)
	if s.KopecksPerMediaCredit != 7500 {
		t.Fatalf("KopecksPerMediaCredit = %d, want 7500", s.KopecksPerMediaCredit)
	}
	if s.MediaCreditPriceRub() != 75 {
		t.Fatalf("MediaCreditPriceRub() = %d, want 75", s.MediaCreditPriceRub())
	}
}
