package ai

import "strings"

// KieMarketModels returns image models with exact API model names from docs.kie.ai.
func KieMarketModels() []KieModelInfo {
	return append([]KieModelInfo(nil), kieMarketCatalog...)
}

// kieMarketCatalog — canonical model IDs accepted by POST /api/v1/jobs/createTask.
var kieMarketCatalog = []KieModelInfo{
	{ID: "grok-imagine/text-to-image", Name: "Grok Imagine — Text to Image", Category: "generation"},
	{ID: "grok-imagine/image-to-image", Name: "Grok Imagine — Image to Image", Category: "generation"},
	{ID: "flux-2/flex-text-to-image", Name: "Flux-2 — Text to Image", Category: "generation"},
	{ID: "flux-2/flex-image-to-image", Name: "Flux-2 — Image to Image", Category: "generation"},
	{ID: "flux-2/pro-text-to-image", Name: "Flux-2 Pro — Text to Image", Category: "generation"},
	{ID: "flux-2/pro-image-to-image", Name: "Flux-2 Pro — Image to Image", Category: "generation"},
	{ID: "bytedance/seedream-v4-text-to-image", Name: "Seedream 4.0 — Text to Image", Category: "generation"},
	{ID: "bytedance/seedream-v4-edit", Name: "Seedream 4.0 — Edit", Category: "generation"},
	{ID: "seedream/4.5-text-to-image", Name: "Seedream 4.5 — Text to Image", Category: "generation"},
	{ID: "seedream/4.5-edit", Name: "Seedream 4.5 — Edit", Category: "generation"},
	{ID: "seedream/5-lite-text-to-image", Name: "Seedream 5 Lite — Text to Image", Category: "generation"},
	{ID: "seedream/5-lite-image-to-image", Name: "Seedream 5 Lite — Image to Image", Category: "generation"},
	{ID: "google/nano-banana", Name: "Google Nano Banana", Category: "generation"},
	{ID: "google/nano-banana-edit", Name: "Google Nano Banana Edit", Category: "filter"},
	{ID: "nano-banana-2", Name: "Google Nano Banana 2", Category: "generation"},
	{ID: "google/imagen4-fast", Name: "Google Imagen 4 Fast", Category: "generation"},
	{ID: "google/imagen4", Name: "Google Imagen 4", Category: "generation"},
	{ID: "google/imagen4-ultra", Name: "Google Imagen 4 Ultra", Category: "generation"},
	{ID: "nano-banana-pro", Name: "Google Nano Banana Pro", Category: "generation"},
	{ID: "gpt-image/1.5-text-to-image", Name: "GPT Image 1.5 — Text to Image", Category: "generation"},
	{ID: "gpt-image/1.5-image-to-image", Name: "GPT Image 1.5 — Image to Image", Category: "generation"},
	{ID: "gpt-image-2-text-to-image", Name: "GPT Image 2 — Text to Image", Category: "generation"},
	{ID: "gpt-image-2-image-to-image", Name: "GPT Image 2 — Image to Image", Category: "generation"},
	{ID: "qwen/text-to-image", Name: "Qwen — Text to Image", Category: "generation"},
	{ID: "qwen/image-to-image", Name: "Qwen — Image to Image", Category: "generation"},
	{ID: "z-image/z-image", Name: "Z-Image", Category: "filter"},
	{ID: "ideogram/v3-text-to-image", Name: "Ideogram V3 — Text to Image", Category: "generation"},
	{ID: "ideogram/v3-remix", Name: "Ideogram V3 — Remix", Category: "filter"},
	{ID: "recraft/remove-background", Name: "Recraft — Remove Background", Category: "filter"},
	{ID: "recraft/crisp-upscale", Name: "Recraft — Crisp Upscale", Category: "filter"},
	{ID: "topaz/image-upscale", Name: "Topaz — Image Upscale", Category: "filter"},
	{ID: "4o-image/generation", Name: "4o Image — Generation", Category: "generation"},
	{ID: "flux-kontext/generation", Name: "Flux Kontext — Generation", Category: "filter"},
}

// kieModelAliases maps legacy or mistaken catalog/admin IDs to KIE API model names.
var kieModelAliases = map[string]string{
	"gpt/gpt-image-2-text-to-image":              "gpt-image-2-text-to-image",
	"gpt/gpt-image-2-image-to-image":             "gpt-image-2-image-to-image",
	"gpt-image/1-5-text-to-image":                "gpt-image/1.5-text-to-image",
	"gpt-image/1-5-image-to-image":               "gpt-image/1.5-image-to-image",
	"seedream/seedream-v4-text-to-image":         "bytedance/seedream-v4-text-to-image",
	"seedream/seedream-v4-edit":                  "bytedance/seedream-v4-edit",
	"seedream/4-5-text-to-image":                 "seedream/4.5-text-to-image",
	"seedream/4-5-edit":                          "seedream/4.5-edit",
	"bytedance/seedream-4-5-text-to-image":       "seedream/4.5-text-to-image",
	"bytedance/seedream-4-5-edit":                "seedream/4.5-edit",
	"seedream/5-lite-text-to-image":              "seedream/5-lite-text-to-image",
	"bytedance/seedream-5-lite-text-to-image":    "seedream/5-lite-text-to-image",
	"seedream-5-lite-image-to-image":             "seedream/5-lite-image-to-image",
	"bytedance/seedream-5-lite-image-to-image":   "seedream/5-lite-image-to-image",
	"google/nanobanana2":                         "nano-banana-2",
	"google/pro-image-to-image":                  "nano-banana-pro",
}

// NormalizeKieModelID returns the model id accepted by createTask.
func NormalizeKieModelID(modelID string) string {
	modelID = strings.TrimSpace(modelID)
	if modelID == "" {
		return ""
	}
	if canonical, ok := kieModelAliases[modelID]; ok {
		return canonical
	}
	return modelID
}
