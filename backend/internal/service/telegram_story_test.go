package service

import (
	"encoding/json"
	"strings"
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

func TestBuildTelegramStoryAreasJSONRejectsEmptyLinkURL(t *testing.T) {
	_, err := buildTelegramStoryAreasJSON([]model.TelegramStoryArea{
		{
			Kind: "link",
			Position: model.TelegramStoryAreaPosition{
				XPercentage:      10,
				YPercentage:      20,
				WidthPercentage:  40,
				HeightPercentage: 18,
			},
		},
	})
	if err == nil {
		t.Fatal("expected error for empty link url")
	}
}

func TestBuildTelegramStoryAreasJSONNormalizesLinkURL(t *testing.T) {
	raw, err := buildTelegramStoryAreasJSON([]model.TelegramStoryArea{
		{
			Kind: "link",
			URL:  "example.com/page",
			Position: model.TelegramStoryAreaPosition{
				XPercentage:      18,
				YPercentage:      78,
				WidthPercentage:  64,
				HeightPercentage: 10,
			},
		},
	})
	if err != nil {
		t.Fatalf("build json: %v", err)
	}
	if !strings.Contains(raw, `"url":"https://example.com/page"`) {
		t.Fatalf("expected normalized https url, got %s", raw)
	}
}

func TestBuildTelegramStoryAreasJSONIncludesReactionAndLink(t *testing.T) {
	raw, err := buildTelegramStoryAreasJSON([]model.TelegramStoryArea{
		{
			Kind:          "suggested_reaction",
			ReactionEmoji: "❤",
			Position: model.TelegramStoryAreaPosition{
				XPercentage: 8, YPercentage: 12, WidthPercentage: 16, HeightPercentage: 16,
			},
		},
		{
			Kind: "link",
			URL:  "https://google.com",
			Position: model.TelegramStoryAreaPosition{
				XPercentage: 18, YPercentage: 78, WidthPercentage: 64, HeightPercentage: 10,
			},
		},
	})
	if err != nil {
		t.Fatalf("build json: %v", err)
	}
	links, err := countTelegramStoryLinkAreasJSON(raw)
	if err != nil {
		t.Fatalf("count links: %v", err)
	}
	if links != 1 {
		t.Fatalf("expected 1 link area in json, got %d: %s", links, raw)
	}
}

func TestPostSettingsTelegramStoryLinkRoundTrip(t *testing.T) {
	settings := model.PostSettings{
		TelegramStory: &model.TelegramStorySettings{
			ActivePeriod: model.TelegramStoryPeriod24h,
			Areas: []model.TelegramStoryArea{
				{
					Kind: "link",
					URL:  "https://erman.ai",
					Position: model.TelegramStoryAreaPosition{
						XPercentage:      18,
						YPercentage:      78,
						WidthPercentage:  64,
						HeightPercentage: 10,
					},
				},
			},
		},
	}
	raw, err := json.Marshal(settings)
	if err != nil {
		t.Fatalf("marshal settings: %v", err)
	}
	var decoded model.PostSettings
	if err := json.Unmarshal(raw, &decoded); err != nil {
		t.Fatalf("unmarshal settings: %v", err)
	}
	if decoded.TelegramStory == nil || len(decoded.TelegramStory.Areas) != 1 {
		t.Fatalf("telegram_story areas lost in round trip: %+v", decoded.TelegramStory)
	}
	areasJSON, err := buildTelegramStoryAreasJSON(decoded.TelegramStory.Areas)
	if err != nil {
		t.Fatalf("build json: %v", err)
	}
	if !strings.Contains(areasJSON, `"type":"link"`) || !strings.Contains(areasJSON, "https://erman.ai") {
		t.Fatalf("unexpected areas json: %s", areasJSON)
	}
}

func TestBuildTelegramStoryAreasJSONLocationIncludesAddress(t *testing.T) {
	raw, err := buildTelegramStoryAreasJSON([]model.TelegramStoryArea{
		{
			Kind:      "location",
			Latitude:  55.7558,
			Longitude: 37.6173,
			Position: model.TelegramStoryAreaPosition{
				XPercentage: 8, YPercentage: 12, WidthPercentage: 40, HeightPercentage: 14,
			},
		},
	})
	if err != nil {
		t.Fatalf("build json: %v", err)
	}
	if !strings.Contains(raw, `"type":"location"`) {
		t.Fatalf("expected location type, got %s", raw)
	}
	if !strings.Contains(raw, `"country_code":"RU"`) {
		t.Fatalf("expected default country_code RU, got %s", raw)
	}
	if !strings.Contains(raw, `"latitude":55.7558`) {
		t.Fatalf("expected latitude in json, got %s", raw)
	}
}

func TestStoryAreaPositionForAPIClampsArea(t *testing.T) {
	got := storyAreaPositionForAPI(model.TelegramStoryAreaPosition{
		XPercentage:            85,
		YPercentage:            5,
		WidthPercentage:        40,
		HeightPercentage:       18,
		RotationAngle:          0,
		CornerRadiusPercentage: 8,
	}, "link")
	if got.WidthPercentage != 40 {
		t.Fatalf("expected width unchanged, got %v", got.WidthPercentage)
	}
	if got.XPercentage > 100-got.WidthPercentage/2 {
		t.Fatalf("center x out of bounds: %v width %v", got.XPercentage, got.WidthPercentage)
	}
	if got.YPercentage < got.HeightPercentage/2 {
		t.Fatalf("center y out of bounds: %v height %v", got.YPercentage, got.HeightPercentage)
	}
}
