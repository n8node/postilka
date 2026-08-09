package service

import (
	"context"
	"errors"
	"strings"

	"github.com/postilka/postilka/internal/ai"
)

type ImprovePromptInput struct {
	Prompt string
	Mode   string
}

func (s *GenerationService) ImprovePrompt(ctx context.Context, userID string, in ImprovePromptInput) (string, error) {
	prompt := strings.TrimSpace(in.Prompt)
	if prompt == "" {
		return "", errors.New("prompt is required")
	}
	if len(prompt) > 4000 {
		return "", errors.New("prompt too long")
	}

	client, cfg, err := s.yandexGPT.Client(ctx)
	if err != nil {
		return "", err
	}
	modelID := ModelForTask(cfg, "generation_improve")
	if modelID == "" {
		return "", ErrYandexGptNotConfigured
	}

	result, err := client.Chat(ctx, modelID, []ai.ChatMessage{
		{Role: "system", Content: improveGenerationPromptSystem(in.Mode)},
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return "", err
	}
	improved := strings.TrimSpace(result.Content)
	if improved == "" {
		return "", errors.New("prompt improvement empty")
	}
	return improved, nil
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
	default:
		return "Ты помощник для text-to-image генерации. Улучши промпт: " +
			"добавь визуальные детали, свет, настроение, композицию, стиль съёмки. " +
			"Ответ — только улучшенный промпт на русском, без пояснений и кавычек."
	}
}
