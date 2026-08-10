package ai

import (
	"fmt"
	"strings"
)

const DefaultVideoResolution = "768"

// KieVideoMarketModels returns video models from KIE Market catalog.
func KieVideoMarketModels() []KieModelInfo {
	return append([]KieModelInfo(nil), kieVideoMarketCatalog...)
}

var kieVideoModelAliases = map[string]string{
	"kling/v3-turbo-text2video": "kling/v3-turbo-text-to-video",
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

// BuildVideoTaskInput builds model-specific input for video createTask.
func BuildVideoTaskInput(modelID, mode, prompt, aspectRatio string, duration int, imageURLs []string) map[string]any {
	modelID = NormalizeKieVideoModelID(modelID)
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
	case "768":
		input["resolution"] = DefaultVideoResolution
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

func normalizeVideoAspectForModel(modelID, ratio string) string {
	ratio = strings.TrimSpace(ratio)
	switch ratio {
	case "9:16", "21:9", "16:9", "4:3", "1:1", "3:4":
	default:
		ratio = "16:9"
	}

	// Kling 2.6 / V3 Turbo: only 9:16, 16:9, 1:1 per KIE docs.
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

	// Most market models reject 21:9 / 4:3 — map to nearest supported ratio.
	switch ratio {
	case "21:9", "4:3":
		return "16:9"
	case "3:4":
		return "9:16"
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
	// Legacy default "768" is rejected by many models; 720p is safer.
	return "720p"
}

func DefaultVideoModelForMode(mode string) string {
	switch strings.TrimSpace(mode) {
	case "image-to-video":
		return "kling/v3-turbo-image-to-video"
	case "reference-to-video":
		return "happyhorse/reference-to-video"
	default:
		return "kling/v3-turbo-text-to-video"
	}
}
