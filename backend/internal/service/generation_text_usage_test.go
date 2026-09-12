package service

import (
	"testing"

	"github.com/postilka/postilka/internal/ai"
	"github.com/postilka/postilka/internal/model"
)

func TestTextUsageDetailsUsesActualTokensAndModelPricing(t *testing.T) {
	result := ai.ChatCompletionResult{
		PromptTokens:     125,
		CompletionTokens: 75,
		TotalTokens:      200,
		Model:            "gpt://folder/yandexgpt/latest",
	}
	cfg := model.YandexGptStoredConfig{
		ModelDefault: "gpt://folder/yandexgpt/latest",
		ModelPricing: map[string]model.YandexModelPricing{
			"gpt://folder/yandexgpt/latest": {
				InputPer1K:  1.2,
				OutputPer1K: 2.4,
				Currency:    "RUB",
			},
		},
	}

	usage, err := textUsageDetails(result, cfg, "gpt://folder/yandexgpt/latest")
	if err != nil {
		t.Fatalf("textUsageDetails() error = %v", err)
	}
	if usage.TotalTokens != 200 || usage.PromptTokens != 125 || usage.CompletionTokens != 75 {
		t.Fatalf("usage tokens = %+v, want total=200 input=125 output=75", usage)
	}
	if usage.CostCents != 33 {
		t.Fatalf("usage cost = %d cents, want 33", usage.CostCents)
	}
}

func TestTextUsageDetailsFallsBackToRequestedModelPricing(t *testing.T) {
	result := ai.ChatCompletionResult{
		PromptTokens:     1000,
		CompletionTokens: 500,
		TotalTokens:      1500,
	}
	cfg := model.YandexGptStoredConfig{
		ModelPricing: map[string]model.YandexModelPricing{
			"yandexgpt/latest": {InputPer1K: 1, OutputPer1K: 2},
		},
	}

	usage, err := textUsageDetails(result, cfg, "yandexgpt/latest")
	if err != nil {
		t.Fatalf("textUsageDetails() error = %v", err)
	}
	if usage.CostCents != 200 {
		t.Fatalf("usage cost = %d cents, want 200", usage.CostCents)
	}
}

func TestTextUsageDetailsRequiresProviderUsage(t *testing.T) {
	_, err := textUsageDetails(ai.ChatCompletionResult{}, model.YandexGptStoredConfig{}, "yandexgpt/latest")
	if err == nil {
		t.Fatal("textUsageDetails() error = nil, want missing usage error")
	}
}
