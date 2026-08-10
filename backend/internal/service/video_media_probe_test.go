package service

import "testing"

func TestValidateReferenceVideoDuration(t *testing.T) {
	t.Parallel()
	tests := []struct {
		sec   float64
		valid bool
	}{
		{1.9, false},
		{2, true},
		{15, true},
		{15.1, false},
		{17.5, false},
	}
	for _, tt := range tests {
		err := validateReferenceVideoDuration(tt.sec)
		if tt.valid && err != nil {
			t.Fatalf("duration %.1f should be valid: %v", tt.sec, err)
		}
		if !tt.valid && err == nil {
			t.Fatalf("duration %.1f should be invalid", tt.sec)
		}
	}
}
