package service

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/postilka/postilka/internal/ai"
	"github.com/postilka/postilka/internal/model"
)

type ImprovePromptInput struct {
	Prompt string
	Mode   string
}

type ImprovePromptResult struct {
	Prompt     string
	TextTokens int
}

func (s *GenerationService) ImprovePrompt(
	ctx context.Context,
	userID string,
	r *http.Request,
	in ImprovePromptInput,
) (ImprovePromptResult, error) {
	prompt := strings.TrimSpace(in.Prompt)
	if prompt == "" {
		return ImprovePromptResult{}, errors.New("prompt is required")
	}
	maxChars := 4000
	switch strings.TrimSpace(in.Mode) {
	case "text-to-video", "image-to-video", "reference-to-video":
		maxChars = ai.KieVideoPromptMaxChars
	}
	if utf8.RuneCountInString(prompt) > maxChars {
		return ImprovePromptResult{}, errors.New("prompt too long")
	}
	ws, err := s.resolveWorkspace(ctx, userID, r)
	if err != nil {
		return ImprovePromptResult{}, err
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleEditor); err != nil {
		return ImprovePromptResult{}, err
	}

	client, cfg, err := s.yandexGPT.Client(ctx)
	if err != nil {
		return ImprovePromptResult{}, err
	}
	modelID := ModelForTask(cfg, "generation_improve")
	if modelID == "" {
		return ImprovePromptResult{}, ErrYandexGptNotConfigured
	}

	result, err := client.Chat(ctx, modelID, []ai.ChatMessage{
		{Role: "system", Content: improveGenerationPromptSystem(in.Mode)},
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return ImprovePromptResult{}, err
	}
	improved := strings.TrimSpace(result.Content)
	if improved == "" {
		return ImprovePromptResult{}, errors.New("prompt improvement empty")
	}
	tokens := estimateTextTokens(prompt) + estimateTextTokens(improved)
	if err := s.quota.RecordTextTokens(ctx, ws.ID, tokens); err != nil {
		return ImprovePromptResult{}, err
	}
	if s.notify != nil {
		s.notify.MaybeUsageWarnings(ctx, ws.ID)
	}
	return ImprovePromptResult{Prompt: improved, TextTokens: tokens}, nil
}

func improveGenerationPromptSystem(mode string) string {
	switch strings.TrimSpace(mode) {
	case "image-to-image":
		return "Ты помощник для AI-редактирования фото. Улучши промпт пользователя: " +
			"опиши конкретные визуальные изменения, стиль, свет, детали. " +
			"Ответ — только улучшенный промпт на русском, без пояснений и кавычек."
	case "combine":
		return "Ты помощник для объединения нескольких фото в одну сцену. " +
			"Улучши промпт: как расположить объекты, фон, освещение, композицию. " +
			"Ответ — только улучшенный промпт на русском, без пояснений и кавычек."
	case "image-to-video":
		return "Ты помощник для image-to-video генерации. Улучши промпт: " +
			"опиши движение камеры, анимацию объектов, темп, атмосферу и стиль видео. " +
			"Ответ — только улучшенный промпт на русском, без пояснений и кавычек."
	case "reference-to-video":
		return "Ты помощник для reference-to-video генерации. Улучши промпт: " +
			"опиши сцену с учётом референсов, движение, стиль и настроение ролика. " +
			"Ответ — только улучшенный промпт на русском, без пояснений и кавычек."
	case "text-to-video":
		return "Ты помощник для text-to-video генерации. Улучши промпт: " +
			"добавь описание сцены, движения камеры, действий, света и кинематографичного стиля. " +
			"Ответ — только улучшенный промпт на русском, без пояснений и кавычек."
	default:
		return "Ты помощник для text-to-image генерации. Улучши промпт: " +
			"добавь визуальные детали, свет, настроение, композицию, стиль съёмки. " +
			"Ответ — только улучшенный промпт на русском, без пояснений и кавычек."
	}
}
