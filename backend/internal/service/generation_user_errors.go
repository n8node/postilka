package service

import (
	"regexp"
	"strings"
)

const generationNoChargeNote = " Средства не были списаны."

func UserGenerationFailMessage(raw string) string {
	msg := translateGenerationError(raw)
	if !alreadyMentionsNoCharge(msg) {
		msg += generationNoChargeNote
	}
	return msg
}

func alreadyMentionsNoCharge(msg string) bool {
	lower := strings.ToLower(msg)
	return strings.Contains(lower, "не списан") ||
		strings.Contains(lower, "не были списаны") ||
		strings.Contains(lower, "средства не")
}

func translateGenerationError(raw string) string {
	raw = normalizeProviderError(raw)
	if raw == "" {
		return "Не удалось сгенерировать изображение. Попробуйте ещё раз."
	}

	lower := strings.ToLower(raw)

	switch {
	case strings.Contains(lower, "content safety"):
		return "Запрос отклонён из‑за ограничений безопасности контента. Измените описание или исходные фото и попробуйте снова."
	case strings.Contains(lower, "nsfw"), strings.Contains(lower, "adult content"), strings.Contains(lower, "explicit"):
		return "Изображение не прошло проверку на допустимый контент. Измените описание или исходные фото."
	case strings.Contains(lower, "violat"), strings.Contains(lower, "policy"), strings.Contains(lower, "prohibited"), strings.Contains(lower, "not allowed"):
		return "Запрос нарушает правила допустимого контента. Измените описание или исходные фото."
	case strings.Contains(lower, "sensitive"), strings.Contains(lower, "moderation"), strings.Contains(lower, "blocked"):
		return "Запрос заблокирован модерацией. Измените описание или исходные фото."
	case strings.Contains(lower, "invalid prompt"), strings.Contains(lower, "prompt too long"), strings.Contains(lower, "prompt is required"):
		return "Проверьте описание: оно обязательно и не должно превышать лимит символов."
	case strings.Contains(lower, "prompt"):
		return "Описание не подходит для генерации. Измените формулировку и попробуйте снова."
	case strings.Contains(lower, "timeout"), strings.Contains(lower, "timed out"), strings.Contains(lower, "deadline"):
		return "Превышено время ожидания генерации. Попробуйте ещё раз чуть позже."
	case strings.Contains(lower, "rate limit"), strings.Contains(lower, "too many requests"), strings.Contains(lower, "429"):
		return "Слишком много запросов. Подождите немного и попробуйте снова."
	case strings.Contains(lower, "credit"), strings.Contains(lower, "quota"), strings.Contains(lower, "balance"):
		return "Сервис генерации временно недоступен. Попробуйте позже."
	case strings.Contains(lower, "not configured"), strings.Contains(lower, "api key"):
		return "Сервис генерации временно недоступен. Обратитесь в поддержку."
	case strings.Contains(lower, "image upload"), strings.Contains(lower, "upload"), strings.Contains(lower, "source photo"), strings.Contains(lower, "upload_not_found"):
		return "Не удалось использовать исходное фото. Загрузите файл снова или выберите другое."
	case strings.Contains(lower, "at least 2 photos"), strings.Contains(lower, "combine"):
		return "Для режима комбинации нужно минимум 2 фото."
	case strings.Contains(lower, "download failed"), strings.Contains(lower, "no result"), strings.Contains(lower, "without result"):
		return "Сервис не вернул готовое изображение. Попробуйте ещё раз."
	case strings.Contains(lower, "insufficient ai media credits"), strings.Contains(lower, "insufficient tokens"):
		return "Недостаточно AI-кредитов или средств на кошельке."
	case strings.Contains(lower, "generation failed"), strings.Contains(lower, "failed to generate"), strings.Contains(lower, "could not return an image"):
		return "Не удалось сгенерировать изображение. Попробуйте изменить описание или параметры."
	case strings.Contains(lower, "internal error"), strings.Contains(lower, "server error"), strings.Contains(lower, "502"), strings.Contains(lower, "503"):
		return "Временная ошибка сервиса генерации. Попробуйте ещё раз позже."
	default:
		if isMostlyASCII(lower) && len(raw) > 12 {
			return "Не удалось сгенерировать изображение. Попробуйте изменить описание или исходные фото."
		}
		return raw
	}
}

var (
	reKieErrorPrefix   = regexp.MustCompile(`(?i)^kie error \d+:\s*`)
	reGenerationFailed = regexp.MustCompile(`(?i)^generation failed:\s*`)
	reProviderUpload   = regexp.MustCompile(`(?i)^kie image upload:\s*`)
)

func normalizeProviderError(raw string) string {
	raw = strings.TrimSpace(raw)
	raw = reKieErrorPrefix.ReplaceAllString(raw, "")
	raw = reGenerationFailed.ReplaceAllString(raw, "")
	raw = reProviderUpload.ReplaceAllString(raw, "")
	raw = strings.Trim(raw, ". ")
	return raw
}

func isMostlyASCII(s string) bool {
	if s == "" {
		return false
	}
	ascii := 0
	for _, r := range s {
		if r < 128 {
			ascii++
		}
	}
	return float64(ascii)/float64(len(s)) >= 0.85
}
