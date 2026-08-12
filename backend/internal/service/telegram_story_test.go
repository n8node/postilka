package service

import (
	"encoding/json"
	"testing"

	"github.com/postilka/postilka/internal/model"
)

func TestBuildTelegramStoryAreasJSONLinkUsesCenterPosition(t *testing.T) {
	raw, err := buildTelegramStoryAreasJSON([]model.TelegramStoryArea{
		{
			Kind: "link",
			URL:  "https://postilka.ru",
			Position: model.TelegramStoryAreaPosition{
				XPercentage:            10,
				YPercentage:            20,
				WidthPercentage:        40,
				HeightPercentage:       18,
				RotationAngle:          0,
				CornerRadiusPercentage: 8,
			},
		},
	})
	if err != nil {
		t.Fatalf("build json: %v", err)
	}
	var areas []struct {
		Position model.TelegramStoryAreaPosition `json:"position"`
		Type     struct {
			Type string `json:"type"`
			URL  string `json:"url"`
		} `json:"type"`
	}
	if err := json.Unmarshal([]byte(raw), &areas); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(areas) != 1 {
		t.Fatalf("expected 1 area, got %d", len(areas))
	}
	got := areas[0].Position
	if got.XPercentage != 30 {
		t.Fatalf("expected center x 30, got %v", got.XPercentage)
	}
	if got.YPercentage != 29 {
		t.Fatalf("expected center y 29, got %v", got.YPercentage)
	}
	if areas[0].Type.Type != "link" || areas[0].Type.URL != "https://postilka.ru" {
		t.Fatalf("unexpected link payload: %+v", areas[0].Type)
	}
}

func TestStoryAreaPositionForAPIClampsLinkArea(t *testing.T) {
	got := storyAreaPositionForAPI(model.TelegramStoryAreaPosition{
		XPercentage:            85,
		YPercentage:            5,
		WidthPercentage:        40,
		HeightPercentage:       18,
		RotationAngle:          0,
		CornerRadiusPercentage: 8,
	}, "link")
	if got.WidthPercentage < telegramStoryLinkMinWidthPct {
		t.Fatalf("expected min link width, got %v", got.WidthPercentage)
	}
	if got.XPercentage > 100-got.WidthPercentage/2 {
		t.Fatalf("center x out of bounds: %v width %v", got.XPercentage, got.WidthPercentage)
	}
	if got.YPercentage < got.HeightPercentage/2 {
		t.Fatalf("center y out of bounds: %v height %v", got.YPercentage, got.HeightPercentage)
	}
}
