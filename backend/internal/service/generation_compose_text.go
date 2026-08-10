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

type ComposePostTextInput struct {
	Task string
	Text string
	Tone string
}

func (s *GenerationService) ComposePostText(
	ctx context.Context,
	userID string,
	r *http.Request,
	in ComposePostTextInput,
) (string, error) {
	text := strings.TrimSpace(in.Text)
	if text == "" {
		return "", errors.New("text is required")
	}
	if utf8.RuneCountInString(text) > 8000 {
		return "", errors.New("text too long")
	}
	ws, err := s.resolveWorkspace(ctx, userID, r)
	if err != nil {
		return "", err
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleEditor); err != nil {
		return "", err
	}

	client, cfg, err := s.yandexGPT.Client(ctx)
	if err != nil {
		return "", err
	}
	modelID := ModelForTask(cfg, "composer_text")
	if modelID == "" {
		modelID = ModelForTask(cfg, "generation_improve")
	}
	if modelID == "" {
		return "", ErrYandexGptNotConfigured
	}

	result, err := client.Chat(ctx, modelID, []ai.ChatMessage{
		{Role: "system", Content: composePostTextSystem(in.Task, in.Tone)},
		{Role: "user", Content: text},
	})
	if err != nil {
		return "", err
	}
	out := strings.TrimSpace(result.Content)
	if out == "" {
		return "", errors.New("empty ai response")
	}
	tokens := estimateTextTokens(text) + estimateTextTokens(out)
	if err := s.quota.RecordTextTokens(ctx, ws.ID, tokens); err != nil {
		return "", err
	}
	return out, nil
}

func composePostTextSystem(task, tone string) string {
	switch strings.TrimSpace(task) {
	case "shorten":
		return "Сократи текст поста для соцсетей, сохрани смысл и ключевые факты. Ответ — только итоговый текст на русском, без пояснений."
	case "tone":
		target := strings.TrimSpace(tone)
		if target == "" {
			target = "дружелюбный и профессиональный"
		}
		return "Перепиши текст поста в тоне: " + target + ". Ответ — только итоговый текст на русском, без пояснений."
	case "hashtags":
		return "Предложи 5–10 релевантных хештегов на русском или латинице для этого поста. Ответ — только хештеги через пробел, каждый с #."
	default:
		return "Перепиши текст поста для соцсетей: улучши ясность, структуру и вовлечение. Ответ — только итоговый текст на русском, без пояснений и кавычек."
	}
}

func estimateTextTokens(text string) int {
	n := utf8.RuneCountInString(text)
	if n <= 0 {
		return 0
	}
	return (n + 3) / 4
}
