package service

import (
	"testing"

	"github.com/postilka/postilka/internal/model"
)

func TestLookupYandexModelPricing_PrefersTaskModelThenDefault(t *testing.T) {
	cfg := model.YandexGptStoredConfig{
		ModelDefault: "yandexgpt-lite",
		ModelPricing: map[string]model.YandexModelPricing{
			"yandexgpt-lite": {InputPer1K: 0.4, OutputPer1K: 0.8, Currency: "RUB"},
			"yandexgpt":      {InputPer1K: 1.2, OutputPer1K: 2.4, Currency: "RUB"},
		},
	}

	got := lookupYandexModelPricing(cfg, "yandexgpt")
	if got.InputPer1K != 1.2 || got.OutputPer1K != 2.4 {
		t.Fatalf("task model pricing = %+v, want 1.2/2.4", got)
	}

	got = lookupYandexModelPricing(cfg, "missing-model")
	if got.InputPer1K != 0.4 || got.OutputPer1K != 0.8 {
		t.Fatalf("fallback to default = %+v, want 0.4/0.8", got)
	}

	got = lookupYandexModelPricing(model.YandexGptStoredConfig{}, "yandexgpt")
	if got.InputPer1K != 0 || got.OutputPer1K != 0 {
		t.Fatalf("empty config = %+v, want zeros", got)
	}
}
