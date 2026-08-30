package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/ai"
	"github.com/postilka/postilka/internal/config"
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
	quota          *QuotaService
	notify         *NotificationService
	logger         *slog.Logger
	cfg            *config.Config
	webhookTests   *workflowWebhookRegistry
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
	quota *QuotaService,
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
		quota:          quota,
		notify:         notify,
		logger:         logger,
	}
}

func (s *WorkflowService) SetNotifier(notify *NotificationService) {
	s.notify = notify
}

func (s *WorkflowService) checkCreateWorkflowQuota(ctx context.Context, workspaceID string) error {
	if s.quota == nil {
		return nil
	}
	count, err := s.repo.CountByWorkspace(ctx, workspaceID)
	if err != nil {
		return err
	}
	return s.quota.CheckWorkflowQuota(ctx, workspaceID, count)
}

func (s *WorkflowService) notifyRunFinished(ctx context.Context, run *model.WorkflowRun, workflowName string) {
	if s.notify == nil || run == nil {
		return
	}
	s.notify.NotifyWorkflowRunFinished(ctx, *run, workflowName)
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

	rssInterval := req.RSSPollIntervalMinutes
	if rssInterval <= 0 {
		rssInterval = 15
	}

	wf := &model.Workflow{
		WorkspaceID:            workspaceID,
		CreatedBy:              &userID,
		Name:                   name,
		Description:            strings.TrimSpace(req.Description),
		IsActive:               true,
		TriggerType:            triggerType,
		ScheduleCron:           strings.TrimSpace(req.ScheduleCron),
		ScheduleTZ:             tz,
		RSSFeedURL:             strings.TrimSpace(req.RSSFeedURL),
		RSSPollIntervalMinutes: rssInterval,
		Graph:                  graph,
	}
	s.syncWorkflowMetaFromGraph(wf)

	if err := s.checkCreateWorkflowQuota(ctx, workspaceID); err != nil {
		return nil, err
	}

	created, err := s.repo.Create(ctx, wf)
	if err != nil {
		return nil, err
	}
	if created.TriggerType == model.WorkflowTriggerWebhook {
		_ = s.ensureWebhookSecret(ctx, created)
		created, _ = s.GetWorkflow(ctx, created.ID, workspaceID)
	}
	if created.TriggerType == model.WorkflowTriggerRSS && strings.TrimSpace(created.RSSFeedURL) != "" {
		now := time.Now()
		_ = s.repo.UpdateNextRunAt(ctx, created.ID, &now)
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
	if req.RSSFeedURL != nil {
		w.RSSFeedURL = strings.TrimSpace(*req.RSSFeedURL)
	}
	if req.RSSPollIntervalMinutes != nil && *req.RSSPollIntervalMinutes > 0 {
		w.RSSPollIntervalMinutes = *req.RSSPollIntervalMinutes
	}
	if req.Graph != nil {
		w.Graph = *req.Graph
	}
	s.syncWorkflowMetaFromGraph(w)

	updated, err := s.repo.Update(ctx, w)
	if err != nil {
		return nil, err
	}
	if updated.TriggerType == model.WorkflowTriggerWebhook {
		_ = s.ensureWebhookSecret(ctx, updated)
		updated, _ = s.GetWorkflow(ctx, updated.ID, workspaceID)
	}
	if updated.TriggerType == model.WorkflowTriggerRSS && strings.TrimSpace(updated.RSSFeedURL) != "" {
		now := time.Now()
		_ = s.repo.UpdateNextRunAt(ctx, updated.ID, &now)
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
		WorkspaceID:            workspaceID,
		CreatedBy:              &userID,
		Name:                   tpl.Name,
		Description:            tpl.Description,
		IsActive:               true,
		TriggerType:            model.WorkflowTriggerManual,
		ScheduleTZ:             "Europe/Moscow",
		RSSPollIntervalMinutes: 15,
		Graph:                  tpl.Graph,
	}
	s.syncWorkflowMetaFromGraph(wf)
	if wf.RSSPollIntervalMinutes <= 0 {
		wf.RSSPollIntervalMinutes = 15
	}
	if err := s.checkCreateWorkflowQuota(ctx, workspaceID); err != nil {
		return nil, err
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

	workflowName := "Процесс"
	if wf, wfErr := s.repo.GetByID(ctx, run.WorkflowID, workspaceID); wfErr == nil && wf != nil {
		workflowName = wf.Name
	}

	// 1. Topological Sort of DAG
	orderedNodes, err := s.topologicalSort(graph)
	if err != nil {
		now := time.Now()
		run.Status = model.WorkflowRunStatusFailed
		run.ErrorMessage = fmt.Sprintf("Ошибка структуры графа: %v", err)
		run.FinishedAt = &now
		_ = s.repo.UpdateRun(ctx, run)
		s.notifyRunFinished(ctx, run, workflowName)
		return
	}
	executionOutputs := make(map[string]map[string]interface{})
	for k, v := range initialInputs {
		if executionOutputs["trigger"] == nil {
			executionOutputs["trigger"] = make(map[string]interface{})
		}
		executionOutputs["trigger"][k] = v
	}
	if triggerNode := findTriggerNode(graph); triggerNode != nil && len(initialInputs) > 0 {
		if executionOutputs[triggerNode.ID] == nil {
			executionOutputs[triggerNode.ID] = make(map[string]interface{})
		}
		for k, v := range initialInputs {
			executionOutputs[triggerNode.ID][k] = v
		}
	}

	totalTokens := 0
	totalCredits := 0
	totalKopecks := 0
	isAwaitingApproval := false

	// Index incoming edges: targetNodeID -> []WorkflowEdge
	incomingEdgesMap := make(map[string][]model.WorkflowEdge)
	for _, edge := range graph.Edges {
		incomingEdgesMap[edge.Target] = append(incomingEdgesMap[edge.Target], edge)
	}

	loopChildSet := buildLoopChildSet(graph)
	nodeMap := buildNodeMap(graph)
	skippedNodes := make(map[string]bool)

	// 2. Execute nodes sequentially
	for _, node := range orderedNodes {
		if _, isLoopChild := loopChildSet[node.ID]; isLoopChild {
			continue
		}

		// Check if this node should be skipped due to branch filtering (e.g. Switch or Condition)
		shouldSkip := false
		incoming := incomingEdgesMap[node.ID]
		if len(incoming) > 0 {
			hasAtLeastOneActivePath := false
			for _, edge := range incoming {
				if !isActiveBranchEdge(edge, executionOutputs[edge.Source], skippedNodes) {
					continue
				}

				hasAtLeastOneActivePath = true
				break
			}
			if !hasAtLeastOneActivePath {
				shouldSkip = true
			}
		}

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

		if node.Type == "trigger" && len(initialInputs) > 0 {
			for k, v := range initialInputs {
				step.Inputs[k] = v
			}
		}
		if node.Type == "merge" {
			upstream := collectMergeInputs(incoming, executionOutputs, skippedNodes)
			step.Inputs["__upstream"] = upstream
		}
		if node.Type == "http_request" {
			step.Inputs = sanitizeHTTPInputsForLog(step.Inputs)
		}

		if shouldSkip {
			skippedNodes[node.ID] = true
			finished := time.Now()
			step.Status = model.WorkflowStepStatusSkipped
			step.FinishedAt = &finished
			step.DurationMS = 0
			_, _ = s.repo.CreateRunStep(ctx, step)
			continue
		}

		createdStep, stepErr := s.repo.CreateRunStep(ctx, step)
		if stepErr != nil {
			if s.logger != nil {
				s.logger.Error("failed to create run step", "run_id", runID, "node_id", node.ID, "err", stepErr)
			}
			continue
		}

		var (
			outputs  map[string]interface{}
			tokens   int
			credits  int
			kopecks  int
			execErr  error
		)
		if isApprovalWorkflowNode(node.Type) {
			outputs, execErr = s.executeApprovalNode(ctx, workspaceID, userID, run, &graph, node, createdStep.Inputs, executionOutputs)
		} else {
			outputs, tokens, credits, kopecks, execErr = s.executeNode(ctx, workspaceID, userID, node, createdStep.Inputs, executionOutputs)
		}
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
			s.notifyRunFinished(ctx, run, workflowName)
			return
		}

		if node.Type == "loop_items" {
			childIDs := getDirectChildNodeIDs(node.ID, graph)
			stopOnError := getBool(createdStep.Inputs, "stopOnError", false)
			items, itemsErr := resolveLoopItemsList(ctx, s, workspaceID, createdStep.Inputs)
			if itemsErr != nil {
				createdStep.Status = model.WorkflowStepStatusFailed
				createdStep.ErrorMessage = itemsErr.Error()
				_ = s.repo.UpdateRunStep(ctx, createdStep)
				run.Status = model.WorkflowRunStatusFailed
				run.ErrorMessage = fmt.Sprintf("Ошибка на шаге '%s': %v", createdStep.NodeTitle, itemsErr)
				run.FinishedAt = &finished
				_ = s.repo.UpdateRun(ctx, run)
				s.notifyRunFinished(ctx, run, workflowName)
				return
			}

			var iterationResults []map[string]interface{}
			for i, item := range items {
				setLoopContext(executionOutputs, i, len(items), item)
				if executionOutputs[node.ID] == nil {
					executionOutputs[node.ID] = make(map[string]interface{})
				}
				for k, v := range outputs {
					executionOutputs[node.ID][k] = v
				}

				for _, childID := range childIDs {
					childNode, ok := nodeMap[childID]
					if !ok {
						continue
					}
					childNow := time.Now()
					childInputs := s.resolveNodeData(childNode.Data, executionOutputs)
					childStep := &model.WorkflowRunStep{
						RunID:     runID,
						NodeID:    fmt.Sprintf("%s#%d", childNode.ID, i),
						NodeType:  childNode.Type,
						NodeTitle: s.getNodeTitle(childNode) + fmt.Sprintf(" (итерация %d)", i+1),
						Status:    model.WorkflowStepStatusRunning,
						Inputs:    childInputs,
						Outputs:   make(map[string]interface{}),
						StartedAt: &childNow,
					}
					childCreated, childStepErr := s.repo.CreateRunStep(ctx, childStep)
					if childStepErr != nil {
						continue
					}

					childOut, cTokens, cCredits, cKopecks, childExecErr := s.executeNode(ctx, workspaceID, userID, childNode, childInputs, executionOutputs)
					childFinished := time.Now()
					childCreated.FinishedAt = &childFinished
					childCreated.DurationMS = int(childFinished.Sub(childNow).Milliseconds())
					totalTokens += cTokens
					totalCredits += cCredits
					totalKopecks += cKopecks

					if childExecErr != nil {
						childCreated.Status = model.WorkflowStepStatusFailed
						childCreated.ErrorMessage = childExecErr.Error()
						_ = s.repo.UpdateRunStep(ctx, childCreated)
						iterationResults = append(iterationResults, map[string]interface{}{
							"error": childExecErr.Error(),
							"index": i,
						})
						if stopOnError {
							run.Status = model.WorkflowRunStatusFailed
							run.ErrorMessage = fmt.Sprintf("Ошибка на шаге '%s': %v", childCreated.NodeTitle, childExecErr)
							run.TokensUsed = totalTokens
							run.CreditsUsed = totalCredits
							run.KopecksSpent = totalKopecks
							run.FinishedAt = &childFinished
							_ = s.repo.UpdateRun(ctx, run)
							s.notifyRunFinished(ctx, run, workflowName)
							return
						}
						continue
					}

					childCreated.Status = model.WorkflowStepStatusCompleted
					childCreated.Outputs = childOut
					_ = s.repo.UpdateRunStep(ctx, childCreated)
					executionOutputs[childNode.ID] = childOut
					skippedNodes[childNode.ID] = true
					iterationResults = append(iterationResults, childOut)
				}
			}
			outputs["results"] = iterationResults
			outputs["count"] = len(items)
			if len(iterationResults) > 0 {
				outputs["last_result"] = iterationResults[len(iterationResults)-1]
				outputs["output"] = iterationResults[len(iterationResults)-1]
			}
			createdStep.Outputs = outputs
		}

		if isApprovalWorkflowNode(node.Type) {
			isAwaitingApproval = true
		}

		createdStep.Status = model.WorkflowStepStatusCompleted
		createdStep.Outputs = outputs
		_ = s.repo.UpdateRunStep(ctx, createdStep)

		// Store node outputs for subsequent steps
		executionOutputs[node.ID] = outputs

		if isApprovalWorkflowNode(node.Type) {
			break
		}
	}

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
		run.FinishedAt = nil
	} else {
		finishedNow := time.Now()
		run.FinishedAt = &finishedNow
		run.Status = model.WorkflowRunStatusCompleted
	}

	_ = s.repo.UpdateRun(ctx, run)
	if !isAwaitingApproval {
		s.notifyRunFinished(ctx, run, workflowName)
	}
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
		if err := validateWorkflowAIImage(inputs); err != nil {
			return nil, 0, 0, 0, err
		}
		prompt := getString(inputs, "prompt", "")
		mode := getString(inputs, "mode", "text-to-image")
		aspectRatio := getString(inputs, "aspectRatio", "1:1")
		sourceImage := getString(inputs, "sourceImage", "")
		if sourceImage == "" {
			sourceImage = getString(inputs, "referenceImage", "")
		}
		outputs["image_url"] = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200"
		outputs["prompt"] = prompt
		outputs["mode"] = mode
		outputs["aspect_ratio"] = aspectRatio
		outputs["source_image"] = sourceImage
		outputs["combine_images"] = getStringSlice(inputs, "combineImages")
		return outputs, 0, 1, 0, nil

	case "ai_video":
		if err := validateWorkflowAIVideo(inputs); err != nil {
			return nil, 0, 0, 0, err
		}
		prompt := getString(inputs, "prompt", "")
		mode := getString(inputs, "mode", "text-to-video")
		aspectRatio := getString(inputs, "aspectRatio", "16:9")
		duration := clampWorkflowVideoDuration(getInt(inputs, "durationSeconds", 5))
		outputs["video_url"] = "https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-996-large.mp4"
		outputs["prompt"] = prompt
		outputs["mode"] = mode
		outputs["aspect_ratio"] = aspectRatio
		outputs["duration"] = duration
		outputs["first_frame"] = getString(inputs, "firstFrame", "")
		outputs["last_frame"] = getString(inputs, "lastFrame", "")
		outputs["reference_images"] = getStringSlice(inputs, "referenceImages")
		outputs["reference_videos"] = getStringSlice(inputs, "referenceVideos")
		outputs["reference_audios"] = getStringSlice(inputs, "referenceAudios")
		return outputs, 0, 2, 0, nil

	case "files_media":
		fileURL := getString(inputs, "fileUrl", "")
		fileID := getString(inputs, "fileId", "")
		imageURL := getString(inputs, "imageUrl", "")
		videoURL := getString(inputs, "videoUrl", "")
		mediaKind := getString(inputs, "mediaKind", "")
		if imageURL == "" && mediaKind != "video" && fileURL != "" {
			imageURL = fileURL
		}
		if videoURL == "" && mediaKind == "video" && fileURL != "" {
			videoURL = fileURL
		}
		outputs["file_url"] = fileURL
		outputs["file_id"] = fileID
		outputs["image_url"] = imageURL
		outputs["video_url"] = videoURL
		return outputs, 0, 0, 0, nil

	case "social_telegram":
		if err := validateSocialNodeInputs(node.Type, inputs); err != nil {
			return nil, 0, 0, 0, err
		}
		content := readSocialContent(inputs)
		text := content.Text
		format := getString(inputs, "format", "message")
		silent := getBool(inputs, "silent", false)
		pin := getBool(inputs, "pin", false)
		protectContent := getBool(inputs, "protectContent", false)
		disableLinkPreview := getBool(inputs, "disableLinkPreview", false)
		mediaPosition := getString(inputs, "mediaPosition", "below")
		mediaURL := content.resolvedMediaURL()
		channelID := getString(inputs, "channelId", "")

		channels, _ := s.channelRepo.ListByWorkspace(ctx, workspaceID)
		var tgChannel *model.Channel
		for _, ch := range channels {
			if channelID != "" && ch.ID == channelID {
				tgChannel = &ch
				break
			}
			if channelID == "" && ch.Provider == model.ChannelProviderTelegram {
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
		outputs["protect_content"] = protectContent
		outputs["disable_link_preview"] = disableLinkPreview
		outputs["media_layout"] = getString(inputs, "mediaLayout", "separate")
		outputs["media_position"] = mediaPosition
		outputs["media_order"] = getString(inputs, "mediaOrder", "media_first")
		outputs["media_url"] = mediaURL
		outputs["image_url"] = content.ImageURL
		outputs["video_url"] = content.VideoURL
		if btns, ok := inputs["buttons"]; ok && btns != nil {
			outputs["buttons"] = btns
		}
		if tgChannel != nil {
			outputs["channel_id"] = tgChannel.ID
			outputs["channel_name"] = tgChannel.Name
			outputs["chat_id"] = tgChannel.ChatID
		} else {
			outputs["channel_name"] = "Telegram (Демо-канал)"
		}
		return outputs, 0, 0, 0, nil

	case "social_max":
		if err := validateSocialNodeInputs(node.Type, inputs); err != nil {
			return nil, 0, 0, 0, err
		}
		content := readSocialContent(inputs)
		text := content.Text
		format := getString(inputs, "format", "message")
		silent := getBool(inputs, "silent", false)
		pin := getBool(inputs, "pin", false)
		disableLinkPreview := getBool(inputs, "disableLinkPreview", false)
		mediaURL := content.resolvedMediaURL()
		channelID := getString(inputs, "channelId", "")

		channels, _ := s.channelRepo.ListByWorkspace(ctx, workspaceID)
		var maxChannel *model.Channel
		for _, ch := range channels {
			if channelID != "" && ch.ID == channelID {
				maxChannel = &ch
				break
			}
			if channelID == "" && ch.Provider == model.ChannelProviderMAX {
				maxChannel = &ch
				break
			}
		}

		outputs["status"] = "success"
		outputs["provider"] = "max"
		outputs["format"] = format
		outputs["text"] = text
		outputs["silent"] = silent
		outputs["pin"] = pin
		outputs["disable_link_preview"] = disableLinkPreview
		outputs["media_url"] = mediaURL
		outputs["image_url"] = content.ImageURL
		outputs["video_url"] = content.VideoURL
		if btns, ok := inputs["buttons"]; ok && btns != nil {
			outputs["buttons"] = btns
		}
		if maxChannel != nil {
			outputs["channel_id"] = maxChannel.ID
			outputs["channel_name"] = maxChannel.Name
			outputs["chat_id"] = maxChannel.ChatID
		} else {
			outputs["channel_name"] = "MAX (Демо-канал)"
		}
		return outputs, 0, 0, 0, nil

	case "social_vk":
		if err := validateSocialNodeInputs(node.Type, inputs); err != nil {
			return nil, 0, 0, 0, err
		}
		content := readSocialContent(inputs)
		text := content.Text
		format := getString(inputs, "format", "wall_post")
		fromGroup := getBool(inputs, "fromGroup", true)
		signed := getBool(inputs, "signed", false)
		firstComment := getString(inputs, "firstComment", "")
		donutOnly := getBool(inputs, "donutOnly", false)
		closeComments := getBool(inputs, "closeComments", false)
		mediaURL := content.resolvedMediaURL()
		channelID := getString(inputs, "channelId", "")

		channels, _ := s.channelRepo.ListByWorkspace(ctx, workspaceID)
		var vkChannel *model.Channel
		for _, ch := range channels {
			if channelID != "" && ch.ID == channelID {
				vkChannel = &ch
				break
			}
			if channelID == "" && ch.Provider == model.ChannelProviderVK {
				vkChannel = &ch
				break
			}
		}

		outputs["status"] = "success"
		outputs["provider"] = "vk"
		outputs["format"] = format
		outputs["text"] = text
		outputs["from_group"] = fromGroup
		outputs["signed"] = signed
		outputs["first_comment"] = firstComment
		outputs["donut_only"] = donutOnly
		outputs["close_comments"] = closeComments
		outputs["media_url"] = mediaURL
		outputs["image_url"] = content.ImageURL
		outputs["video_url"] = content.VideoURL
		if vkChannel != nil {
			outputs["channel_id"] = vkChannel.ID
			outputs["channel_name"] = vkChannel.Name
			outputs["chat_id"] = vkChannel.ChatID
		} else {
			outputs["channel_name"] = "ВКонтакте (Демо-сообщество)"
		}
		return outputs, 0, 0, 0, nil

	case "social_youtube":
		if err := validateSocialNodeInputs(node.Type, inputs); err != nil {
			return nil, 0, 0, 0, err
		}
		content := readSocialContent(inputs)
		videoURL := content.VideoURL
		title := content.Title
		if title == "" {
			title = "Новое видео"
		}
		description := content.Text
		format := getString(inputs, "format", "shorts")
		privacy := getString(inputs, "privacyStatus", "public")
		channelID := getString(inputs, "channelId", "")

		channels, _ := s.channelRepo.ListByWorkspace(ctx, workspaceID)
		var ytChannel *model.Channel
		for _, ch := range channels {
			if channelID != "" && ch.ID == channelID {
				ytChannel = &ch
				break
			}
			if channelID == "" && ch.Provider == model.ChannelProviderYouTube {
				ytChannel = &ch
				break
			}
		}

		outputs["status"] = "success"
		outputs["provider"] = "youtube"
		outputs["format"] = format
		outputs["title"] = title
		outputs["description"] = description
		outputs["text"] = description
		outputs["video_url"] = videoURL
		outputs["image_url"] = content.ImageURL
		outputs["privacy_status"] = privacy
		if ytChannel != nil {
			outputs["channel_id"] = ytChannel.ID
			outputs["channel_name"] = ytChannel.Name
		} else {
			outputs["channel_name"] = "YouTube (Канал)"
		}
		return outputs, 0, 0, 0, nil

	case "social_rutube":
		if err := validateSocialNodeInputs(node.Type, inputs); err != nil {
			return nil, 0, 0, 0, err
		}
		content := readSocialContent(inputs)
		text := content.Text
		title := getString(inputs, "title", content.Title)
		if title == "" {
			title = "Новое видео"
		}
		videoURL := content.VideoURL
		category := getString(inputs, "category", "Бизнес и стартапы")
		privacy := getString(inputs, "privacyStatus", "public")
		channelID := getString(inputs, "channelId", "")

		channels, _ := s.channelRepo.ListByWorkspace(ctx, workspaceID)
		var rutubeChannel *model.Channel
		for _, ch := range channels {
			if channelID != "" && ch.ID == channelID {
				rutubeChannel = &ch
				break
			}
			if channelID == "" && ch.Provider == model.ChannelProviderRutube {
				rutubeChannel = &ch
				break
			}
		}

		outputs["status"] = "success"
		outputs["provider"] = "rutube"
		outputs["title"] = title
		outputs["text"] = text
		outputs["video_url"] = videoURL
		outputs["category"] = category
		outputs["privacy_status"] = privacy
		if rutubeChannel != nil {
			outputs["channel_id"] = rutubeChannel.ID
			outputs["channel_name"] = rutubeChannel.Name
		} else {
			outputs["channel_name"] = "Rutube (Канал)"
		}
		return outputs, 0, 0, 0, nil

	case "social_dzen":
		if err := validateSocialNodeInputs(node.Type, inputs); err != nil {
			return nil, 0, 0, 0, err
		}
		content := readSocialContent(inputs)
		text := content.Text
		title := getString(inputs, "title", "")
		format := getString(inputs, "format", "brief")
		mediaURL := content.resolvedMediaURL()
		channelID := getString(inputs, "channelId", "")

		channels, _ := s.channelRepo.ListByWorkspace(ctx, workspaceID)
		var dzenChannel *model.Channel
		for _, ch := range channels {
			if channelID != "" && ch.ID == channelID {
				dzenChannel = &ch
				break
			}
			if channelID == "" && ch.Provider == model.ChannelProviderDzen {
				dzenChannel = &ch
				break
			}
		}

		outputs["status"] = "success"
		outputs["provider"] = "dzen"
		outputs["format"] = format
		outputs["title"] = title
		outputs["text"] = text
		outputs["media_url"] = mediaURL
		outputs["image_url"] = content.ImageURL
		outputs["video_url"] = content.VideoURL
		if dzenChannel != nil {
			outputs["channel_id"] = dzenChannel.ID
			outputs["channel_name"] = dzenChannel.Name
		} else {
			outputs["channel_name"] = "Дзен (Канал)"
		}
		return outputs, 0, 0, 0, nil

	case "social_photochka":
		if err := validateSocialNodeInputs(node.Type, inputs); err != nil {
			return nil, 0, 0, 0, err
		}
		content := readSocialContent(inputs)
		text := content.Text
		imageURL := content.ImageURL
		videoURL := content.VideoURL
		mediaURL := content.resolvedMediaURL()
		fileID := content.resolvedFileID()
		channelID := getString(inputs, "channelId", "")

		channels, _ := s.channelRepo.ListByWorkspace(ctx, workspaceID)
		var photochkaChannel *model.Channel
		for _, ch := range channels {
			if channelID != "" && ch.ID == channelID {
				photochkaChannel = &ch
				break
			}
			if channelID == "" && ch.Provider == model.ChannelProviderPhotochka {
				photochkaChannel = &ch
				break
			}
		}

		outputs["status"] = "success"
		outputs["provider"] = "photochka"
		outputs["text"] = text
		outputs["media_url"] = mediaURL
		outputs["image_url"] = imageURL
		outputs["video_url"] = videoURL
		outputs["file_id"] = fileID
		if photochkaChannel != nil {
			outputs["channel_id"] = photochkaChannel.ID
			outputs["channel_name"] = photochkaChannel.Name
		} else {
			outputs["channel_name"] = "Photochka (Канал)"
		}
		return outputs, 0, 0, 0, nil

	case "social_ok":
		if err := validateSocialNodeInputs(node.Type, inputs); err != nil {
			return nil, 0, 0, 0, err
		}
		text := readSocialContent(inputs).Text
		outputs["status"] = "success"
		outputs["provider"] = "ok"
		outputs["text"] = text
		return outputs, 0, 0, 0, nil

	case "draft_approval", "human_review":
		approvalOut, approvalErr := s.executeApprovalNode(ctx, workspaceID, userID, nil, nil, node, inputs, outputsAccumulator)
		if approvalErr != nil {
			return nil, 0, 0, 0, approvalErr
		}
		return approvalOut, 0, 0, 0, nil

	case "switch", "logic_switch":
		// Pass-through all input data to output
		for k, v := range inputs {
			outputs[k] = v
		}

		mode := getString(inputs, "mode", "rules")
		activeOutput := "output_0"

		if mode == "rules" {
			r0Val1 := getString(inputs, "rule0_value1", "")
			r0Op := getString(inputs, "rule0_operator", "not_empty")
			r0Val2 := getString(inputs, "rule0_value2", "")

			r1Val1 := getString(inputs, "rule1_value1", "")
			r1Op := getString(inputs, "rule1_operator", "is_empty")
			r1Val2 := getString(inputs, "rule1_value2", "")

			enableFallback := getBool(inputs, "enableFallback", true)

			if evaluateSwitchOperator(r0Val1, r0Op, r0Val2) {
				activeOutput = "output_0"
			} else if evaluateSwitchOperator(r1Val1, r1Op, r1Val2) {
				activeOutput = "output_1"
			} else if enableFallback {
				activeOutput = "fallback"
			} else {
				activeOutput = "output_1"
			}
		} else {
			expr := strings.TrimSpace(getString(inputs, "expression", "0"))
			if expr == "1" || expr == "output_1" {
				activeOutput = "output_1"
			} else if expr == "2" || expr == "fallback" {
				activeOutput = "fallback"
			} else {
				activeOutput = "output_0"
			}
		}

		outputs["active_output"] = activeOutput
		outputs["result"] = activeOutput
		return outputs, 0, 0, 0, nil

	case "logic_condition":
		left := getString(inputs, "leftValue", "")
		operator := getString(inputs, "operator", "not_empty")
		right := getString(inputs, "rightValue", "")
		res := evaluateSwitchOperator(left, operator, right)
		outputs["result"] = res
		if res {
			outputs["active_output"] = "output_0"
		} else {
			outputs["active_output"] = "output_1"
		}
		return outputs, 0, 0, 0, nil

	case "formatter":
		templateStr := getString(inputs, "template", "")
		if templateStr == "" {
			templateStr = getString(inputs, "text", "")
		}
		if templateStr == "" {
			templateStr = getString(inputs, "sourceText", "")
		}
		if strings.TrimSpace(templateStr) == "" {
			return nil, 0, 0, 0, errors.New("укажите шаблон текста")
		}
		outputs["text"] = templateStr
		outputs["result"] = templateStr
		return outputs, 0, 0, 0, nil

	case "plain_text":
		text := getString(inputs, "text", "")
		if strings.TrimSpace(text) == "" {
			return nil, 0, 0, 0, errors.New("укажите текст")
		}
		outputs["text"] = text
		return outputs, 0, 0, 0, nil

	case "merge":
		merged := executeMergeNode(inputs)
		for k, v := range merged {
			outputs[k] = v
		}
		return outputs, 0, 0, 0, nil

	case "set_fields":
		fieldsOut := executeSetFieldsNode(inputs, nil)
		for k, v := range fieldsOut {
			outputs[k] = v
		}
		return outputs, 0, 0, 0, nil

	case "http_request":
		httpOut, httpErr := s.executeHTTPRequest(ctx, inputs)
		if httpErr != nil {
			return httpOut, 0, 0, 0, httpErr
		}
		for k, v := range httpOut {
			outputs[k] = v
		}
		return outputs, 0, 0, 0, nil

	case "loop_items":
		for k, v := range inputs {
			outputs[k] = v
		}
		outputs["status"] = "loop_ready"
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

	if isWorkflowSocialNode(node.Type) {
		post, pubErr := s.postSvc.PublishWorkflowNodeTest(ctx, workspaceID, userID, node.Type, mergedInputs)
		if pubErr != nil {
			return nil, pubErr
		}
		outputs["published"] = true
		outputs["post_id"] = post.ID
		outputs["post_status"] = string(post.Status)
		if post.LastError != "" {
			outputs["last_error"] = post.LastError
		}
		for _, target := range post.Targets {
			if target.ProviderPostID != "" {
				outputs["provider_post_id"] = target.ProviderPostID
				break
			}
		}
		if post.PublishedAt != nil {
			outputs["published_at"] = post.PublishedAt.UTC().Format(time.RFC3339)
		}
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
			if val, valOk := getNestedMapValue(nodeOutputs, prop); valOk {
				return fmt.Sprintf("%v", val)
			}
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
			if val, valOk := getNestedMapValue(aliasOutputs, prop); valOk {
				return fmt.Sprintf("%v", val)
			}
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

func evaluateSwitchOperator(val1, op, val2 string) bool {
	v1 := strings.TrimSpace(val1)
	v2 := strings.TrimSpace(val2)
	lower1 := strings.ToLower(v1)
	lower2 := strings.ToLower(v2)

	switch op {
	case "not_empty":
		return v1 != ""
	case "is_empty":
		return v1 == ""
	case "equals", "equal", "==":
		return strings.EqualFold(v1, v2)
	case "not_equals", "not_equal", "!=":
		return !strings.EqualFold(v1, v2)
	case "contains":
		return strings.Contains(lower1, lower2)
	case "not_contains":
		return !strings.Contains(lower1, lower2)
	case "starts_with":
		return strings.HasPrefix(lower1, lower2)
	case "ends_with":
		return strings.HasSuffix(lower1, lower2)
	case "greater_than", ">":
		f1, err1 := strconv.ParseFloat(v1, 64)
		f2, err2 := strconv.ParseFloat(v2, 64)
		if err1 == nil && err2 == nil {
			return f1 > f2
		}
		return v1 > v2
	case "less_than", "<":
		f1, err1 := strconv.ParseFloat(v1, 64)
		f2, err2 := strconv.ParseFloat(v2, 64)
		if err1 == nil && err2 == nil {
			return f1 < f2
		}
		return v1 < v2
	case "greater_than_or_equal", ">=":
		f1, err1 := strconv.ParseFloat(v1, 64)
		f2, err2 := strconv.ParseFloat(v2, 64)
		if err1 == nil && err2 == nil {
			return f1 >= f2
		}
		return v1 >= v2
	case "less_than_or_equal", "<=":
		f1, err1 := strconv.ParseFloat(v1, 64)
		f2, err2 := strconv.ParseFloat(v2, 64)
		if err1 == nil && err2 == nil {
			return f1 <= f2
		}
		return v1 <= v2
	case "is_true":
		return lower1 == "true" || lower1 == "1" || lower1 == "yes"
	case "is_false":
		return lower1 == "false" || lower1 == "0" || lower1 == "no" || lower1 == ""
	case "regex":
		matched, err := regexp.MatchString(val2, val1)
		return err == nil && matched
	default:
		return v1 == v2
	}
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
	case "plain_text":
		return "Текст"
	case "ai_image":
		return "AI Изображение"
	case "ai_video":
		return "AI Видео"
	case "social_telegram":
		return "Telegram Пост"
	case "social_max":
		return "MAX Пост"
	case "social_vk":
		return "ВКонтакте Пост"
	case "social_youtube":
		return "YouTube Shorts"
	case "social_rutube":
		return "Rutube Видео"
	case "social_dzen":
		return "Дзен Пост"
	case "social_photochka":
		return "Photochka Пост"
	case "switch", "logic_switch":
		return "Разветвление (Switch)"
	case "logic_condition":
		return "Проверка условия"
	case "formatter":
		return "Форматирование текста"
	case "merge":
		return "Merge"
	case "set_fields":
		return "Сборка полей"
	case "http_request":
		return "HTTP запрос"
	case "loop_items":
		return "Цикл по списку"
	case "draft_approval", "human_review":
		return "Согласование"
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
