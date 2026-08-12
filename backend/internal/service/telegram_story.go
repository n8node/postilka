package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"github.com/postilka/postilka/internal/model"
)

var telegramStoryAllowedPeriods = map[int]bool{
	model.TelegramStoryPeriod6h:  true,
	model.TelegramStoryPeriod12h: true,
	model.TelegramStoryPeriod24h: true,
	model.TelegramStoryPeriod48h: true,
}

var telegramStoryReactionEmojis = map[string]bool{
	"❤": true, "👍": true, "👎": true, "🔥": true, "🥰": true, "👏": true, "😁": true,
	"🤔": true, "🤯": true, "😱": true, "🤬": true, "😢": true, "🎉": true, "🤩": true,
	"🤮": true, "💩": true, "🙏": true, "👌": true, "🕊": true, "🤡": true, "🥱": true,
	"🥴": true, "😍": true, "🐳": true, "❤‍🔥": true, "🌚": true, "🌭": true, "💯": true,
	"🤣": true, "⚡": true, "🍌": true, "🏆": true, "💔": true, "🤨": true, "😐": true,
	"🍓": true, "🍾": true, "💋": true, "🖕": true, "😈": true, "😴": true, "😭": true,
	"🤓": true, "👻": true, "👨‍💻": true, "👀": true, "🎃": true, "🙈": true, "😇": true,
	"😨": true, "🤝": true, "✍": true, "🤗": true, "🫡": true, "🎅": true, "🎄": true,
	"☃": true, "💅": true, "🤪": true, "🗿": true, "🆒": true, "💘": true, "🙉": true,
	"🦄": true, "😘": true, "💊": true, "🙊": true, "😎": true, "👾": true, "🤷‍♂": true,
	"🤷": true, "🤷‍♀": true, "😡": true,
}

const (
	telegramStoryMaxLinks     = 3
	telegramStoryMaxLocations = 10
	telegramStoryMaxReactions = 5
	telegramStoryMaxWeather   = 3
)

func telegramStoryActivePeriod(settings *model.TelegramStorySettings) int {
	if settings == nil || settings.ActivePeriod <= 0 {
		return model.TelegramStoryPeriod24h
	}
	if telegramStoryAllowedPeriods[settings.ActivePeriod] {
		return settings.ActivePeriod
	}
	return model.TelegramStoryPeriod24h
}

func validateTelegramStorySettings(story *model.TelegramStorySettings) error {
	if story == nil {
		return nil
	}
	if story.ActivePeriod != 0 && !telegramStoryAllowedPeriods[story.ActivePeriod] {
		return fmt.Errorf("%w: срок истории должен быть 6, 12, 24 или 48 часов", ErrInvalidPost)
	}
	var links, locations, reactions, weather int
	for i, area := range story.Areas {
		kind := strings.ToLower(strings.TrimSpace(area.Kind))
		switch kind {
		case "link":
			links++
			if links > telegramStoryMaxLinks {
				return fmt.Errorf("%w: в истории можно не более %d ссылок", ErrInvalidPost, telegramStoryMaxLinks)
			}
			raw := strings.TrimSpace(area.URL)
			if raw == "" {
				return fmt.Errorf("%w: у зоны ссылки #%d не указан URL", ErrInvalidPost, i+1)
			}
			parsed, err := url.Parse(raw)
			if err != nil || parsed.Scheme != "http" && parsed.Scheme != "https" && parsed.Scheme != "tg" {
				return fmt.Errorf("%w: некорректный URL зоны ссылки #%d", ErrInvalidPost, i+1)
			}
			if parsed.Host == "" {
				return fmt.Errorf("%w: у зоны ссылки #%d укажите полный URL с доменом", ErrInvalidPost, i+1)
			}
		case "location":
			locations++
			if locations > telegramStoryMaxLocations {
				return fmt.Errorf("%w: в истории можно не более %d геометок", ErrInvalidPost, telegramStoryMaxLocations)
			}
			if area.Latitude < -90 || area.Latitude > 90 || area.Longitude < -180 || area.Longitude > 180 {
				return fmt.Errorf("%w: некорректные координаты геометки #%d", ErrInvalidPost, i+1)
			}
		case "suggested_reaction", "reaction":
			reactions++
			if reactions > telegramStoryMaxReactions {
				return fmt.Errorf("%w: в истории можно не более %d реакций", ErrInvalidPost, telegramStoryMaxReactions)
			}
			emoji := strings.TrimSpace(area.ReactionEmoji)
			if emoji == "" || !telegramStoryReactionEmojis[emoji] {
				return fmt.Errorf("%w: выберите поддерживаемую реакцию для зоны #%d", ErrInvalidPost, i+1)
			}
		case "weather":
			weather++
			if weather > telegramStoryMaxWeather {
				return fmt.Errorf("%w: в истории можно не более %d виджетов погоды", ErrInvalidPost, telegramStoryMaxWeather)
			}
			if strings.TrimSpace(area.WeatherEmoji) == "" {
				return fmt.Errorf("%w: у виджета погоды #%d не указан emoji", ErrInvalidPost, i+1)
			}
		default:
			return fmt.Errorf("%w: неизвестный тип зоны истории: %s", ErrInvalidPost, area.Kind)
		}
		if err := validateStoryAreaPosition(area.Position); err != nil {
			return err
		}
	}
	return nil
}

func validateStoryAreaPosition(pos model.TelegramStoryAreaPosition) error {
	if pos.WidthPercentage <= 0 || pos.HeightPercentage <= 0 {
		return fmt.Errorf("%w: размер зоны на истории должен быть больше нуля", ErrInvalidPost)
	}
	if pos.XPercentage < 0 || pos.XPercentage > 100 || pos.YPercentage < 0 || pos.YPercentage > 100 {
		return fmt.Errorf("%w: зона истории выходит за пределы медиа", ErrInvalidPost)
	}
	if pos.RotationAngle < 0 || pos.RotationAngle > 360 {
		return fmt.Errorf("%w: некорректный угол поворота зоны истории", ErrInvalidPost)
	}
	return nil
}

func normalizeStoryAreaPosition(pos model.TelegramStoryAreaPosition) model.TelegramStoryAreaPosition {
	if pos.CornerRadiusPercentage <= 0 {
		pos.CornerRadiusPercentage = 8
	}
	return pos
}

// storyAreaPositionForAPI converts top-left rectangle coordinates (UI/editor)
// to center-based coordinates required by Telegram StoryAreaPosition.
func storyAreaPositionForAPI(pos model.TelegramStoryAreaPosition) model.TelegramStoryAreaPosition {
	pos = normalizeStoryAreaPosition(pos)
	pos.XPercentage += pos.WidthPercentage / 2
	pos.YPercentage += pos.HeightPercentage / 2
	return pos
}

type telegramStoryAreaAPI struct {
	Position model.TelegramStoryAreaPosition `json:"position"`
	Type     any                             `json:"type"`
}

func buildTelegramStoryAreasJSON(areas []model.TelegramStoryArea) (string, error) {
	if len(areas) == 0 {
		return "", nil
	}
	out := make([]telegramStoryAreaAPI, 0, len(areas))
	for _, area := range areas {
		pos := storyAreaPositionForAPI(area.Position)
		kind := strings.ToLower(strings.TrimSpace(area.Kind))
		if kind == "reaction" {
			kind = "suggested_reaction"
		}
		var areaType any
		switch kind {
		case "link":
			areaType = map[string]string{
				"type": "link",
				"url":  strings.TrimSpace(area.URL),
			}
		case "location":
			payload := map[string]any{
				"type":      "location",
				"latitude":  area.Latitude,
				"longitude": area.Longitude,
			}
			if area.Address != nil {
				addr := map[string]string{}
				if cc := strings.TrimSpace(area.Address.CountryCode); cc != "" {
					addr["country_code"] = cc
				}
				if v := strings.TrimSpace(area.Address.State); v != "" {
					addr["state"] = v
				}
				if v := strings.TrimSpace(area.Address.City); v != "" {
					addr["city"] = v
				}
				if v := strings.TrimSpace(area.Address.Street); v != "" {
					addr["street"] = v
				}
				if len(addr) > 0 {
					if _, ok := addr["country_code"]; !ok {
						addr["country_code"] = "RU"
					}
					payload["address"] = addr
				}
			}
			areaType = payload
		case "suggested_reaction":
			reactionType := map[string]string{
				"type":  "emoji",
				"emoji": strings.TrimSpace(area.ReactionEmoji),
			}
			payload := map[string]any{
				"type":          "suggested_reaction",
				"reaction_type": reactionType,
			}
			if area.ReactionDark {
				payload["is_dark"] = true
			}
			if area.ReactionFlipped {
				payload["is_flipped"] = true
			}
			areaType = payload
		case "weather":
			bg := area.BackgroundColor
			if bg == 0 {
				bg = 0xCC1E1E1E
			}
			areaType = map[string]any{
				"type":             "weather",
				"temperature":      area.Temperature,
				"emoji":            strings.TrimSpace(area.WeatherEmoji),
				"background_color": bg,
			}
		default:
			continue
		}
		out = append(out, telegramStoryAreaAPI{Position: pos, Type: areaType})
	}
	if len(out) == 0 {
		return "", nil
	}
	raw, err := json.Marshal(out)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

func applyUTMToStoryAreas(areas []model.TelegramStoryArea, utm *model.PostUTMSettings) []model.TelegramStoryArea {
	if utm == nil {
		return areas
	}
	out := make([]model.TelegramStoryArea, len(areas))
	copy(out, areas)
	for i := range out {
		if strings.ToLower(strings.TrimSpace(out[i].Kind)) != "link" {
			continue
		}
		out[i].URL = rewriteAbsoluteURL(out[i].URL, utm)
	}
	return out
}

func shortenTelegramStoryAreas(
	ctx context.Context,
	areas []model.TelegramStoryArea,
	shortener *LinkShortenerService,
	workspaceID, postID, targetID, channelID string,
	utm *model.PostUTMSettings,
) ([]model.TelegramStoryArea, error) {
	if shortener == nil || utm == nil || !utm.Shorten || len(areas) == 0 {
		return areas, nil
	}
	lctx := linkShortenContext{
		workspaceID: workspaceID,
		postID:      postID,
		targetID:    targetID,
		channelID:   channelID,
		shortener:   shortener,
		cache:       map[string]string{},
	}
	out := make([]model.TelegramStoryArea, len(areas))
	copy(out, areas)
	for i := range out {
		if strings.ToLower(strings.TrimSpace(out[i].Kind)) != "link" {
			continue
		}
		raw := strings.TrimSpace(out[i].URL)
		if raw == "" {
			continue
		}
		rewritten, err := shortenAbsoluteURL(ctx, raw, utm, lctx)
		if err != nil {
			return nil, err
		}
		out[i].URL = rewritten
	}
	return out, nil
}

func mergeTargetUTM(base *model.PostUTMSettings, target *model.PostTargetSettings) *model.PostUTMSettings {
	if target != nil && target.Settings != nil && target.Settings.UTM != nil {
		return target.Settings.UTM
	}
	return base
}
