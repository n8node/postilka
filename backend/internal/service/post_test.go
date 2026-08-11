package service

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/postilka/postilka/internal/model"
)

func TestValidatePostContentRejectsUnsafeHTML(t *testing.T) {
	err := ValidatePostContent(model.PostContent{
		Format: "message", Text: "<script>alert(1)</script>", ParseMode: "HTML",
	}, model.PostSettings{})
	if !errors.Is(err, ErrInvalidPost) {
		t.Fatalf("expected ErrInvalidPost, got %v", err)
	}
}

func TestValidatePostContentAllowsOnlyExpandableBlockquoteAttribute(t *testing.T) {
	valid := model.PostContent{
		Format: "message", Text: "<blockquote expandable>Текст</blockquote>", ParseMode: "HTML",
	}
	if err := ValidatePostContent(valid, model.PostSettings{}); err != nil {
		t.Fatalf("expected expandable blockquote to be valid: %v", err)
	}
	invalid := valid
	invalid.Text = `<blockquote class="other">Текст</blockquote>`
	if err := ValidatePostContent(invalid, model.PostSettings{}); !errors.Is(err, ErrInvalidPost) {
		t.Fatalf("expected arbitrary blockquote attribute rejection, got %v", err)
	}
}

func TestValidateTelegramRichMessage(t *testing.T) {
	message := model.TelegramRichMessage{
		Title: "Заголовок",
		Blocks: []model.TelegramRichBlock{
			{Type: "paragraph", Text: "Новая публикация"},
			{Type: "heading", Text: "Раздел", Size: 2},
			{Type: "code", Text: "fmt.Println()", Language: "go"},
			{Type: "quote", Text: "Цитата", Credit: "Автор"},
			{Type: "footer", Text: "Подвал"},
			{Type: "divider"},
			{Type: "list", Items: []model.TelegramRichListItem{{
				Blocks: []model.TelegramRichBlock{{Type: "paragraph", Text: "Пункт"}},
			}}},
			{Type: "pullquote", Text: "Акцент", Credit: "Источник"},
			{Type: "details", Summary: "Подробнее", IsOpen: true,
				Blocks: []model.TelegramRichBlock{{Type: "paragraph", Text: "Детали"}}},
			{Type: "table", Bordered: true, Striped: true, Rows: [][]model.TelegramRichTableCell{{
				{Text: "Ячейка", Align: "left", VAlign: "top"},
			}}},
			{Type: "mathematical_expression", Expression: "x^2"},
		},
		Buttons: [][]model.TelegramInlineButton{{
			{Text: "Открыть", Style: model.TelegramButtonPrimary, URL: "https://postilka.ru"},
		}},
	}
	if err := ValidateTelegramRichMessage(message); err != nil {
		t.Fatalf("unexpected validation error: %v", err)
	}
	blocks, err := telegramRichAPIBlocks(message)
	if err != nil {
		t.Fatalf("unexpected conversion error: %v", err)
	}
	raw, err := json.Marshal(map[string]any{"blocks": blocks})
	if err != nil {
		t.Fatal(err)
	}
	payload := string(raw)
	for _, expected := range []string{
		`"text":"Заголовок"`, `"size":1`,
		`"type":"pre"`, `"type":"blockquote"`, `"type":"list"`,
		`"type":"details"`, `"align":"left"`, `"valign":"top"`,
		`"type":"mathematical_expression"`,
	} {
		if !strings.Contains(payload, expected) {
			t.Fatalf("converted payload does not contain %s: %s", expected, payload)
		}
	}
	if strings.Contains(payload, `"title"`) || strings.Contains(payload, `"type":"code"`) {
		t.Fatalf("payload contains editor-only rich fields: %s", payload)
	}
}

func TestValidateTelegramButtonRequiresOneAction(t *testing.T) {
	err := ValidateTelegramRichMessage(model.TelegramRichMessage{
		Blocks: []model.TelegramRichBlock{{Type: "paragraph", Text: "Текст"}},
		Buttons: [][]model.TelegramInlineButton{{
			{Text: "Ошибка", URL: "https://postilka.ru", CallbackData: "open"},
		}},
	})
	if !errors.Is(err, ErrInvalidPost) {
		t.Fatalf("expected ErrInvalidPost, got %v", err)
	}
}

func TestValidateTelegramRichMessageRejectsUndeliverableBlocks(t *testing.T) {
	for _, blockType := range []string{"thinking", "media"} {
		err := ValidateTelegramRichMessage(model.TelegramRichMessage{
			Blocks: []model.TelegramRichBlock{{Type: blockType, Text: "Недоступно"}},
		})
		if !errors.Is(err, ErrInvalidPost) {
			t.Fatalf("expected %s block rejection, got %v", blockType, err)
		}
	}
}

func TestTelegramReplyMarkupUsesExplicitActions(t *testing.T) {
	markup := telegramReplyMarkup([][]model.TelegramInlineButton{{
		{Text: "Копировать", Style: model.TelegramButtonSuccess, CopyText: "POSTILKA"},
		{Text: "Приложение", Style: model.TelegramButtonDefault,
			IconCustomEmojiID: "5368324170671202286", WebAppURL: "https://postilka.ru/app"},
	}})
	if markup == nil || len(markup.InlineKeyboard) != 1 || len(markup.InlineKeyboard[0]) != 2 {
		t.Fatalf("unexpected markup: %#v", markup)
	}
	if markup.InlineKeyboard[0][0].CopyText == nil || markup.InlineKeyboard[0][0].CopyText.Text != "POSTILKA" {
		t.Fatalf("copy_text was not converted")
	}
	if markup.InlineKeyboard[0][1].WebApp == nil || markup.InlineKeyboard[0][1].WebApp.URL == "" {
		t.Fatalf("web_app was not converted")
	}
	if markup.InlineKeyboard[0][1].Style != "" ||
		markup.InlineKeyboard[0][1].IconCustomEmojiID != "5368324170671202286" {
		t.Fatalf("default style or icon_custom_emoji_id conversion is incorrect")
	}
}

func TestDecodePostTargetSettingsAndPlainText(t *testing.T) {
	raw := json.RawMessage(`{
		"detached": true,
		"content": {"text":"<b>Канал</b> <a href=\"https://postilka.ru\">ссылка</a>","parse_mode":"HTML"},
		"settings": {"utm":{"source":"telegram","medium":"social","campaign":"Летняя кампания","shorten":true}}
	}`)
	target, err := DecodePostTargetSettings(raw)
	if err != nil {
		t.Fatalf("unexpected target settings error: %v", err)
	}
	content, settings := mergePostTarget(model.PostContent{Text: "Общий"}, model.PostSettings{}, target)
	if got := readableProviderText(content); got != "Канал ссылка (https://postilka.ru)" {
		t.Fatalf("unexpected readable provider text: %q", got)
	}
	if settings.UTM == nil || settings.UTM.Source != "telegram" || !settings.UTM.Shorten {
		t.Fatalf("UTM target override was not merged: %#v", settings.UTM)
	}
	if err := validatePostSettings(settings); err != nil {
		t.Fatalf("valid UTM settings rejected: %v", err)
	}
	if err := validatePostSettings(model.PostSettings{
		UTM: &model.PostUTMSettings{Campaign: "unsafe&campaign"},
	}); !errors.Is(err, ErrInvalidPost) {
		t.Fatalf("expected unsafe UTM rejection, got %v", err)
	}
	if _, err := DecodePostTargetSettings(json.RawMessage(`{"unknown":true}`)); !errors.Is(err, ErrInvalidPost) {
		t.Fatalf("expected unknown target setting rejection, got %v", err)
	}
}

func TestTelegramMediaPayloadHasNoCaption(t *testing.T) {
	media := []TelegramMediaInput{
		{Type: TelegramMediaPhoto, URL: "https://storage.example/photo.jpg?signature=secret"},
		{Type: TelegramMediaVideo, URL: "https://storage.example/video.mp4?signature=secret"},
	}
	if err := validateTelegramMedia(media); err != nil {
		t.Fatalf("unexpected media validation error: %v", err)
	}
	payload := telegramMediaGroupPayload(media, nil)
	if len(payload) != 2 || payload[0]["type"] != "photo" || payload[1]["type"] != "video" {
		t.Fatalf("unexpected media payload: %#v", payload)
	}
	for _, item := range payload {
		if _, exists := item["caption"]; exists {
			t.Fatalf("media payload must not duplicate post text as caption")
		}
	}
	captionPayload := telegramMediaGroupPayload(media, &TelegramMediaSendOptions{
		Caption:               "Подпись",
		ParseMode:             "HTML",
		ShowCaptionAboveMedia: true,
	})
	if captionPayload[0]["caption"] != "Подпись" {
		t.Fatalf("expected caption on first media item: %#v", captionPayload[0])
	}
	if captionPayload[0]["show_caption_above_media"] != true {
		t.Fatalf("expected show_caption_above_media: %#v", captionPayload[0])
	}
	sanitized := safePublishError(errors.New("request failed for " + media[0].URL))
	if strings.Contains(sanitized, "signature=secret") || !strings.Contains(sanitized, "ссылка скрыта") {
		t.Fatalf("signed URL was not sanitized: %s", sanitized)
	}
}

func TestApplyUTMToRawAndHTMLURLs(t *testing.T) {
	utm := &model.PostUTMSettings{
		Source: "telegram", Medium: "social", Campaign: "sale", Shorten: true,
	}
	content := model.PostContent{
		Format: "message",
		Text: `Сайт https://example.com/path?old=1#part, ` +
			`<a href="https://example.org/?utm_source=old&amp;x=1#details">ссылка</a> ` +
			`tg://resolve?domain=postilka.`,
		ParseMode: "HTML",
	}
	rewritten := ApplyUTMToContent(content, utm)
	expectedRaw := "https://example.com/path?old=1&utm_campaign=sale&utm_medium=social&utm_source=telegram#part,"
	if !strings.Contains(rewritten.Text, expectedRaw) {
		t.Fatalf("raw URL was not rewritten safely: %s", rewritten.Text)
	}
	expectedHref := `href="https://example.org/?utm_campaign=sale&amp;utm_medium=social&amp;utm_source=telegram&amp;x=1#details"`
	if !strings.Contains(rewritten.Text, expectedHref) {
		t.Fatalf("HTML href was not rewritten safely: %s", rewritten.Text)
	}
	if !strings.Contains(rewritten.Text, "tg://resolve?domain=postilka.") {
		t.Fatalf("unsupported scheme was unexpectedly rewritten: %s", rewritten.Text)
	}
	if strings.Contains(rewritten.Text, "utm_source=old") || strings.Contains(rewritten.Text, "short") {
		t.Fatalf("UTM overwrite or shorten behavior is incorrect: %s", rewritten.Text)
	}
	if content.Text == rewritten.Text {
		t.Fatalf("expected an in-memory rewritten copy")
	}
}

func TestApplyUTMToNestedRichBlocks(t *testing.T) {
	utm := &model.PostUTMSettings{Source: "telegram"}
	original := model.PostContent{
		Format: "article",
		RichMessage: &model.TelegramRichMessage{
			Title: "Title https://title.example",
			Blocks: []model.TelegramRichBlock{
				{Type: "quote", Text: "Quote https://quote.example", Credit: "https://credit.example"},
				{Type: "list", Items: []model.TelegramRichListItem{{
					Blocks: []model.TelegramRichBlock{{
						Type: "paragraph", Text: "Item https://item.example",
					}},
				}}},
				{Type: "details", Summary: "https://summary.example", Blocks: []model.TelegramRichBlock{{
					Type: "paragraph", Text: "Detail https://detail.example",
				}}},
				{Type: "table", Rows: [][]model.TelegramRichTableCell{{{
					Text: "Cell https://cell.example",
				}}}},
			},
		},
	}
	rewritten := ApplyUTMToContent(original, utm)
	raw, err := json.Marshal(rewritten.RichMessage)
	if err != nil {
		t.Fatal(err)
	}
	for _, host := range []string{
		"title.example", "quote.example", "credit.example", "item.example",
		"summary.example", "detail.example", "cell.example",
	} {
		if !strings.Contains(string(raw), host) {
			t.Fatalf("nested rich URL was not rewritten: %s", raw)
		}
	}
	if strings.Count(string(raw), "utm_source=telegram") != 7 {
		t.Fatalf("not every nested rich URL received UTM: %s", raw)
	}
	if strings.Contains(original.RichMessage.Title, "utm_source") ||
		strings.Contains(original.RichMessage.Blocks[1].Items[0].Blocks[0].Text, "utm_source") {
		t.Fatalf("source rich content was mutated")
	}
}
