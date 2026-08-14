package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrInvalidMission  = errors.New("invalid mission")
	ErrMissionConflict = errors.New("mission conflict")
)

type MissionService struct {
	missions   *repository.MissionRepository
	templates  *repository.AgentTemplateRepository
	posts      *PostService
	channels   *repository.ChannelRepository
	files      *repository.WorkspaceFileRepository
	workspaces *WorkspaceService
	yandex     *YandexGptConfigService
	quota      *QuotaService
}

func NewMissionService(
	missions *repository.MissionRepository,
	templates *repository.AgentTemplateRepository,
	posts *PostService,
	channels *repository.ChannelRepository,
	files *repository.WorkspaceFileRepository,
	workspaces *WorkspaceService,
	yandex *YandexGptConfigService,
	quota *QuotaService,
) *MissionService {
	return &MissionService{
		missions: missions, templates: templates, posts: posts,
		channels: channels, files: files, workspaces: workspaces, yandex: yandex, quota: quota,
	}
}

func (s *MissionService) resolve(ctx context.Context, userID string, r *http.Request, role model.WorkspaceRole) (*model.Workspace, error) {
	ws, _, err := s.workspaces.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if ws == nil {
		return nil, ErrNoPrimaryWS
	}
	if _, err := s.workspaces.RequireMembership(ctx, userID, ws.ID, role); err != nil {
		return nil, err
	}
	return ws, nil
}

func (s *MissionService) ListTemplates(ctx context.Context, userID string, r *http.Request) ([]model.AgentTemplate, error) {
	ws, err := s.resolve(ctx, userID, r, model.RoleViewer)
	if err != nil {
		return nil, err
	}
	return s.templates.ListAvailable(ctx, ws.ID)
}

func (s *MissionService) CreateUserTemplate(ctx context.Context, userID string, r *http.Request, req model.AgentTemplateSaveRequest) (*model.AgentTemplate, error) {
	ws, err := s.resolve(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	name := strings.TrimSpace(req.Name)
	prompt := strings.TrimSpace(req.Prompt)
	if name == "" || prompt == "" {
		return nil, fmt.Errorf("%w: укажите название и промпт шаблона", ErrInvalidMission)
	}
	if utf8.RuneCountInString(prompt) > 20000 {
		return nil, fmt.Errorf("%w: промпт слишком длинный", ErrInvalidMission)
	}
	requireApproval := true
	if req.RequireApproval != nil {
		requireApproval = *req.RequireApproval
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	tools := req.Tools
	if len(tools) == 0 {
		tools = []string{"update_mission", "propose_plan"}
	}
	slug := strings.TrimSpace(req.Slug)
	if slug == "" {
		slug = repository.UniqueTemplateSlug(name, time.Now())
	}
	return s.templates.CreateUser(ctx, ws.ID, userID, model.AgentTemplate{
		Name:            name,
		Description:     strings.TrimSpace(req.Description),
		Prompt:          prompt,
		Slug:            slug,
		Tools:           tools,
		Settings:        req.Settings,
		RequireApproval: requireApproval,
		IsActive:        isActive,
	})
}

func (s *MissionService) UpdateUserTemplate(ctx context.Context, userID string, r *http.Request, id string, req model.AgentTemplateSaveRequest) (*model.AgentTemplate, error) {
	ws, err := s.resolve(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	existing, err := s.templates.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing.Kind != model.AgentTemplateKindUser || existing.WorkspaceID != ws.ID {
		return nil, repository.ErrNotFound
	}
	if name := strings.TrimSpace(req.Name); name != "" {
		existing.Name = name
	}
	if prompt := strings.TrimSpace(req.Prompt); prompt != "" {
		existing.Prompt = prompt
	}
	existing.Description = strings.TrimSpace(req.Description)
	if req.RequireApproval != nil {
		existing.RequireApproval = *req.RequireApproval
	}
	if req.IsActive != nil {
		existing.IsActive = *req.IsActive
	}
	if len(req.Tools) > 0 {
		existing.Tools = req.Tools
	}
	existing.Settings = req.Settings
	return s.templates.Update(ctx, existing)
}

func (s *MissionService) DeleteUserTemplate(ctx context.Context, userID string, r *http.Request, id string) error {
	ws, err := s.resolve(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return err
	}
	return s.templates.DeleteUser(ctx, ws.ID, id)
}

func (s *MissionService) ListAdminTemplates(ctx context.Context) ([]model.AgentTemplate, error) {
	return s.templates.ListSystem(ctx)
}

func (s *MissionService) UpdateAdminTemplate(ctx context.Context, id string, req model.AgentTemplateSaveRequest) (*model.AgentTemplate, error) {
	existing, err := s.templates.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing.Kind != model.AgentTemplateKindSystem {
		return nil, repository.ErrNotFound
	}
	if name := strings.TrimSpace(req.Name); name != "" {
		existing.Name = name
	}
	if prompt := strings.TrimSpace(req.Prompt); prompt != "" {
		existing.Prompt = prompt
	}
	existing.Description = strings.TrimSpace(req.Description)
	if req.RequireApproval != nil {
		existing.RequireApproval = *req.RequireApproval
	}
	if req.IsActive != nil {
		existing.IsActive = *req.IsActive
	}
	if len(req.Tools) > 0 {
		existing.Tools = req.Tools
	}
	existing.Settings = req.Settings
	return s.templates.Update(ctx, existing)
}

func (s *MissionService) List(ctx context.Context, userID string, r *http.Request, filter repository.MissionListFilter) ([]model.Mission, int, error) {
	ws, err := s.resolve(ctx, userID, r, model.RoleViewer)
	if err != nil {
		return nil, 0, err
	}
	filter.WorkspaceID = ws.ID
	return s.missions.List(ctx, filter)
}

func (s *MissionService) Get(ctx context.Context, userID string, r *http.Request, id string) (*model.Mission, []model.MissionMessage, []model.Post, error) {
	ws, err := s.resolve(ctx, userID, r, model.RoleViewer)
	if err != nil {
		return nil, nil, nil, err
	}
	mission, err := s.missions.Get(ctx, ws.ID, id)
	if err != nil {
		return nil, nil, nil, err
	}
	msgs, err := s.missions.ListMessages(ctx, ws.ID, id, 80)
	if err != nil {
		return nil, nil, nil, err
	}
	posts, _, err := s.posts.posts.List(ctx, repository.PostListFilter{
		WorkspaceID: ws.ID,
		MissionID:   id,
		Limit:       100,
	})
	if err != nil {
		return nil, nil, nil, err
	}
	return mission, msgs, posts, nil
}

func (s *MissionService) Create(ctx context.Context, userID string, r *http.Request, req model.MissionCreateRequest) (*model.Mission, error) {
	ws, err := s.resolve(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	title := strings.TrimSpace(req.Title)
	if title == "" {
		return nil, fmt.Errorf("%w: укажите название задачи", ErrInvalidMission)
	}
	tmpl, err := s.templates.GetUsable(ctx, ws.ID, strings.TrimSpace(req.AgentTemplateID))
	if err != nil {
		return nil, fmt.Errorf("%w: шаблон агента не найден", ErrInvalidMission)
	}
	metric := req.Metric
	if metric == "" {
		metric = model.MissionMetricClicks
	}
	if !validMissionMetric(metric) {
		return nil, fmt.Errorf("%w: неизвестный показатель", ErrInvalidMission)
	}
	channels, err := s.filterWorkspaceChannels(ctx, ws.ID, req.ChannelIDs)
	if err != nil {
		return nil, err
	}
	m := &model.Mission{
		WorkspaceID:     ws.ID,
		AgentTemplateID: tmpl.ID,
		CreatedByUserID: userID,
		Title:           title,
		Goal:            strings.TrimSpace(req.Goal),
		Metric:          metric,
		MetricTarget:    req.MetricTarget,
		Status:          model.MissionStatusDraft,
		ChannelIDs:      channels,
		StartsAt:        req.StartsAt,
		EndsAt:          req.EndsAt,
		Frequency:       strings.TrimSpace(req.Frequency),
		Constraints:     map[string]any{},
		Brief:           req.Brief,
		Plan:            model.MissionPlan{Items: []model.MissionPlanItem{}},
		Measurability:   measurabilityForMetric(metric),
		Result:          model.MissionResult{},
	}
	created, err := s.missions.Create(ctx, m)
	if err != nil {
		return nil, err
	}
	_, _ = s.missions.InsertMessage(ctx, model.MissionMessage{
		WorkspaceID: ws.ID,
		MissionID:   created.ID,
		Role:        "assistant",
		Content:     "Задача создана. Коротко опишите продукт, аудиторию и что хотите получить — я уточню цель и предложу ход публикаций. Публиковать в сети буду только после вашего разрешения.",
	})
	return created, nil
}

func (s *MissionService) Update(ctx context.Context, userID string, r *http.Request, id string, req model.MissionUpdateRequest) (*model.Mission, error) {
	ws, err := s.resolve(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	m, err := s.missions.Get(ctx, ws.ID, id)
	if err != nil {
		return nil, err
	}
	if m.Status == model.MissionStatusCanceled || m.Status == model.MissionStatusCompleted {
		return nil, fmt.Errorf("%w: задачу в этом статусе нельзя изменить", ErrMissionConflict)
	}
	applyMissionPatch(m, req)
	return s.missions.Update(ctx, m)
}

func (s *MissionService) UpdatePlan(ctx context.Context, userID string, r *http.Request, id string, req model.MissionPlanUpdateRequest) (*model.Mission, error) {
	ws, err := s.resolve(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	m, err := s.missions.Get(ctx, ws.ID, id)
	if err != nil {
		return nil, err
	}
	if m.Status == model.MissionStatusCanceled || m.Status == model.MissionStatusCompleted || m.Status == model.MissionStatusRunning {
		return nil, fmt.Errorf("%w: ход в этом статусе нельзя изменить здесь — правьте отдельные посты", ErrMissionConflict)
	}
	if len(req.Items) == 0 {
		return nil, fmt.Errorf("%w: ход не должен быть пустым", ErrInvalidMission)
	}
	m.Plan.Items = normalizePlanItems(req.Items, m, true)
	if len(m.Plan.Items) == 0 {
		return nil, fmt.Errorf("%w: в ходе нет публикаций", ErrInvalidMission)
	}
	if m.Status == model.MissionStatusDraft || m.Status == model.MissionStatusClarifying {
		m.Status = model.MissionStatusPlanning
	}
	m.Plan.ApprovedAt = nil
	return s.missions.Update(ctx, m)
}

func (s *MissionService) Cancel(ctx context.Context, userID string, r *http.Request, id string) (*model.Mission, error) {
	ws, err := s.resolve(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	m, err := s.missions.Get(ctx, ws.ID, id)
	if err != nil {
		return nil, err
	}
	if m.Status == model.MissionStatusCompleted {
		return nil, fmt.Errorf("%w: завершённую задачу нельзя отменить", ErrMissionConflict)
	}
	m.Status = model.MissionStatusCanceled
	return s.missions.Update(ctx, m)
}

func (s *MissionService) Complete(ctx context.Context, userID string, r *http.Request, id string, req model.MissionCompleteRequest) (*model.Mission, error) {
	ws, err := s.resolve(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	m, err := s.missions.Get(ctx, ws.ID, id)
	if err != nil {
		return nil, err
	}
	if m.Status == model.MissionStatusCanceled {
		return nil, fmt.Errorf("%w: отменённую задачу нельзя завершить", ErrMissionConflict)
	}
	m.Status = model.MissionStatusCompleted
	m.Result.Summary = strings.TrimSpace(req.Summary)
	m.Result.Notes = strings.TrimSpace(req.Notes)
	return s.missions.Update(ctx, m)
}

func (s *MissionService) SaveAsTemplate(ctx context.Context, userID string, r *http.Request, missionID string, name string) (*model.AgentTemplate, error) {
	ws, err := s.resolve(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	m, err := s.missions.Get(ctx, ws.ID, missionID)
	if err != nil {
		return nil, err
	}
	tmpl, err := s.templates.Get(ctx, m.AgentTemplateID)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}
	prompt := ""
	if tmpl != nil {
		prompt = tmpl.Prompt
	}
	title := strings.TrimSpace(name)
	if title == "" {
		title = "Шаблон: " + m.Title
	}
	return s.CreateUserTemplate(ctx, userID, r, model.AgentTemplateSaveRequest{
		Name:        title,
		Description: "Сохранён из задачи «" + m.Title + "»",
		Prompt:      prompt,
		Settings: model.AgentTemplateSettings{
			DefaultMetric:    string(m.Metric),
			DefaultFrequency: m.Frequency,
			ChannelIDs:       m.ChannelIDs,
		},
	})
}

func validMissionMetric(m model.MissionMetric) bool {
	switch m {
	case model.MissionMetricClicks, model.MissionMetricLikes, model.MissionMetricReach,
		model.MissionMetricSubscribers, model.MissionMetricManual:
		return true
	}
	return false
}

func measurabilityForMetric(m model.MissionMetric) model.MissionMeasurability {
	switch m {
	case model.MissionMetricClicks:
		return model.MissionMeasurabilityAutomatic
	case model.MissionMetricManual:
		return model.MissionMeasurabilityManual
	default:
		return model.MissionMeasurabilityPartial
	}
}

func (s *MissionService) filterWorkspaceChannels(ctx context.Context, workspaceID string, ids []string) ([]string, error) {
	if len(ids) == 0 {
		return []string{}, nil
	}
	rows, err := s.channels.ListRowsByWorkspace(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	allowed := map[string]struct{}{}
	for _, row := range rows {
		allowed[row.Channel.ID] = struct{}{}
	}
	out := make([]string, 0, len(ids))
	seen := map[string]struct{}{}
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		if _, ok := allowed[id]; !ok {
			return nil, fmt.Errorf("%w: канал не найден в workspace", ErrInvalidMission)
		}
		if _, dup := seen[id]; dup {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out, nil
}

func applyMissionPatch(m *model.Mission, req model.MissionUpdateRequest) {
	if req.Title != nil {
		if t := strings.TrimSpace(*req.Title); t != "" {
			m.Title = t
		}
	}
	if req.Goal != nil {
		m.Goal = strings.TrimSpace(*req.Goal)
	}
	if req.Metric != nil && validMissionMetric(*req.Metric) {
		m.Metric = *req.Metric
		m.Measurability = measurabilityForMetric(m.Metric)
	}
	if req.MetricTarget != nil {
		m.MetricTarget = req.MetricTarget
	}
	if req.ChannelIDs != nil {
		m.ChannelIDs = req.ChannelIDs
	}
	if req.Frequency != nil {
		m.Frequency = strings.TrimSpace(*req.Frequency)
	}
	if req.Brief != nil {
		m.Brief = *req.Brief
	}
	if req.ClearStart {
		m.StartsAt = nil
	} else if req.StartsAt != nil {
		m.StartsAt = req.StartsAt
	}
	if req.ClearEnd {
		m.EndsAt = nil
	} else if req.EndsAt != nil {
		m.EndsAt = req.EndsAt
	}
}
