package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
)

const workflowWebhookTestTTL = 2 * time.Minute

var (
	ErrWorkflowWebhookInvalid   = errors.New("invalid workflow webhook")
	ErrWorkflowWebhookTestBusy  = errors.New("webhook test already running")
	ErrWorkflowWebhookTestIdle  = errors.New("webhook test is not active")
)

type workflowWebhookPayload struct {
	Method    string                 `json:"method"`
	Headers   map[string]string      `json:"headers"`
	Body      map[string]interface{} `json:"body"`
	RawBody   string                 `json:"raw_body,omitempty"`
	Query     map[string]string      `json:"query,omitempty"`
	ReceivedAt time.Time             `json:"received_at"`
}

type workflowWebhookTestSession struct {
	WorkflowID  string
	WorkspaceID string
	UserID      string
	StartedAt   time.Time
	ExpiresAt   time.Time
	Received    *workflowWebhookPayload
}

type workflowWebhookRegistry struct {
	mu       sync.RWMutex
	sessions map[string]*workflowWebhookTestSession
}

func newWorkflowWebhookRegistry() *workflowWebhookRegistry {
	return &workflowWebhookRegistry{
		sessions: make(map[string]*workflowWebhookTestSession),
	}
}

func (r *workflowWebhookRegistry) start(workflowID string, session *workflowWebhookTestSession) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if existing, ok := r.sessions[workflowID]; ok && existing.ExpiresAt.After(time.Now()) && existing.Received == nil {
		return ErrWorkflowWebhookTestBusy
	}
	r.sessions[workflowID] = session
	return nil
}

func (r *workflowWebhookRegistry) stop(workflowID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.sessions, workflowID)
}

func (r *workflowWebhookRegistry) get(workflowID string) *workflowWebhookTestSession {
	r.mu.RLock()
	defer r.mu.RUnlock()
	session := r.sessions[workflowID]
	if session == nil {
		return nil
	}
	if session.ExpiresAt.Before(time.Now()) {
		return nil
	}
	return session
}

func (r *workflowWebhookRegistry) capture(workflowID string, payload workflowWebhookPayload) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	session := r.sessions[workflowID]
	if session == nil || session.ExpiresAt.Before(time.Now()) {
		return false
	}
	payloadCopy := payload
	session.Received = &payloadCopy
	return true
}

func generateWorkflowWebhookSecret() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func (s *WorkflowService) ensureWebhookSecret(ctx context.Context, w *model.Workflow) error {
	if strings.TrimSpace(w.WebhookSecret) != "" {
		return nil
	}
	secret, err := generateWorkflowWebhookSecret()
	if err != nil {
		return err
	}
	w.WebhookSecret = secret
	_, err = s.repo.Update(ctx, w)
	return err
}

func (s *WorkflowService) GetWorkflowWebhookInfo(ctx context.Context, id, workspaceID string) (*model.WorkflowWebhookInfoResponse, error) {
	w, err := s.GetWorkflow(ctx, id, workspaceID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureWebhookSecret(ctx, w); err != nil {
		return nil, err
	}
	if s.cfg == nil {
		return nil, errors.New("workflow webhook config is unavailable")
	}
	return &model.WorkflowWebhookInfoResponse{
		WebhookURL:       s.cfg.WorkflowWebhookURL(w.ID, w.WebhookSecret),
		WebhookSecretSet: strings.TrimSpace(w.WebhookSecret) != "",
	}, nil
}

func (s *WorkflowService) StartWorkflowWebhookTest(ctx context.Context, id, workspaceID, userID string) (*model.WorkflowWebhookTestStatusResponse, error) {
	w, err := s.GetWorkflow(ctx, id, workspaceID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureWebhookSecret(ctx, w); err != nil {
		return nil, err
	}
	if s.webhookTests == nil {
		s.webhookTests = newWorkflowWebhookRegistry()
	}

	now := time.Now()
	expiresAt := now.Add(workflowWebhookTestTTL)
	session := &workflowWebhookTestSession{
		WorkflowID:  w.ID,
		WorkspaceID: workspaceID,
		UserID:      userID,
		StartedAt:   now,
		ExpiresAt:   expiresAt,
	}
	if err := s.webhookTests.start(w.ID, session); err != nil {
		return nil, err
	}
	return &model.WorkflowWebhookTestStatusResponse{
		Listening: true,
		ExpiresAt: &expiresAt,
	}, nil
}

func (s *WorkflowService) StopWorkflowWebhookTest(ctx context.Context, id, workspaceID string) (*model.WorkflowWebhookTestStatusResponse, error) {
	if _, err := s.GetWorkflow(ctx, id, workspaceID); err != nil {
		return nil, err
	}
	if s.webhookTests != nil {
		s.webhookTests.stop(id)
	}
	return &model.WorkflowWebhookTestStatusResponse{Listening: false}, nil
}

func (s *WorkflowService) GetWorkflowWebhookTestStatus(ctx context.Context, id, workspaceID string) (*model.WorkflowWebhookTestStatusResponse, error) {
	if _, err := s.GetWorkflow(ctx, id, workspaceID); err != nil {
		return nil, err
	}
	if s.webhookTests == nil {
		return &model.WorkflowWebhookTestStatusResponse{Listening: false}, nil
	}

	session := s.webhookTests.get(id)
	if session == nil {
		return &model.WorkflowWebhookTestStatusResponse{Listening: false}, nil
	}

	resp := &model.WorkflowWebhookTestStatusResponse{
		Listening: session.Received == nil,
		ExpiresAt: &session.ExpiresAt,
	}
	if session.Received != nil {
		received := map[string]interface{}{
			"method":      session.Received.Method,
			"headers":     session.Received.Headers,
			"body":        session.Received.Body,
			"raw_body":    session.Received.RawBody,
			"query":       session.Received.Query,
			"received_at": session.Received.ReceivedAt,
		}
		resp.Received = received
		resp.ReceivedAt = &session.Received.ReceivedAt
		resp.Listening = false
	} else if session.ExpiresAt.Before(time.Now()) {
		s.webhookTests.stop(id)
		resp.Listening = false
		resp.Error = "Время ожидания истекло. Запустите прослушивание снова."
	}
	return resp, nil
}

func (s *WorkflowService) HandleWorkflowWebhook(ctx context.Context, workflowID, secret string, r *http.Request) (map[string]interface{}, error) {
	w, err := s.repo.GetByWebhook(ctx, workflowID, secret)
	if err != nil {
		return nil, ErrWorkflowWebhookInvalid
	}

	payload, err := parseWorkflowWebhookRequest(r)
	if err != nil {
		return nil, err
	}

	if s.webhookTests != nil {
		if s.webhookTests.capture(workflowID, payload) {
			return map[string]interface{}{
				"ok":      true,
				"mode":    "test",
				"message": "Тестовый webhook получен",
			}, nil
		}
	}

	if !w.IsActive || w.TriggerType != model.WorkflowTriggerWebhook {
		return map[string]interface{}{
			"ok":      true,
			"mode":    "ignored",
			"message": "Процесс не активен или не настроен на webhook",
		}, nil
	}

	inputs := webhookPayloadToInputs(payload)
	_, err = s.TriggerRun(ctx, w.ID, w.WorkspaceID, "", "webhook", inputs)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"ok":      true,
		"mode":    "run",
		"message": "Процесс запущен",
	}, nil
}

func parseWorkflowWebhookRequest(r *http.Request) (workflowWebhookPayload, error) {
	rawBody, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		return workflowWebhookPayload{}, err
	}

	headers := make(map[string]string)
	for key, values := range r.Header {
		if len(values) == 0 {
			continue
		}
		headers[key] = values[0]
	}

	query := make(map[string]string)
	for key, values := range r.URL.Query() {
		if len(values) > 0 {
			query[key] = values[0]
		}
	}

	body := make(map[string]interface{})
	if len(rawBody) > 0 {
		if err := json.Unmarshal(rawBody, &body); err != nil {
			body = map[string]interface{}{
				"raw_body": string(rawBody),
			}
		}
	}

	return workflowWebhookPayload{
		Method:     r.Method,
		Headers:    headers,
		Body:       body,
		RawBody:    string(rawBody),
		Query:      query,
		ReceivedAt: time.Now(),
	}, nil
}

func webhookPayloadToInputs(payload workflowWebhookPayload) map[string]interface{} {
	inputs := map[string]interface{}{
		"method":  payload.Method,
		"headers": payload.Headers,
		"query":   payload.Query,
		"body":    payload.Body,
	}
	if payload.RawBody != "" {
		inputs["raw_body"] = payload.RawBody
	}
	if len(payload.Body) == 1 {
		if raw, ok := payload.Body["raw_body"].(string); ok {
			inputs["payload"] = raw
		}
	} else if len(payload.Body) > 0 {
		inputs["payload"] = payload.Body
	}
	return inputs
}

// SetWorkflowConfig wires runtime config for webhook URL generation.
func (s *WorkflowService) SetWorkflowConfig(cfg *config.Config) {
	s.cfg = cfg
	if s.webhookTests == nil {
		s.webhookTests = newWorkflowWebhookRegistry()
	}
}
