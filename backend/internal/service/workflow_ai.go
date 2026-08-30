package service

import (
	"errors"
	"strings"
)

func filledWorkflowSlots(urls, ids []string) int {
	n := len(urls)
	if len(ids) > n {
		n = len(ids)
	}
	count := 0
	for i := 0; i < n; i++ {
		url := ""
		id := ""
		if i < len(urls) {
			url = strings.TrimSpace(urls[i])
		}
		if i < len(ids) {
			id = strings.TrimSpace(ids[i])
		}
		if url != "" || id != "" {
			count++
		}
	}
	return count
}

func validateWorkflowAIImage(inputs map[string]interface{}) error {
	if strings.TrimSpace(getString(inputs, "prompt", "")) == "" {
		return errors.New("промпт для генерации изображения обязателен")
	}
	mode := strings.TrimSpace(getString(inputs, "mode", "text-to-image"))
	switch mode {
	case "image-to-image":
		src := strings.TrimSpace(getString(inputs, "sourceImage", ""))
		if src == "" {
			src = strings.TrimSpace(getString(inputs, "referenceImage", ""))
		}
		if src == "" && strings.TrimSpace(getString(inputs, "sourceImageFileId", "")) == "" {
			return errors.New("для режима «Фото → фото» нужно исходное фото")
		}
	case "combine":
		if filledWorkflowSlots(getStringSlice(inputs, "combineImages"), getStringSlice(inputs, "combineImageFileIds")) < 2 {
			return errors.New("для комбинации нужно минимум 2 фото")
		}
	}
	return nil
}

func validateWorkflowAIVideo(inputs map[string]interface{}) error {
	if strings.TrimSpace(getString(inputs, "prompt", "")) == "" {
		return errors.New("промпт для генерации видео обязателен")
	}
	mode := strings.TrimSpace(getString(inputs, "mode", "text-to-video"))
	switch mode {
	case "image-to-video":
		hasFrame := strings.TrimSpace(getString(inputs, "firstFrame", "")) != "" ||
			strings.TrimSpace(getString(inputs, "firstFrameFileId", "")) != "" ||
			strings.TrimSpace(getString(inputs, "lastFrame", "")) != "" ||
			strings.TrimSpace(getString(inputs, "lastFrameFileId", "")) != ""
		if !hasFrame {
			return errors.New("для режима «Фото → видео» нужен первый или последний кадр")
		}
	case "reference-to-video":
		images := filledWorkflowSlots(getStringSlice(inputs, "referenceImages"), getStringSlice(inputs, "referenceImageFileIds"))
		videos := filledWorkflowSlots(getStringSlice(inputs, "referenceVideos"), getStringSlice(inputs, "referenceVideoFileIds"))
		if images == 0 && videos == 0 && strings.TrimSpace(getString(inputs, "firstFrame", "")) == "" {
			return errors.New("для режима «Референс → видео» нужно фото или видео")
		}
	}
	return nil
}

func clampWorkflowVideoDuration(seconds int) int {
	if seconds < 4 {
		return 4
	}
	if seconds > 15 {
		return 15
	}
	return seconds
}
