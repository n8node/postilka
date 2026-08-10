package ai

import (
	"fmt"
	"strings"
)

const (
	// DefaultMiniMaxH3Resolution is the KIE enum value for MiniMax H3 (768P or 2K).
	DefaultMiniMaxH3Resolution = "768P"
)

// KieVideoMarketModels returns video models from KIE Market catalog.
func KieVideoMarketModels() []KieModelInfo {
	return append([]KieModelInfo(nil), kieVideoMarketCatalog...)
}

var kieVideoModelAliases = map[string]string{
	"kling/v3-turbo-text2video":  "kling/v3-turbo-text-to-video",
	"kling/v3-turbo-image2video": "kling/v3-turbo-image-to-video",
}

var kieVideoCanonicalSet = func() map[string]struct{} {
	set := make(map[string]struct{}, len(kieVideoMarketCatalog))
	for _, m := range kieVideoMarketCatalog {
		set[m.ID] = struct{}{}
	}
	return set
}()

// NormalizeKieVideoModelID returns canonical video model id.
func NormalizeKieVideoModelID(modelID string) string {
	modelID = strings.TrimSpace(modelID)
	if modelID == "" {
		return ""
	}
	if canonical, ok := kieVideoModelAliases[modelID]; ok {
		return canonical
	}
	if _, ok := kieVideoCanonicalSet[modelID]; ok {
		return modelID
	}
	return modelID
}

func isMiniMaxH3Model(modelID string) bool {
	return strings.HasPrefix(modelID, "minimax-h3/")
}

// BuildVideoTaskInput builds model-specific input for video createTask.
func BuildVideoTaskInput(modelID, mode, prompt, aspectRatio string, duration int, imageURLs []string) map[string]any {
	modelID = NormalizeKieVideoModelID(modelID)
	if isMiniMaxH3Model(modelID) {
		return buildMiniMaxH3TaskInput(modelID, mode, prompt, aspectRatio, duration, imageURLs)
	}
	return buildGenericVideoTaskInput(modelID, mode, prompt, aspectRatio, duration, imageURLs)
}

func buildMiniMaxH3TaskInput(modelID, mode, prompt, aspectRatio string, duration int, imageURLs []string) map[string]any {
	prompt = strings.TrimSpace(prompt)
	aspectRatio = normalizeMiniMaxAspectRatio(aspectRatio)
	duration = clampVideoDuration(duration)

	input := map[string]any{
		"prompt":     prompt,
		"duration":   duration,
		"resolution": DefaultMiniMaxH3Resolution,
	}

	mode = strings.ToLower(strings.TrimSpace(mode))
	switch mode {
	case "image-to-video":
		if len(imageURLs) > 0 {
			input["first_frame_url"] = imageURLs[0]
		}
	case "reference-to-video":
		if len(imageURLs) > 0 {
			input["reference_image_urls"] = imageURLs
		}
		if aspectRatio != "" {
			input["aspect_ratio"] = aspectRatio
		}
	default:
		input["aspect_ratio"] = aspectRatio
	}

	return input
}

func buildGenericVideoTaskInput(modelID, mode, prompt, aspectRatio string, duration int, imageURLs []string) map[string]any {
	prompt = strings.TrimSpace(prompt)
	aspectRatio = normalizeVideoAspectForModel(modelID, aspectRatio)
	duration = clampVideoDuration(duration)

	input := map[string]any{
		"prompt":       prompt,
		"aspect_ratio": aspectRatio,
		"duration":     fmt.Sprintf("%d", duration),
	}

	switch videoResolutionForModel(modelID) {
	case "720p", "1080p":
		input["resolution"] = videoResolutionForModel(modelID)
	default:
		input["resolution"] = "720p"
	}

	mode = strings.ToLower(strings.TrimSpace(mode))
	switch mode {
	case "image-to-video":
		if len(imageURLs) > 0 {
			switch {
			case strings.HasPrefix(modelID, "wan/"):
				input["first_frame_url"] = imageURLs[0]
			case strings.HasPrefix(modelID, "kling"):
				input["image_url"] = imageURLs[0]
			default:
				input["image_url"] = imageURLs[0]
			}
		}
	case "reference-to-video":
		if len(imageURLs) > 0 {
			switch {
			case strings.HasPrefix(modelID, "wan/"):
				input["reference_image"] = imageURLs
			case strings.HasPrefix(modelID, "happyhorse"):
				input["reference_image"] = imageURLs
			default:
				input["reference_image"] = imageURLs
			}
		}
	}

	if strings.HasPrefix(modelID, "kling-2.6/") {
		input["sound"] = false
	}

	return input
}

func clampVideoDuration(n int) int {
	if n < 4 {
		return 4
	}
	if n > 15 {
		return 15
	}
	return n
}

func normalizeMiniMaxAspectRatio(ratio string) string {
	ratio = strings.TrimSpace(ratio)
	switch ratio {
	case "9:16", "21:9", "16:9", "4:3", "1:1", "3:4", "adaptive":
		return ratio
	default:
		return "16:9"
	}
}

func normalizeVideoAspectForModel(modelID, ratio string) string {
	ratio = strings.TrimSpace(ratio)
	switch ratio {
	case "9:16", "21:9", "16:9", "4:3", "1:1", "3:4":
	default:
		ratio = "16:9"
	}

	if strings.HasPrefix(modelID, "kling-2.6/") ||
		strings.HasPrefix(modelID, "kling/v3-turbo") ||
		strings.HasPrefix(modelID, "kling/v3-") {
		switch ratio {
		case "9:16", "16:9", "1:1":
			return ratio
		case "3:4":
			return "9:16"
		default:
			return "16:9"
		}
	}
	return ratio
}

func videoResolutionForModel(modelID string) string {
	if strings.HasPrefix(modelID, "kling/") || strings.HasPrefix(modelID, "kling-") {
		return "720p"
	}
	if strings.HasPrefix(modelID, "wan/") {
		return "720p"
	}
	if strings.HasPrefix(modelID, "bytedance/") || strings.HasPrefix(modelID, "hailuo/") {
		return "720p"
	}
	return "720p"
}

func DefaultVideoModelForMode(mode string) string {
	switch strings.TrimSpace(mode) {
	case "image-to-video":
		return "minimax-h3/image-to-video"
	case "reference-to-video":
		return "minimax-h3/reference-to-video"
	default:
		return "minimax-h3/text-to-video"
	}
}
