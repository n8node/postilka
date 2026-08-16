package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/postilka/postilka/internal/ai"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrWorkflowNotFound       = errors.New("workflow not found")
	ErrWorkflowCyclicGraph    = errors.New("workflow contains circular dependencies")
	ErrWorkflowInvalidGraph   = errors.New("workflow graph is invalid")
	ErrWorkflowNodeFailed     = errors.New("workflow node execution failed")
	ErrWorkflowQuotaExceeded  = errors.New("workspace workflows limit exceeded")
)

var varRegex = regexp.MustCompile(`\{\{\s*([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_.-]+)\s*\}\}`)

type WorkflowService struct {
	repo           *repository.WorkflowRepository
	channelRepo    *repository.ChannelRepository
	postSvc        *PostService
	generationSvc  *GenerationService
	aiBillingSvc   *AIBillingService
	yandexGptSvc   *YandexGptConfigService
	wsSvc          *WorkspaceService
	fileStorageSvc *FileStorageService
	planRepo       *repository.PlanRepository
	notify         *NotificationService
	logger         *slog.Logger
}

func NewWorkflowService(
	repo *repository.WorkflowRepository,
	channelRepo *repository.ChannelRepository,
	postSvc *PostService,
	generationSvc *GenerationService,
	aiBillingSvc *AIBillingService,
	yandexGptSvc *YandexGptConfigService,
	wsSvc *WorkspaceService,
	fileStorageSvc *FileStorageService,
	planRepo *repository.PlanRepository,
	notify *NotificationService,
	logger *slog.Logger,
) *WorkflowService {
	return &WorkflowService{
		repo:           repo,
		channelRepo:    channelRepo,
		postSvc:        postSvc,
		generationSvc:  generationSvc,
		aiBillingSvc:   aiBillingSvc,
		yandexGptSvc:   yandexGptSvc,
		wsSvc:          wsSvc,
		fileStorageSvc: fileStorageSvc,
		planRepo:       planRepo,
		notify:         notify,
		logger:         logger,
	}
}

func (s *WorkflowService) SetNotifier(notify *NotificationService) {
	s.notify = notify
}

// Workflows CRUD

func (s *WorkflowService) ListWorkflows(ctx context.Context, workspaceID string) ([]model.Workflow, error) {
	list, err := s.repo.ListByWorkspace(ctx, workspaceID)
	if err != nil {
		return nil, err
	}

	// Enrich with last run
	for i := range list {
		runs, _ := s.repo.ListRunsByWorkflow(ctx, list[i].ID, workspaceID, 1)
		if len(runs) > 0 {
			list[i].LastRun = &runs[0]
		}
	}
	return list, nil
}

func (s *WorkflowService) GetWorkflow(ctx context.Context, id, workspaceID string) (*model.Workflow, error) {
	w, err := s.repo.GetByID(ctx, id, workspaceID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrWorkflowNotFound
		}
		return nil, err
	}
	runs, _ := s.repo.ListRunsByWorkflow(ctx, w.ID, workspaceID, 1)
	if len(runs) > 0 {
		w.LastRun = &runs[0]
	}
	return w, nil
}

func (s *WorkflowService) CreateWorkflow(ctx context.Context, workspaceID, userID string, req model.CreateWorkflowRequest) (*model.Workflow, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = "Новый процесс"
	}
	graph := model.WorkflowGraph{
		Nodes: make([]model.WorkflowNode, 0),
		Edges: make([]model.WorkflowEdge, 0),
	}
	if req.Graph != nil {
		graph = *req.Graph
	}
	if len(graph.Nodes) == 0 {
		// Default starter node
		graph.Nodes = append(graph.Nodes, model.WorkflowNode{
			ID:       "trigger_1",
			Type:     "trigger",
			Position: model.NodePosition{X: 100, Y: 150},
			Data: map[string]interface{}{
				"title":       "Запуск процесса",
				"triggerType": "manual",
			},
		})
	}

	triggerType := req.TriggerType
	if triggerType == "" {
		triggerType = model.WorkflowTriggerManual
	}

	tz := req.ScheduleTZ
	if tz == "" {
		tz = "Europe/Moscow"
	}

	wf := &model.Workflow{
		WorkspaceID:  workspaceID,
		CreatedBy:    &userID,
		Name:         name,
		Description:  strings.TrimSpace(req.Description),
		IsActive:     true,
		TriggerType:  triggerType,
		ScheduleCron: strings.TrimSpace(req.ScheduleCron),
		ScheduleTZ:   tz,
		Graph:        graph,
	}

	created, err := s.repo.Create(ctx, wf)
	if err != nil {
		return nil, err
	}
	return created, nil
}

func (s *WorkflowService) UpdateWorkflow(ctx context.Context, id, workspaceID string, req model.UpdateWorkflowRequest) (*model.Workflow, error) {
	w, err := s.GetWorkflow(ctx, id, workspaceID)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name != "" {
			w.Name = name
		}
	}
	if req.Description != nil {
		w.Description = strings.TrimSpace(*req.Description)
	}
	if req.IsActive != nil {
		w.IsActive = *req.IsActive
	}
	if req.TriggerType != nil {
		w.TriggerType = *req.TriggerType
	}
	if req.ScheduleCron != nil {
		w.ScheduleCron = strings.TrimSpace(*req.ScheduleCron)
	}
	if req.ScheduleTZ != nil && strings.TrimSpace(*req.ScheduleTZ) != "" {
		w.ScheduleTZ = strings.TrimSpace(*req.ScheduleTZ)
	}
	if req.Graph != nil {
		w.Graph = *req.Graph
	}

	updated, err := s.repo.Update(ctx, w)
	if err != nil {
		return nil, err
	}
	return updated, nil
}

func (s *WorkflowService) DeleteWorkflow(ctx context.Context, id, workspaceID string) error {
	err := s.repo.Delete(ctx, id, workspaceID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return ErrWorkflowNotFound
		}
		return err
	}
	return nil
}

// Templates

func (s *WorkflowService) ListTemplates(ctx context.Context, onlyActive bool) ([]model.WorkflowTemplate, error) {
	return s.repo.ListTemplates(ctx, onlyActive)
}

func (s *WorkflowService) GetTemplate(ctx context.Context, id string) (*model.WorkflowTemplate, error) {
	return s.repo.GetTemplateByID(ctx, id)
}

func (s *WorkflowService) CreateTemplate(ctx context.Context, req model.SaveTemplateRequest) (*model.WorkflowTemplate, error) {
	graph := model.WorkflowGraph{
		Nodes: make([]model.WorkflowNode, 0),
		Edges: make([]model.WorkflowEdge, 0),
	}
	if req.Graph != nil {
		graph = *req.Graph
	}
	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}
	order := 0
	if req.SortOrder != nil {
		order = *req.SortOrder
	}
	cat := req.Category
	if cat == "" {
		cat = "general"
	}
	icon := req.Icon
	if icon == "" {
		icon = "workflow"
	}

	t := &model.WorkflowTemplate{
		Name:        strings.TrimSpace(req.Name),
		Description: strings.TrimSpace(req.Description),
		Category:    cat,
		Icon:        icon,
		IsSystem:    true,
		IsActive:    active,
		SortOrder:   order,
		Graph:       graph,
	}
	return s.repo.CreateTemplate(ctx, t)
}

func (s *WorkflowService) UpdateTemplate(ctx context.Context, id string, req model.SaveTemplateRequest) (*model.WorkflowTemplate, error) {
	t, err := s.repo.GetTemplateByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if req.Name != "" {
		t.Name = strings.TrimSpace(req.Name)
	}
	t.Description = strings.TrimSpace(req.Description)
	if req.Category != "" {
		t.Category = req.Category
	}
	if req.Icon != "" {
		t.Icon = req.Icon
	}
	if req.IsActive != nil {
		t.IsActive = *req.IsActive
	}
	if req.SortOrder != nil {
		t.SortOrder = *req.SortOrder
	}
	if req.Graph != nil {
		t.Graph = *req.Graph
	}
	return s.repo.UpdateTemplate(ctx, t)
}

func (s *WorkflowService) DeleteTemplate(ctx context.Context, id string) error {
	return s.repo.DeleteTemplate(ctx, id)
}

func (s *WorkflowService) CloneTemplate(ctx context.Context, templateID, workspaceID, userID string) (*model.Workflow, error) {
	tpl, err := s.repo.GetTemplateByID(ctx, templateID)
	if err != nil {
		return nil, err
	}

	wf := &model.Workflow{
		WorkspaceID:  workspaceID,
		CreatedBy:    &userID,
		Name:         tpl.Name,
		Description:  tpl.Description,
		IsActive:     true,
		TriggerType:  model.WorkflowTriggerManual,
		ScheduleTZ:   "Europe/Moscow",
		Graph:        tpl.Graph,
	}
	return s.repo.Create(ctx, wf)
}

// Runs

func (s *WorkflowService) ListRuns(ctx context.Context, workflowID, workspaceID string, limit int) ([]model.WorkflowRun, error) {
	return s.repo.ListRunsByWorkflow(ctx, workflowID, workspaceID, limit)
}

func (s *WorkflowService) GetRun(ctx context.Context, runID, workspaceID string) (*model.WorkflowRun, error) {
	run, err := s.repo.GetRunByID(ctx, runID, workspaceID)
	if err != nil {
		return nil, err
	}
	steps, err := s.repo.ListRunSteps(ctx, runID)
	if err == nil {
		run.Steps = steps
	}
	return run, nil
}

func (s *WorkflowService) GetStats(ctx context.Context) (*model.WorkflowStatsResponse, error) {
	return s.repo.GetStats(ctx)
}

// Run Execution & DAG Engine

func (s *WorkflowService) TriggerRun(ctx context.Context, workflowID, workspaceID, userID string, triggerSource string, customInputs map[string]interface{}) (*model.WorkflowRun, error) {
	w, err := s.GetWorkflow(ctx, workflowID, workspaceID)
	if err != nil {
		return nil, err
	}

	if customInputs == nil {
		customInputs = make(map[string]interface{})
	}

	now := time.Now()
	run := &model.WorkflowRun{
		WorkflowID:    w.ID,
		WorkspaceID:   workspaceID,
		TriggeredBy:   &userID,
		TriggerSource: triggerSource,
		Status:        model.WorkflowRunStatusRunning,
		ContextData:   customInputs,
		StartedAt:     &now,
	}

	createdRun, err := s.repo.CreateRun(ctx, run)
	if err != nil {
		return nil, fmt.Errorf("create run: %w", err)
	}

	// Run execution asynchronously in background goroutine
	go func(runID string, graph model.WorkflowGraph, wsID string, uID string, initialInputs map[string]interface{}) {
		bgCtx := context.Background()
		s.executeWorkflowGraph(bgCtx, runID, graph, wsID, uID, initialInputs)
	}(createdRun.ID, w.Graph, workspaceID, userID, customInputs)

	return createdRun, nil
}

func (s *WorkflowService) executeWorkflowGraph(ctx context.Context, runID string, graph model.WorkflowGraph, workspaceID, userID string, initialInputs map[string]interface{}) {
	run, err := s.repo.GetRunByID(ctx, runID, workspaceID)
	if err != nil {
		if s.logger != nil {
			s.logger.Error("failed to load run for execution", "run_id", runID, "err", err)
		}
		return
	}

	// 1. Topological Sort of DAG
	orderedNodes, err := s.topologicalSort(graph)
	if err != nil {
		now := time.Now()
		run.Status = model.WorkflowRunStatusFailed
		run.ErrorMessage = fmt.Sprintf("Ошибка структуры графа: %v", err)
		run.FinishedAt = &now
		_ = s.repo.UpdateRun(ctx, run)
		return
	}

	// Context accumulator for outputs: map[nodeID]map[string]interface{}
	executionOutputs := make(map[string]map[string]interface{})
	for k, v := range initialInputs {
		if executionOutputs["trigger"] == nil {
			executionOutputs["trigger"] = make(map[string]interface{})
		}
		executionOutputs["trigger"][k] = v
	}

	totalTokens := 0
	totalCredits := 0
	totalKopecks := 0
	isAwaitingApproval := false

	// 2. Execute nodes sequentially
	for _, node := range orderedNodes {
		stepNow := time.Now()
		step := &model.WorkflowRunStep{
			RunID:      runID,
			NodeID:     node.ID,
			NodeType:   node.Type,
			NodeTitle:  s.getNodeTitle(node),
			Status:     model.WorkflowStepStatusRunning,
			Inputs:     s.resolveNodeData(node.Data, executionOutputs),
			Outputs:    make(map[string]interface{}),
			StartedAt:  &stepNow,
		}

		createdStep, stepErr := s.repo.CreateRunStep(ctx, step)
		if stepErr != nil {
			if s.logger != nil {
				s.logger.Error("failed to create run step", "run_id", runID, "node_id", node.ID, "err", stepErr)
			}
			continue
		}

		// Execute specific node logic
		outputs, tokens, credits, kopecks, execErr := s.executeNode(ctx, workspaceID, userID, node, createdStep.Inputs, executionOutputs)
		finished := time.Now()
		createdStep.FinishedAt = &finished
		createdStep.DurationMS = int(finished.Sub(stepNow).Milliseconds())
		totalTokens += tokens
		totalCredits += credits
		totalKopecks += kopecks

		if execErr != nil {
			createdStep.Status = model.WorkflowStepStatusFailed
			createdStep.ErrorMessage = execErr.Error()
			_ = s.repo.UpdateRunStep(ctx, createdStep)

			run.Status = model.WorkflowRunStatusFailed
			run.ErrorMessage = fmt.Sprintf("Ошибка на шаге '%s': %v", createdStep.NodeTitle, execErr)
			run.TokensUsed = totalTokens
			run.CreditsUsed = totalCredits
			run.KopecksSpent = totalKopecks
			run.FinishedAt = &finished
			_ = s.repo.UpdateRun(ctx, run)
			return
		}

		if node.Type == "draft_approval" || node.Type == "human_review" {
			isAwaitingApproval = true
		}

		createdStep.Status = model.WorkflowStepStatusCompleted
		createdStep.Outputs = outputs
		_ = s.repo.UpdateRunStep(ctx, createdStep)

		// Store node outputs for subsequent steps
		executionOutputs[node.ID] = outputs
	}

	finishedNow := time.Now()
	run.FinishedAt = &finishedNow
	run.TokensUsed = totalTokens
	run.CreditsUsed = totalCredits
	run.KopecksSpent = totalKopecks

	flatContext := make(map[string]interface{})
	for k, v := range executionOutputs {
		flatContext[k] = v
	}
	run.ContextData = flatContext

	if isAwaitingApproval {
		run.Status = model.WorkflowRunStatusAwaitingApproval
	} else {
		run.Status = model.WorkflowRunStatusCompleted
	}

	_ = s.repo.UpdateRun(ctx, run)
}

// Single node executor

func (s *WorkflowService) executeNode(
	ctx context.Context,
	workspaceID, userID string,
	node model.WorkflowNode,
	inputs map[string]interface{},
	outputsAccumulator map[string]map[string]interface{},
) (outputs map[string]interface{}, tokens int, credits int, kopecks int, err error) {
	outputs = make(map[string]interface{})

	switch node.Type {
	case "trigger":
		outputs["timestamp"] = time.Now().Format(time.RFC3339)
		outputs["workspace_id"] = workspaceID
		for k, v := range inputs {
			outputs[k] = v
		}
		return outputs, 0, 0, 0, nil

	case "ai_text":
		prompt := getString(inputs, "prompt", "")
		if prompt == "" {
			return nil, 0, 0, 0, errors.New("промпт для генерации текста не может быть пустым")
		}
		role := getString(inputs, "role", "Опытный SMM-копирайтер")
		fullPrompt := fmt.Sprintf("Роль: %s\nЗадача: %s", role, prompt)

		if s.yandexGptSvc != nil {
			client, cfg, clientErr := s.yandexGptSvc.Client(ctx)
			if clientErr == nil && client != nil {
				modelID := ModelForTask(cfg, "text_generation")
				res, chatErr := client.Chat(ctx, modelID, []ai.ChatMessage{
					{Role: "system", Content: role},
					{Role: "user", Content: prompt},
				})
				if chatErr == nil && res.Content != "" {
					outputs["text"] = strings.TrimSpace(res.Content)
					outputs["tokens"] = res.TotalTokens
					return outputs, res.TotalTokens, 0, 0, nil
				}
			}
		}

		// Fallback generated text if LLM config is mock/not configured
		generatedText := fmt.Sprintf("Сгенерированный текст публикации по теме: %s", prompt)
		outputs["text"] = generatedText
		outputs["role"] = role
		outputs["full_prompt"] = fullPrompt
		return outputs, 50, 0, 0, nil

	case "ai_image":
		prompt := getString(inputs, "prompt", "")
		aspectRatio := getString(inputs, "aspectRatio", "1:1")
		if prompt == "" {
			return nil, 0, 0, 0, errors.New("промпт для генерации изображения обязателен")
		}
		outputs["image_url"] = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200"
		outputs["prompt"] = prompt
		outputs["aspect_ratio"] = aspectRatio
		return outputs, 0, 1, 0, nil

	case "ai_video":
		prompt := getString(inputs, "prompt", "")
		aspectRatio := getString(inputs, "aspectRatio", "9:16")
		duration := getInt(inputs, "durationSeconds", 5)
		if prompt == "" {
			return nil, 0, 0, 0, errors.New("промпт для генерации видео обязателен")
		}
		outputs["video_url"] = "https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-996-large.mp4"
		outputs["prompt"] = prompt
		outputs["aspect_ratio"] = aspectRatio
		outputs["duration"] = duration
		return outputs, 0, 2, 0, nil

	case "files_media":
		fileURL := getString(inputs, "fileUrl", "")
		fileID := getString(inputs, "fileId", "")
		outputs["file_url"] = fileURL
		outputs["file_id"] = fileID
		return outputs, 0, 0, 0, nil

	case "social_telegram":
		text := getString(inputs, "text", "")
		if text == "" {
			return nil, 0, 0, 0, errors.New("текст сообщения для Telegram обязателен")
		}
		format := getString(inputs, "format", "message")
		silent := getBool(inputs, "silent", false)
		pin := getBool(inputs, "pin", false)
		mediaURL := getString(inputs, "mediaUrl", "")

		channels, _ := s.channelRepo.ListByWorkspace(ctx, workspaceID)
		var tgChannel *model.Channel
		for _, ch := range channels {
			if ch.Provider == model.ChannelProviderTelegram {
				tgChannel = &ch
				break
			}
		}

		outputs["status"] = "success"
		outputs["provider"] = "telegram"
		outputs["format"] = format
		outputs["text"] = text
		outputs["silent"] = silent
		outputs["pin"] = pin
		outputs["media_url"] = mediaURL
		if tgChannel != nil {
			outputs["channel_id"] = tgChannel.ID
			outputs["channel_name"] = tgChannel.Name
		} else {
			outputs["channel_name"] = "Telegram (Демо-канал)"
		}
		return outputs, 0, 0, 0, nil

	case "social_vk":
		text := getString(inputs, "text", "")
		if text == "" {
			return nil, 0, 0, 0, errors.New("текст записи для ВКонтакте обязателен")
		}
		fromGroup := getBool(inputs, "fromGroup", true)
		signed := getBool(inputs, "signed", false)
		firstComment := getString(inputs, "firstComment", "")

		channels, _ := s.channelRepo.ListByWorkspace(ctx, workspaceID)
		var vkChannel *model.Channel
		for _, ch := range channels {
			if ch.Provider == model.ChannelProviderVK {
				vkChannel = &ch
				break
			}
		}

		outputs["status"] = "success"
		outputs["provider"] = "vk"
		outputs["text"] = text
		outputs["from_group"] = fromGroup
		outputs["signed"] = signed
		outputs["first_comment"] = firstComment
		if vkChannel != nil {
			outputs["channel_id"] = vkChannel.ID
			outputs["channel_name"] = vkChannel.Name
		} else {
			outputs["channel_name"] = "ВКонтакте (Демо-сообщество)"
		}
		return outputs, 0, 0, 0, nil

	case "social_youtube":
		videoURL := getString(inputs, "videoUrl", "")
		title := getString(inputs, "titleText", "Новое видео")
		description := getString(inputs, "description", "")
		format := getString(inputs, "format", "shorts")
		privacy := getString(inputs, "privacyStatus", "public")

		outputs["status"] = "success"
		outputs["provider"] = "youtube"
		outputs["format"] = format
		outputs["title"] = title
		outputs["description"] = description
		outputs["video_url"] = videoURL
		outputs["privacy_status"] = privacy
		return outputs, 0, 0, 0, nil

	case "social_rutube", "social_dzen", "social_max", "social_ok":
		text := getString(inputs, "text", "")
		outputs["status"] = "success"
		outputs["provider"] = strings.TrimPrefix(node.Type, "social_")
		outputs["text"] = text
		return outputs, 0, 0, 0, nil

	case "draft_approval", "human_review":
		content := getString(inputs, "text", "Черновик из автоматизированного процесса")
		outputs["status"] = "awaiting_approval"
		outputs["content"] = content
		outputs["post_id"] = uuid.New().String()
		return outputs, 0, 0, 0, nil

	case "logic_condition":
		left := getString(inputs, "leftValue", "")
		operator := getString(inputs, "operator", "equals")
		right := getString(inputs, "rightValue", "")
		res := false
		switch operator {
		case "equals":
			res = left == right
		case "not_equals":
			res = left != right
		case "contains":
			res = strings.Contains(left, right)
		case "not_empty":
			res = strings.TrimSpace(left) != ""
		}
		outputs["result"] = res
		return outputs, 0, 0, 0, nil

	case "formatter":
		templateStr := getString(inputs, "template", "")
		outputs["result"] = templateStr
		return outputs, 0, 0, 0, nil

	default:
		// Generic pass-through node
		for k, v := range inputs {
			outputs[k] = v
		}
		outputs["status"] = "completed"
		return outputs, 0, 0, 0, nil
	}
}

// Test a single node

func (s *WorkflowService) TestNode(ctx context.Context, workspaceID, userID string, req model.TestNodeRequest) (map[string]interface{}, error) {
	node := req.Node
	inputs := req.Inputs
	if inputs == nil {
		inputs = make(map[string]interface{})
	}
	mergedInputs := make(map[string]interface{})
	for k, v := range node.Data {
		mergedInputs[k] = v
	}
	for k, v := range inputs {
		mergedInputs[k] = v
	}

	dummyAccumulator := make(map[string]map[string]interface{})
	outputs, _, _, _, err := s.executeNode(ctx, workspaceID, userID, node, mergedInputs, dummyAccumulator)
	if err != nil {
		return nil, err
	}
	return outputs, nil
}

// Variable resolution & Topological Sort helpers

func (s *WorkflowService) resolveNodeData(data map[string]interface{}, outputs map[string]map[string]interface{}) map[string]interface{} {
	if data == nil {
		return make(map[string]interface{})
	}
	resolved := make(map[string]interface{}, len(data))
	for k, v := range data {
		switch val := v.(type) {
		case string:
			resolved[k] = s.resolveVariables(val, outputs)
		case map[string]interface{}:
			resolved[k] = s.resolveNodeData(val, outputs)
		case []interface{}:
			resolved[k] = s.resolveSlice(val, outputs)
		default:
			resolved[k] = v
		}
	}
	return resolved
}

func (s *WorkflowService) resolveSlice(list []interface{}, outputs map[string]map[string]interface{}) []interface{} {
	res := make([]interface{}, len(list))
	for i, item := range list {
		switch it := item.(type) {
		case string:
			res[i] = s.resolveVariables(it, outputs)
		case map[string]interface{}:
			res[i] = s.resolveNodeData(it, outputs)
		default:
			res[i] = it
		}
	}
	return res
}

func (s *WorkflowService) resolveVariables(raw string, outputs map[string]map[string]interface{}) string {
	if raw == "" || !strings.Contains(raw, "{{") {
		return raw
	}
	return varRegex.ReplaceAllStringFunc(raw, func(match string) string {
		sub := varRegex.FindStringSubmatch(match)
		if len(sub) < 3 {
			return match
		}
		nodeID := sub[1]
		prop := sub[2]

		// 1. Direct exact lookup by nodeID
		if nodeOutputs, ok := outputs[nodeID]; ok {
			if val, valOk := nodeOutputs[prop]; valOk {
				return fmt.Sprintf("%v", val)
			}
		}

		// 2. Legacy alias fallback: map old yandex_gpt_1 / kie_video_1 aliases to ai_text_1 / ai_video_1
		aliasNodeID := nodeID
		if strings.HasPrefix(nodeID, "yandex_gpt_") {
			aliasNodeID = strings.Replace(nodeID, "yandex_gpt_", "ai_text_", 1)
		} else if strings.HasPrefix(nodeID, "kie_video_") {
			aliasNodeID = strings.Replace(nodeID, "kie_video_", "ai_video_", 1)
		} else if strings.HasPrefix(nodeID, "kie_image_") {
			aliasNodeID = strings.Replace(nodeID, "kie_image_", "ai_image_", 1)
		}

		if aliasOutputs, ok := outputs[aliasNodeID]; ok {
			if val, valOk := aliasOutputs[prop]; valOk {
				return fmt.Sprintf("%v", val)
			}
		}

		return match
	})
}

func (s *WorkflowService) topologicalSort(graph model.WorkflowGraph) ([]model.WorkflowNode, error) {
	nodeMap := make(map[string]model.WorkflowNode)
	inDegree := make(map[string]int)
	adjList := make(map[string][]string)

	for _, node := range graph.Nodes {
		nodeMap[node.ID] = node
		inDegree[node.ID] = 0
		adjList[node.ID] = make([]string, 0)
	}

	for _, edge := range graph.Edges {
		if _, ok := nodeMap[edge.Source]; !ok {
			continue
		}
		if _, ok := nodeMap[edge.Target]; !ok {
			continue
		}
		adjList[edge.Source] = append(adjList[edge.Source], edge.Target)
		inDegree[edge.Target]++
	}

	var queue []string
	for id, deg := range inDegree {
		if deg == 0 {
			queue = append(queue, id)
		}
	}

	var ordered []model.WorkflowNode
	for len(queue) > 0 {
		curr := queue[0]
		queue = queue[1:]
		if n, ok := nodeMap[curr]; ok {
			ordered = append(ordered, n)
		}
		for _, neighbor := range adjList[curr] {
			inDegree[neighbor]--
			if inDegree[neighbor] == 0 {
				queue = append(queue, neighbor)
			}
		}
	}

	if len(ordered) < len(graph.Nodes) {
		// Circular dependency or orphan loop
		// Include remaining nodes anyway to avoid dropping elements
		for _, n := range graph.Nodes {
			found := false
			for _, ord := range ordered {
				if ord.ID == n.ID {
					found = true
					break
				}
			}
			if !found {
				ordered = append(ordered, n)
			}
		}
	}

	return ordered, nil
}

func (s *WorkflowService) getNodeTitle(node model.WorkflowNode) string {
	if t, ok := node.Data["title"].(string); ok && strings.TrimSpace(t) != "" {
		return strings.TrimSpace(t)
	}
	switch node.Type {
	case "trigger":
		return "Запуск процесса"
	case "ai_text":
		return "AI Генерация текста"
	case "ai_image":
		return "AI Изображение"
	case "ai_video":
		return "AI Видео"
	case "social_telegram":
		return "Telegram Пост"
	case "social_vk":
		return "ВКонтакте Стена"
	case "social_youtube":
		return "YouTube Shorts"
	case "draft_approval":
		return "Модерация черновика"
	default:
		return node.Type
	}
}

func getString(m map[string]interface{}, key string, def string) string {
	if val, ok := m[key]; ok {
		if s, ok := val.(string); ok {
			return strings.TrimSpace(s)
		}
	}
	return def
}

func getInt(m map[string]interface{}, key string, def int) int {
	if val, ok := m[key]; ok {
		switch num := val.(type) {
		case int:
			return num
		case float64:
			return int(num)
		case json.Number:
			if n, err := num.Int64(); err == nil {
				return int(n)
			}
		}
	}
	return def
}

func getBool(m map[string]interface{}, key string, def bool) bool {
	if val, ok := m[key]; ok {
		if b, ok := val.(bool); ok {
			return b
		}
	}
	return def
}
