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
	Task   string
	Text   string
	Prompt string
	Tone   string
	Length string
}

func (s *GenerationService) ComposePostText(
	ctx context.Context,
	userID string,
	r *http.Request,
	in ComposePostTextInput,
) (string, error) {
	task := strings.TrimSpace(in.Task)
	if task == "" {
		task = "generate"
	}
	prompt := strings.TrimSpace(in.Prompt)
	text := strings.TrimSpace(in.Text)
	if task == "generate" {
		if prompt == "" {
			return "", errors.New("prompt is required")
		}
		if utf8.RuneCountInString(prompt) > 4000 {
			return "", errors.New("prompt too long")
		}
	} else if text == "" {
		return "", errors.New("text is required")
	}
	if text != "" && utf8.RuneCountInString(text) > 8000 {
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

	userContent := composePostTextUserContent(task, prompt, text)
	result, err := client.Chat(ctx, modelID, []ai.ChatMessage{
		{Role: "system", Content: composePostTextSystem(task, in.Tone, in.Length)},
		{Role: "user", Content: userContent},
	})
	if err != nil {
		return "", err
	}
	out := strings.TrimSpace(result.Content)
	if out == "" {
		return "", errors.New("empty ai response")
	}
	tokens := estimateTextTokens(userContent) + estimateTextTokens(out)
	if err := s.quota.RecordTextTokens(ctx, ws.ID, tokens); err != nil {
		return "", err
	}
	return out, nil
}

func composePostTextUserContent(task, prompt, text string) string {
	switch strings.TrimSpace(task) {
	case "generate":
		if text != "" {
			return "Задание:\n" + prompt + "\n\nТекущий черновик (используй как основу или контекст):\n" + text
		}
		return prompt
	default:
		return text
	}
}

func composePostTextSystem(task, tone, length string) string {
	lengthHint := composePostTextLengthHint(length)
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
	case "generate":
		base := "Ты помощник SMM. По заданию пользователя напиши текст поста для соцсетей на русском. " +
			"Ответ — только готовый текст поста, без пояснений, заголовков и кавычек."
		if lengthHint != "" {
			base += " " + lengthHint
		}
		target := strings.TrimSpace(tone)
		if target != "" && target != "нейтральный" {
			base += " Тон: " + target + "."
		}
		return base
	default:
		return "Перепиши текст поста для соцсетей: улучши ясность, структуру и вовлечение. Ответ — только итоговый текст на русском, без пояснений и кавычек."
	}
}

func composePostTextLengthHint(length string) string {
	switch strings.TrimSpace(length) {
	case "short":
		return "Длина: короткий пост до 500 символов."
	case "long":
		return "Длина: развёрнутый пост до 2000 символов."
	case "medium":
		return "Длина: средний пост до 1000 символов."
	default:
		return ""
	}
}

func estimateTextTokens(text string) int {
	n := utf8.RuneCountInString(text)
	if n <= 0 {
		return 0
	}
	return (n + 3) / 4
}
