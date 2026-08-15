package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/postilka/postilka/internal/ai"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

type agentChatPayload struct {
	Reply        string             `json:"reply"`
	MissionPatch *agentMissionPatch `json:"mission_patch"`
	Plan         *model.MissionPlan `json:"plan"`
}

type agentMissionPatch struct {
	Title        string              `json:"title"`
	Goal         string              `json:"goal"`
	Metric       model.MissionMetric `json:"metric"`
	MetricTarget *int                `json:"metric_target"`
	Frequency    string              `json:"frequency"`
	ChannelIDs   []string            `json:"channel_ids"`
	Brief        *model.MissionBrief `json:"brief"`
}

func (s *MissionService) Chat(ctx context.Context, userID string, r *http.Request, missionID, message string) (*model.MissionChatResponse, error) {
	ws, err := s.resolve(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	message = strings.TrimSpace(message)
	if message == "" {
		return nil, fmt.Errorf("%w: сообщение пустое", ErrInvalidMission)
	}
	if utf8.RuneCountInString(message) > 8000 {
		return nil, fmt.Errorf("%w: сообщение слишком длинное", ErrInvalidMission)
	}
	mission, err := s.missions.Get(ctx, ws.ID, missionID)
	if err != nil {
		return nil, err
	}
	if mission.Status == model.MissionStatusCanceled || mission.Status == model.MissionStatusCompleted {
		return nil, fmt.Errorf("%w: эта задача уже закрыта", ErrMissionConflict)
	}

	userMsg, err := s.missions.InsertMessage(ctx, model.MissionMessage{
		WorkspaceID: ws.ID,
		MissionID:   mission.ID,
		Role:        "user",
		Content:     message,
	})
	if err != nil {
		return nil, err
	}

	client, cfg, err := s.yandex.Client(ctx)
	if err != nil {
		return nil, err
	}
	modelID := ModelForTask(cfg, "mission_agent")
	if modelID == "" {
		return nil, ErrYandexGptNotConfigured
	}

	tmplPrompt := ""
	if mission.AgentTemplateID != "" {
		if tmpl, tErr := s.templates.Get(ctx, mission.AgentTemplateID); tErr == nil {
			tmplPrompt = tmpl.Prompt
		}
	}
	history, err := s.missions.ListMessages(ctx, ws.ID, mission.ID, 24)
	if err != nil {
		return nil, err
	}
	channelHint, _ := s.channelHint(ctx, ws.ID, mission.ChannelIDs)
	fileHint, _ := s.fileHint(ctx, ws.ID)

	sys := strings.TrimSpace(tmplPrompt)
	if sys == "" {
		sys = defaultMissionAgentPrompt()
	}
	sys += "\n\nТекущая задача (JSON):\n" + missionSnapshot(mission) + "\nКаналы workspace:\n" + channelHint
	if fileHint != "" {
		sys += "\nФайлы workspace (можно ставить в file_ids только эти id):\n" + fileHint
	}

	chatMsgs := []ai.ChatMessage{{Role: "system", Content: sys}}
	for _, msg := range history {
		if msg.ID == userMsg.ID {
			continue
		}
		role := msg.Role
		if role != "user" && role != "assistant" {
			continue
		}
		chatMsgs = append(chatMsgs, ai.ChatMessage{Role: role, Content: msg.Content})
	}
	chatMsgs = append(chatMsgs, ai.ChatMessage{Role: "user", Content: message})

	result, err := client.Chat(ctx, modelID, chatMsgs)
	if err != nil {
		return nil, wrapYandexChatError(err)
	}
	payload, replyText := parseAgentChat(result.Content)
	if replyText == "" {
		replyText = "Не удалось разобрать ответ агента. Сформулируйте задачу ещё раз."
	}

	changed := false
	if payload != nil && payload.MissionPatch != nil {
		patch := payload.MissionPatch.toUpdateRequest()
		if patch.ChannelIDs != nil {
			filtered, fErr := s.filterWorkspaceChannels(ctx, ws.ID, patch.ChannelIDs)
			if fErr == nil {
				patch.ChannelIDs = filtered
			} else {
				patch.ChannelIDs = nil
			}
		}
		applyMissionPatch(mission, patch)
		changed = true
	}
	if payload != nil && payload.Plan != nil && len(payload.Plan.Items) > 0 {
		mission.Plan.Items = normalizePlanItems(payload.Plan.Items, mission, false)
		mission.Plan.ApprovedAt = nil
		if mission.Status == model.MissionStatusDraft || mission.Status == model.MissionStatusClarifying {
			mission.Status = model.MissionStatusPlanning
		}
		changed = true
	}
	if mission.Status == model.MissionStatusDraft {
		mission.Status = model.MissionStatusClarifying
		changed = true
	}
	if changed {
		updated, uErr := s.missions.Update(ctx, mission)
		if uErr != nil {
			return nil, uErr
		}
		mission = updated
	}

	tokens := result.TotalTokens
	if tokens <= 0 {
		tokens = estimateTextTokens(message) + estimateTextTokens(replyText)
	}
	_ = s.quota.RecordTextTokens(ctx, ws.ID, tokens)

	asst, err := s.missions.InsertMessage(ctx, model.MissionMessage{
		WorkspaceID: ws.ID,
		MissionID:   mission.ID,
		Role:        "assistant",
		Content:     replyText,
	})
	if err != nil {
		return nil, err
	}
	return &model.MissionChatResponse{Mission: mission, Reply: asst}, nil
}

func (s *MissionService) CreateDrafts(ctx context.Context, userID string, r *http.Request, missionID string) (*model.Mission, []model.Post, error) {
	ws, err := s.resolve(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, nil, err
	}
	mission, err := s.missions.Get(ctx, ws.ID, missionID)
	if err != nil {
		return nil, nil, err
	}
	if mission.Status == model.MissionStatusCanceled || mission.Status == model.MissionStatusCompleted {
		return nil, nil, fmt.Errorf("%w: задача закрыта", ErrMissionConflict)
	}
	if len(mission.Plan.Items) == 0 {
		return nil, nil, fmt.Errorf("%w: сначала составьте ход публикаций в чате", ErrInvalidMission)
	}

	created := make([]model.Post, 0, len(mission.Plan.Items))
	campaign := "mission-" + mission.ID
	if len(mission.ID) >= 8 {
		campaign = "mission-" + mission.ID[:8]
	}
	for i := range mission.Plan.Items {
		item := &mission.Plan.Items[i]
		if !planItemHasContent(*item) {
			continue
		}
		channelIDs := item.ChannelIDs
		if len(channelIDs) == 0 {
			channelIDs = mission.ChannelIDs
		}
		channels, err := s.channelsByIDs(ctx, ws.ID, channelIDs)
		if err != nil {
			return nil, nil, err
		}
		if len(channels) == 0 {
			return nil, nil, fmt.Errorf("%w: укажите каналы задачи", ErrInvalidMission)
		}
		item.Format = resolveItemFormat(item.Format, channels)
		item.MediaKind = normalizeMediaKind(item.MediaKind, item.Format, len(uniqueFileIDs(item.FileIDs)))
		item.FileIDs = s.filterWorkspaceFiles(ctx, ws.ID, item.FileIDs, item.MediaKind)
		if !formatAllowsURLButtons(item.Format) || !allChannelsAllowInlineButtons(channels) {
			item.Buttons = nil
		} else {
			item.Buttons = normalizePlanButtons(item.Buttons)
		}
		req := buildPlanDraftRequest(*item, channels, campaign, mission.Metric == model.MissionMetricClicks)
		sanitizePostSaveRequest(&req)
		if err := s.posts.validate(ctx, ws.ID, req, false); err != nil {
			return nil, nil, err
		}
		if item.PostID != "" {
			existing, gErr := s.posts.posts.Get(ctx, ws.ID, item.PostID)
			if gErr == nil && existing.Status == model.PostStatusDraft {
				updated, uErr := s.posts.posts.Update(ctx, ws.ID, item.PostID, req)
				if uErr != nil {
					return nil, nil, uErr
				}
				created = append(created, *updated)
				continue
			}
		}
		post, cErr := s.posts.CreateAgentDraft(ctx, ws.ID, userID, mission.ID, req)
		if cErr != nil {
			return nil, nil, cErr
		}
		item.PostID = post.ID
		created = append(created, *post)
	}
	if len(created) == 0 {
		return nil, nil, fmt.Errorf("%w: нет публикаций для черновиков", ErrInvalidMission)
	}
	mission.Status = model.MissionStatusPendingApproval
	updated, err := s.missions.Update(ctx, mission)
	if err != nil {
		return nil, nil, err
	}
	return updated, created, nil
}

func (s *MissionService) ApprovePlan(ctx context.Context, userID string, r *http.Request, missionID string) (*model.Mission, error) {
	ws, err := s.resolve(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	mission, err := s.missions.Get(ctx, ws.ID, missionID)
	if err != nil {
		return nil, err
	}
	if mission.Status == model.MissionStatusCanceled || mission.Status == model.MissionStatusCompleted {
		return nil, fmt.Errorf("%w: задача закрыта", ErrMissionConflict)
	}
	if len(mission.Plan.Items) == 0 {
		return nil, fmt.Errorf("%w: нет хода для утверждения", ErrInvalidMission)
	}

	now := time.Now().Add(time.Hour)
	for i := range mission.Plan.Items {
		item := &mission.Plan.Items[i]
		if item.PostID == "" {
			return nil, fmt.Errorf("%w: сначала создайте черновики", ErrInvalidMission)
		}
		post, gErr := s.posts.posts.Get(ctx, ws.ID, item.PostID)
		if gErr != nil {
			return nil, fmt.Errorf("%w: черновик хода не найден", ErrInvalidMission)
		}
		if err := ValidatePostForPublication(*post); err != nil {
			return nil, err
		}
		due := now.Add(time.Duration(i*24) * time.Hour)
		if item.DueAt != nil && item.DueAt.After(time.Now()) {
			due = item.DueAt.UTC()
		}
		if _, err := s.posts.ScheduleAgentPost(ctx, ws.ID, item.PostID, due); err != nil {
			return nil, err
		}
		item.DueAt = &due
	}
	approved := time.Now().UTC()
	mission.Plan.ApprovedAt = &approved
	mission.Plan.ManuallyChanged = false
	mission.Status = model.MissionStatusRunning
	return s.missions.Update(ctx, mission)
}

func (s *MissionService) channelHint(ctx context.Context, workspaceID string, selected []string) (string, error) {
	rows, err := s.channels.ListRowsByWorkspace(ctx, workspaceID)
	if err != nil {
		return "", err
	}
	sel := map[string]struct{}{}
	for _, id := range selected {
		sel[id] = struct{}{}
	}
	var b strings.Builder
	for _, row := range rows {
		ch := row.Channel
		mark := ""
		if _, ok := sel[ch.ID]; ok {
			mark = " [выбран]"
		}
		caps := model.PublishCapabilitiesForChannel(ch)
		fmt.Fprintf(&b, "- %s (%s) id=%s%s formats=%s photo=%v video=%v album=%v buttons=%v max_media=%d\n",
			ch.Name, ch.Provider.Label(), ch.ID, mark,
			strings.Join(caps.Formats, ","),
			caps.Photo || caps.ComposerMedia,
			caps.Video || caps.ComposerMedia,
			caps.MediaAlbum,
			caps.InlineButtons,
			caps.MaxMedia,
		)
	}
	if b.Len() == 0 {
		return "(каналы не подключены)", nil
	}
	return b.String(), nil
}

func (s *MissionService) fileHint(ctx context.Context, workspaceID string) (string, error) {
	if s.files == nil {
		return "", nil
	}
	images, err := s.files.List(ctx, repository.ListFilesFilter{
		WorkspaceID: workspaceID,
		ScopeAll:    true,
		TypeFilter:  "image",
		RecentOnly:  true,
		Limit:       12,
	})
	if err != nil {
		return "", err
	}
	videos, err := s.files.List(ctx, repository.ListFilesFilter{
		WorkspaceID: workspaceID,
		ScopeAll:    true,
		TypeFilter:  "video",
		RecentOnly:  true,
		Limit:       8,
	})
	if err != nil {
		return "", err
	}
	if len(images) == 0 && len(videos) == 0 {
		return "(в файлах пока нет фото и видео — укажите image_prompt или video_prompt, не выдумывайте file_ids)", nil
	}
	var b strings.Builder
	for _, f := range images {
		b.WriteString(fileHintLine(f))
		b.WriteByte('\n')
	}
	for _, f := range videos {
		b.WriteString(fileHintLine(f))
		b.WriteByte('\n')
	}
	return b.String(), nil
}

func missionSnapshot(m *model.Mission) string {
	raw, err := json.Marshal(map[string]any{
		"title":          m.Title,
		"goal":           m.Goal,
		"metric":         m.Metric,
		"metric_target":  m.MetricTarget,
		"status":         m.Status,
		"channel_ids":    m.ChannelIDs,
		"starts_at":      m.StartsAt,
		"ends_at":        m.EndsAt,
		"frequency":      m.Frequency,
		"brief":          m.Brief,
		"measurability":  m.Measurability,
		"plan_item_count": len(m.Plan.Items),
	})
	if err != nil {
		return "{}"
	}
	return string(raw)
}

func (p *agentMissionPatch) toUpdateRequest() model.MissionUpdateRequest {
	req := model.MissionUpdateRequest{}
	if t := strings.TrimSpace(p.Title); t != "" {
		req.Title = &t
	}
	if p.Goal != "" {
		g := p.Goal
		req.Goal = &g
	}
	if validMissionMetric(p.Metric) {
		m := p.Metric
		req.Metric = &m
	}
	req.MetricTarget = p.MetricTarget
	if p.Frequency != "" {
		f := p.Frequency
		req.Frequency = &f
	}
	if p.ChannelIDs != nil {
		req.ChannelIDs = p.ChannelIDs
	}
	req.Brief = p.Brief
	return req
}

func parseAgentChat(raw string) (*agentChatPayload, string) {
	text := strings.TrimSpace(raw)
	if text == "" {
		return nil, ""
	}
	candidate := text
	if i := strings.Index(text, "{"); i >= 0 {
		if j := strings.LastIndex(text, "}"); j > i {
			candidate = text[i : j+1]
		}
	}
	var payload agentChatPayload
	if err := json.Unmarshal([]byte(candidate), &payload); err != nil {
		return nil, text
	}
	reply := strings.TrimSpace(payload.Reply)
	if reply == "" {
		reply = text
	}
	return &payload, reply
}

func normalizePlanItems(items []model.MissionPlanItem, mission *model.Mission, keepPostIDs bool) []model.MissionPlanItem {
	out := make([]model.MissionPlanItem, 0, len(items))
	base := time.Now().Add(24 * time.Hour)
	if mission.StartsAt != nil && mission.StartsAt.After(time.Now()) {
		base = *mission.StartsAt
	}
	for i, item := range items {
		if !planItemHasContent(item) {
			continue
		}
		role := item.Role
		if role == "" {
			role = model.MissionPlanRoleAttention
		}
		due := item.DueAt
		if due == nil {
			t := base.Add(time.Duration(i*24) * time.Hour)
			due = &t
		}
		channels := item.ChannelIDs
		if len(channels) == 0 {
			channels = mission.ChannelIDs
		}
		format := mapStoredPostFormat(item.Format)
		fileIDs := uniqueFileIDs(item.FileIDs)
		kind := normalizeMediaKind(item.MediaKind, format, len(fileIDs))
		buttons := normalizePlanButtons(item.Buttons)
		if !formatAllowsURLButtons(format) {
			buttons = nil
		}
		next := model.MissionPlanItem{
			Role:        role,
			DueAt:       due,
			ChannelIDs:  channels,
			Text:        strings.TrimSpace(item.Text),
			Title:       strings.TrimSpace(item.Title),
			Format:      format,
			FileIDs:     fileIDs,
			MediaKind:   kind,
			ImagePrompt: strings.TrimSpace(item.ImagePrompt),
			VideoPrompt: strings.TrimSpace(item.VideoPrompt),
			Buttons:     buttons,
		}
		if keepPostIDs {
			next.PostID = strings.TrimSpace(item.PostID)
		}
		out = append(out, next)
	}
	return out
}

func defaultMissionAgentPrompt() string {
	return missionAgentSystemPrompt
}

const missionAgentSystemPrompt = `Ты Ai агент внутри Postilka. Ты ведёшь пользователя по пути:
задача → цель и показатель → продукт и аудитория → наблюдения по данным проекта → проверяемые замыслы → связный ход публикаций → материалы → разрешение → запуск → разбор результата.

Правила:
- Отвечай по-русски, кратко и по делу.
- Не публикуй посты в сети. Ты только уточняешь задачу, предлагаешь ход и готовишь черновики.
- Новые варианты — черновики. Публикация и изменение утверждённого хода требуют явного разрешения человека.
- Не объявляй причинность по одному результату. Разделяй: наблюдение, предположение, подтверждённая закономерность, недостаточно данных.
- Публикации в ходе имеют роли: внимание, проблема, доказательство, выбор, снятие сомнения, действие.
- Используй только каналы, форматы и файлы из контекста. Не выдумывай метрики, подписчиков и file_ids.
- Если данных мало — скажи об этом и задай один-два уточняющих вопроса.
- Каждый пункт хода — полноценный пост, как в композере: вид контента, текст, фото/видео, кнопки если канал умеет.
- format бери только из formats канала. Для VK wall_post пиши format="message". Для Telegram Business story — только story.
- Чередуй форматы, если каналы это позволяют: не делай все пункты обычными постами.
- media_kind: none | photo | video | album. file_ids — только id из списка файлов workspace. Если подходящего файла нет — оставь file_ids пустым и заполни image_prompt или video_prompt; не вызывай генерацию сам.
- buttons — только URL-кнопки (text+url), и только если у ВСЕХ выбранных каналов пункта buttons=true и format это message, rich_message или article. Иначе buttons=[].
- Не предлагай кнопки для story, video, shorts, short_video.

Формат ответа: только JSON-объект без markdown:
{
  "reply": "текст пользователю",
  "mission_patch": null или {
    "title": "",
    "goal": "",
    "metric": "clicks|likes|reach|subscribers|manual",
    "metric_target": 0,
    "frequency": "",
    "brief": {"product": "", "audience": "", "observations": ""}
  },
  "plan": null или {
    "items": [
      {
        "role": "attention|problem|proof|choice|objection|action",
        "due_at": "RFC3339",
        "channel_ids": ["uuid"],
        "format": "message|rich_message|article|story|short_video|video|shorts",
        "title": "для video/shorts",
        "text": "текст или подпись",
        "media_kind": "none|photo|video|album",
        "file_ids": [],
        "image_prompt": "",
        "video_prompt": "",
        "buttons": [{"text": "Открыть", "url": "https://example.com"}]
      }
    ]
  }
}
Поле plan заполняй, только когда пользователь просит составить ход или данных уже достаточно. mission_patch — только изменённые поля.`

