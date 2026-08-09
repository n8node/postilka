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
	if _, ok := kieCanonicalModelSet[modelID]; ok {
		return modelID
	}
	return modelID
}

var kieCanonicalModelSet = func() map[string]struct{} {
	set := make(map[string]struct{}, len(kieMarketCatalog))
	for _, m := range kieMarketCatalog {
		set[m.ID] = struct{}{}
	}
	return set
}()

type kieInputFamily int

const (
	kieFamilyGrok kieInputFamily = iota
	kieFamilyFlux2
	kieFamilySeedreamV4
	kieFamilySeedream45Lite
	kieFamilyGPTImage2
	kieFamilyGPTImage15
	kieFamilyGoogleNano
	kieFamilyGoogleImagen4
	kieFamilyNanoBananaAdvanced
	kieFamilyQwen
	kieFamilyIdeogram
)

func kieModelInputFamily(modelID string) kieInputFamily {
	switch {
	case modelID == "gpt-image-2-text-to-image" || modelID == "gpt-image-2-image-to-image":
		return kieFamilyGPTImage2
	case strings.HasPrefix(modelID, "gpt-image/1.5"):
		return kieFamilyGPTImage15
	case strings.HasPrefix(modelID, "bytedance/seedream-v4"):
		return kieFamilySeedreamV4
	case strings.HasPrefix(modelID, "seedream/"):
		return kieFamilySeedream45Lite
	case strings.HasPrefix(modelID, "flux-2/"):
		return kieFamilyFlux2
	case modelID == "nano-banana-2" || modelID == "nano-banana-pro":
		return kieFamilyNanoBananaAdvanced
	case modelID == "google/nano-banana" || modelID == "google/nano-banana-edit":
		return kieFamilyGoogleNano
	case strings.HasPrefix(modelID, "google/imagen4"):
		return kieFamilyGoogleImagen4
	case strings.HasPrefix(modelID, "qwen/"):
		return kieFamilyQwen
	case strings.HasPrefix(modelID, "ideogram/"):
		return kieFamilyIdeogram
	default:
		return kieFamilyGrok
	}
}

// BuildGenerationTaskInput builds model-specific input for createTask.
func BuildGenerationTaskInput(modelID, mode, prompt, aspectRatio string, imageURLs []string) map[string]any {
	modelID = NormalizeKieModelID(modelID)
	prompt = strings.TrimSpace(prompt)
	aspectRatio = strings.TrimSpace(aspectRatio)

	if len(imageURLs) > 0 || mode == "image-to-image" || mode == "combine" {
		return buildImageTaskInput(modelID, prompt, aspectRatio, imageURLs)
	}
	return buildTextToImageInput(modelID, prompt, aspectRatio)
}

func buildTextToImageInput(modelID, prompt, aspectRatio string) map[string]any {
	switch kieModelInputFamily(modelID) {
	case kieFamilyGPTImage2:
		return map[string]any{
			"prompt":       prompt,
			"aspect_ratio": mapGPTAspectRatio(aspectRatio),
		}
	case kieFamilyGPTImage15:
		return map[string]any{
			"prompt":       prompt,
			"aspect_ratio": mapGPT15AspectRatio(aspectRatio),
			"quality":      "medium",
		}
	case kieFamilySeedreamV4:
		return map[string]any{
			"prompt":           prompt,
			"image_size":       mapSeedreamImageSize(aspectRatio),
			"image_resolution": "1K",
			"max_images":       1,
		}
	case kieFamilySeedream45Lite:
		return map[string]any{
			"prompt":       prompt,
			"aspect_ratio": mapSeedream45AspectRatio(aspectRatio),
			"quality":      "basic",
		}
	case kieFamilyFlux2:
		return map[string]any{
			"prompt":       prompt,
			"aspect_ratio": mapFluxAspectRatio(aspectRatio),
			"resolution":   "1K",
		}
	case kieFamilyGoogleNano:
		return map[string]any{
			"prompt":        prompt,
			"aspect_ratio":  mapGoogleNanoAspectRatio(aspectRatio),
			"output_format": "png",
		}
	case kieFamilyGoogleImagen4:
		return map[string]any{
			"prompt":       prompt,
			"aspect_ratio": mapImagen4AspectRatio(aspectRatio),
			"num_images":   "1",
		}
	case kieFamilyNanoBananaAdvanced:
		return map[string]any{
			"prompt":        prompt,
			"aspect_ratio":  mapGoogleNanoAspectRatio(aspectRatio),
			"resolution":    "1K",
			"output_format": "png",
			"image_input":   []string{},
		}
	case kieFamilyQwen:
		return map[string]any{
			"prompt":     prompt,
			"image_size": mapQwenImageSize(aspectRatio),
		}
	case kieFamilyIdeogram:
		return map[string]any{
			"prompt":          prompt,
			"image_size":      mapIdeogramImageSize(aspectRatio),
			"rendering_speed": "BALANCED",
			"style":           "AUTO",
			"expand_prompt":   true,
		}
	default:
		return map[string]any{
			"prompt":       prompt,
			"aspect_ratio": mapGrokAspectRatio(aspectRatio),
		}
	}
}

func buildImageTaskInput(modelID, prompt, aspectRatio string, imageURLs []string) map[string]any {
	switch kieModelInputFamily(modelID) {
	case kieFamilyGPTImage2:
		input := map[string]any{
			"input_urls":   imageURLs,
			"aspect_ratio": mapGPTAspectRatio(aspectRatio),
		}
		if prompt != "" {
			input["prompt"] = prompt
		}
		return input
	case kieFamilyGPTImage15:
		return map[string]any{
			"input_urls":   imageURLs,
			"prompt":       prompt,
			"aspect_ratio": mapGPT15AspectRatio(aspectRatio),
			"quality":      "medium",
		}
	case kieFamilySeedreamV4:
		return map[string]any{
			"prompt":           prompt,
			"image_urls":       imageURLs,
			"image_size":       mapSeedreamImageSize(aspectRatio),
			"image_resolution": "1K",
			"max_images":       1,
		}
	case kieFamilySeedream45Lite:
		return map[string]any{
			"prompt":       prompt,
			"image_urls":   imageURLs,
			"aspect_ratio": mapSeedream45AspectRatio(aspectRatio),
			"quality":      "basic",
		}
	case kieFamilyFlux2:
		input := map[string]any{
			"image_urls":   imageURLs,
			"aspect_ratio": mapFluxAspectRatio(aspectRatio),
			"resolution":   "1K",
		}
		if prompt != "" {
			input["prompt"] = prompt
		}
		return input
	case kieFamilyNanoBananaAdvanced:
		input := map[string]any{
			"prompt":        prompt,
			"image_input":   imageURLs,
			"aspect_ratio":  mapGoogleNanoAspectRatio(aspectRatio),
			"resolution":    "1K",
			"output_format": "png",
		}
		if len(imageURLs) == 0 {
			input["image_input"] = []string{}
		}
		return input
	case kieFamilyGoogleNano:
		input := map[string]any{
			"prompt":       prompt,
			"aspect_ratio": mapGoogleNanoAspectRatio(aspectRatio),
		}
		if len(imageURLs) > 0 {
			input["image_urls"] = imageURLs
		}
		return input
	case kieFamilyQwen:
		return map[string]any{
			"prompt":     prompt,
			"image_urls": imageURLs,
			"image_size": mapQwenImageSize(aspectRatio),
		}
	case kieFamilyIdeogram:
		return map[string]any{
			"prompt":     prompt,
			"image_urls": imageURLs,
			"image_size": mapIdeogramImageSize(aspectRatio),
		}
	default:
		input := map[string]any{
			"image_urls": imageURLs,
		}
		if prompt != "" {
			input["prompt"] = prefixImageRefs(prompt, len(imageURLs))
		}
		if ar := mapGrokAspectRatio(aspectRatio); ar != "" {
			input["aspect_ratio"] = ar
		}
		return input
	}
}

func mapGPT15AspectRatio(ratio string) string {
	switch ratio {
	case "1:1", "2:3", "3:2":
		return ratio
	case "4:5", "9:16":
		return "2:3"
	case "16:9":
		return "3:2"
	default:
		return "1:1"
	}
}

func mapSeedream45AspectRatio(ratio string) string {
	switch ratio {
	case "1:1", "4:3", "3:4", "16:9", "9:16", "2:3", "3:2", "4:5", "21:9":
		return ratio
	default:
		return "1:1"
	}
}

func mapGoogleNanoAspectRatio(ratio string) string {
	switch ratio {
	case "1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9", "auto":
		return ratio
	default:
		return "1:1"
	}
}

func mapImagen4AspectRatio(ratio string) string {
	switch ratio {
	case "1:1", "16:9", "9:16", "3:4", "4:3", "4:5":
		return ratio
	case "3:2":
		return "4:3"
	case "2:3":
		return "3:4"
	default:
		return "1:1"
	}
}

func mapQwenImageSize(ratio string) string {
	return mapSeedreamImageSize(ratio)
}

func mapIdeogramImageSize(ratio string) string {
	return mapSeedreamImageSize(ratio)
}
