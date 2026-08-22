package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type WorkflowRepository struct {
	pool *pgxpool.Pool
}

func NewWorkflowRepository(pool *pgxpool.Pool) *WorkflowRepository {
	return &WorkflowRepository{pool: pool}
}

const workflowColumns = `
	id, workspace_id, created_by::text, name, description, is_active, trigger_type,
	schedule_cron, schedule_tz, webhook_secret, rss_feed_url, rss_poll_interval_minutes,
	next_run_at, graph, created_at, updated_at
`

func scanWorkflow(row pgx.Row) (*model.Workflow, error) {
	var w model.Workflow
	var createdBy *string
	var graphRaw []byte
	err := row.Scan(
		&w.ID, &w.WorkspaceID, &createdBy, &w.Name, &w.Description, &w.IsActive, &w.TriggerType,
		&w.ScheduleCron, &w.ScheduleTZ, &w.WebhookSecret, &w.RSSFeedURL, &w.RSSPollIntervalMinutes,
		&w.NextRunAt, &graphRaw, &w.CreatedAt, &w.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	w.CreatedBy = createdBy
	if len(graphRaw) > 0 {
		_ = json.Unmarshal(graphRaw, &w.Graph)
	}
	if w.Graph.Nodes == nil {
		w.Graph.Nodes = make([]model.WorkflowNode, 0)
	}
	if w.Graph.Edges == nil {
		w.Graph.Edges = make([]model.WorkflowEdge, 0)
	}
	return &w, nil
}

func (r *WorkflowRepository) ListByWorkspace(ctx context.Context, workspaceID string) ([]model.Workflow, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM workflows
		WHERE workspace_id = $1
		ORDER BY created_at DESC
	`, workflowColumns)

	rows, err := r.pool.Query(ctx, query, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.Workflow
	for rows.Next() {
		w, err := scanWorkflow(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *w)
	}
	if list == nil {
		list = make([]model.Workflow, 0)
	}
	return list, nil
}

func (r *WorkflowRepository) CountByWorkspace(ctx context.Context, workspaceID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM workflows WHERE workspace_id = $1`, workspaceID).Scan(&count)
	return count, err
}

func (r *WorkflowRepository) GetByID(ctx context.Context, id, workspaceID string) (*model.Workflow, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM workflows
		WHERE id = $1 AND workspace_id = $2
	`, workflowColumns)

	row := r.pool.QueryRow(ctx, query, id, workspaceID)
	return scanWorkflow(row)
}

func (r *WorkflowRepository) GetByIDAdmin(ctx context.Context, id string) (*model.Workflow, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM workflows
		WHERE id = $1
	`, workflowColumns)

	row := r.pool.QueryRow(ctx, query, id)
	return scanWorkflow(row)
}

func (r *WorkflowRepository) Create(ctx context.Context, w *model.Workflow) (*model.Workflow, error) {
	graphBytes, err := json.Marshal(w.Graph)
	if err != nil {
		return nil, fmt.Errorf("marshal graph: %w", err)
	}

	query := fmt.Sprintf(`
		INSERT INTO workflows (
			workspace_id, created_by, name, description, is_active, trigger_type,
			schedule_cron, schedule_tz, webhook_secret, rss_feed_url, rss_poll_interval_minutes,
			next_run_at, graph
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
		)
		RETURNING %s
	`, workflowColumns)

	row := r.pool.QueryRow(ctx, query,
		w.WorkspaceID, w.CreatedBy, w.Name, w.Description, w.IsActive, w.TriggerType,
		w.ScheduleCron, w.ScheduleTZ, w.WebhookSecret, w.RSSFeedURL, w.RSSPollIntervalMinutes,
		w.NextRunAt, graphBytes,
	)
	return scanWorkflow(row)
}

func (r *WorkflowRepository) Update(ctx context.Context, w *model.Workflow) (*model.Workflow, error) {
	graphBytes, err := json.Marshal(w.Graph)
	if err != nil {
		return nil, fmt.Errorf("marshal graph: %w", err)
	}

	query := fmt.Sprintf(`
		UPDATE workflows SET
			name = $3,
			description = $4,
			is_active = $5,
			trigger_type = $6,
			schedule_cron = $7,
			schedule_tz = $8,
			webhook_secret = $9,
			rss_feed_url = $10,
			rss_poll_interval_minutes = $11,
			next_run_at = $12,
			graph = $13,
			updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2
		RETURNING %s
	`, workflowColumns)

	row := r.pool.QueryRow(ctx, query,
		w.ID, w.WorkspaceID, w.Name, w.Description, w.IsActive, w.TriggerType,
		w.ScheduleCron, w.ScheduleTZ, w.WebhookSecret, w.RSSFeedURL, w.RSSPollIntervalMinutes,
		w.NextRunAt, graphBytes,
	)
	return scanWorkflow(row)
}

func (r *WorkflowRepository) GetByWebhook(ctx context.Context, id, secret string) (*model.Workflow, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM workflows
		WHERE id = $1 AND webhook_secret = $2 AND webhook_secret <> ''
	`, workflowColumns)

	row := r.pool.QueryRow(ctx, query, id, secret)
	return scanWorkflow(row)
}

func (r *WorkflowRepository) Delete(ctx context.Context, id, workspaceID string) error {
	cmd, err := r.pool.Exec(ctx, `DELETE FROM workflows WHERE id = $1 AND workspace_id = $2`, id, workspaceID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// Templates

const templateColumns = `
	id, name, description, category, icon, is_system, is_active, graph, sort_order, created_at, updated_at
`

func scanTemplate(row pgx.Row) (*model.WorkflowTemplate, error) {
	var t model.WorkflowTemplate
	var graphRaw []byte
	err := row.Scan(
		&t.ID, &t.Name, &t.Description, &t.Category, &t.Icon, &t.IsSystem, &t.IsActive,
		&graphRaw, &t.SortOrder, &t.CreatedAt, &t.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if len(graphRaw) > 0 {
		_ = json.Unmarshal(graphRaw, &t.Graph)
	}
	if t.Graph.Nodes == nil {
		t.Graph.Nodes = make([]model.WorkflowNode, 0)
	}
	if t.Graph.Edges == nil {
		t.Graph.Edges = make([]model.WorkflowEdge, 0)
	}
	return &t, nil
}

func (r *WorkflowRepository) ListTemplates(ctx context.Context, onlyActive bool) ([]model.WorkflowTemplate, error) {
	where := ""
	if onlyActive {
		where = "WHERE is_active = true"
	}
	query := fmt.Sprintf(`
		SELECT %s FROM workflow_templates
		%s
		ORDER BY sort_order ASC, created_at ASC
	`, templateColumns, where)

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.WorkflowTemplate
	for rows.Next() {
		t, err := scanTemplate(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *t)
	}
	if list == nil {
		list = make([]model.WorkflowTemplate, 0)
	}
	return list, nil
}

func (r *WorkflowRepository) GetTemplateByID(ctx context.Context, id string) (*model.WorkflowTemplate, error) {
	query := fmt.Sprintf(`SELECT %s FROM workflow_templates WHERE id = $1`, templateColumns)
	row := r.pool.QueryRow(ctx, query, id)
	return scanTemplate(row)
}

func (r *WorkflowRepository) CreateTemplate(ctx context.Context, t *model.WorkflowTemplate) (*model.WorkflowTemplate, error) {
	graphBytes, err := json.Marshal(t.Graph)
	if err != nil {
		return nil, fmt.Errorf("marshal graph: %w", err)
	}

	query := fmt.Sprintf(`
		INSERT INTO workflow_templates (
			name, description, category, icon, is_system, is_active, graph, sort_order
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING %s
	`, templateColumns)

	row := r.pool.QueryRow(ctx, query,
		t.Name, t.Description, t.Category, t.Icon, t.IsSystem, t.IsActive, graphBytes, t.SortOrder,
	)
	return scanTemplate(row)
}

func (r *WorkflowRepository) UpdateTemplate(ctx context.Context, t *model.WorkflowTemplate) (*model.WorkflowTemplate, error) {
	graphBytes, err := json.Marshal(t.Graph)
	if err != nil {
		return nil, fmt.Errorf("marshal graph: %w", err)
	}

	query := fmt.Sprintf(`
		UPDATE workflow_templates SET
			name = $2,
			description = $3,
			category = $4,
			icon = $5,
			is_active = $6,
			graph = $7,
			sort_order = $8,
			updated_at = NOW()
		WHERE id = $1
		RETURNING %s
	`, templateColumns)

	row := r.pool.QueryRow(ctx, query,
		t.ID, t.Name, t.Description, t.Category, t.Icon, t.IsActive, graphBytes, t.SortOrder,
	)
	return scanTemplate(row)
}

func (r *WorkflowRepository) DeleteTemplate(ctx context.Context, id string) error {
	cmd, err := r.pool.Exec(ctx, `DELETE FROM workflow_templates WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// Runs

const runColumns = `
	id, workflow_id, workspace_id, triggered_by::text, trigger_source, status, error_message,
	context_data, tokens_used, credits_used, kopecks_spent, started_at, finished_at, created_at
`

func scanRun(row pgx.Row) (*model.WorkflowRun, error) {
	var run model.WorkflowRun
	var triggeredBy *string
	var contextRaw []byte
	err := row.Scan(
		&run.ID, &run.WorkflowID, &run.WorkspaceID, &triggeredBy, &run.TriggerSource,
		&run.Status, &run.ErrorMessage, &contextRaw, &run.TokensUsed, &run.CreditsUsed,
		&run.KopecksSpent, &run.StartedAt, &run.FinishedAt, &run.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	run.TriggeredBy = triggeredBy
	if len(contextRaw) > 0 {
		_ = json.Unmarshal(contextRaw, &run.ContextData)
	}
	if run.ContextData == nil {
		run.ContextData = make(map[string]interface{})
	}
	return &run, nil
}

func (r *WorkflowRepository) CreateRun(ctx context.Context, run *model.WorkflowRun) (*model.WorkflowRun, error) {
	contextBytes, _ := json.Marshal(run.ContextData)
	if contextBytes == nil {
		contextBytes = []byte("{}")
	}

	query := fmt.Sprintf(`
		INSERT INTO workflow_runs (
			workflow_id, workspace_id, triggered_by, trigger_source, status,
			error_message, context_data, tokens_used, credits_used, kopecks_spent, started_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		)
		RETURNING %s
	`, runColumns)

	row := r.pool.QueryRow(ctx, query,
		run.WorkflowID, run.WorkspaceID, run.TriggeredBy, run.TriggerSource, run.Status,
		run.ErrorMessage, contextBytes, run.TokensUsed, run.CreditsUsed, run.KopecksSpent, run.StartedAt,
	)
	return scanRun(row)
}

func (r *WorkflowRepository) GetRunByID(ctx context.Context, runID, workspaceID string) (*model.WorkflowRun, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM workflow_runs
		WHERE id = $1 AND workspace_id = $2
	`, runColumns)

	row := r.pool.QueryRow(ctx, query, runID, workspaceID)
	return scanRun(row)
}

func (r *WorkflowRepository) ListRunsByWorkflow(ctx context.Context, workflowID, workspaceID string, limit int) ([]model.WorkflowRun, error) {
	if limit <= 0 || limit > 100 {
		limit = 30
	}
	query := fmt.Sprintf(`
		SELECT %s FROM workflow_runs
		WHERE workflow_id = $1 AND workspace_id = $2
		ORDER BY created_at DESC
		LIMIT $3
	`, runColumns)

	rows, err := r.pool.Query(ctx, query, workflowID, workspaceID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.WorkflowRun
	for rows.Next() {
		run, err := scanRun(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *run)
	}
	if list == nil {
		list = make([]model.WorkflowRun, 0)
	}
	return list, nil
}

func (r *WorkflowRepository) UpdateRun(ctx context.Context, run *model.WorkflowRun) error {
	contextBytes, _ := json.Marshal(run.ContextData)
	if contextBytes == nil {
		contextBytes = []byte("{}")
	}

	query := `
		UPDATE workflow_runs SET
			status = $2,
			error_message = $3,
			context_data = $4,
			tokens_used = $5,
			credits_used = $6,
			kopecks_spent = $7,
			started_at = $8,
			finished_at = $9
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query,
		run.ID, run.Status, run.ErrorMessage, contextBytes,
		run.TokensUsed, run.CreditsUsed, run.KopecksSpent,
		run.StartedAt, run.FinishedAt,
	)
	return err
}

// Run Steps

const stepColumns = `
	id, run_id, node_id, node_type, node_title, status, inputs, outputs, error_message,
	started_at, finished_at, duration_ms
`

func scanStep(row pgx.Row) (*model.WorkflowRunStep, error) {
	var step model.WorkflowRunStep
	var inputsRaw, outputsRaw []byte
	err := row.Scan(
		&step.ID, &step.RunID, &step.NodeID, &step.NodeType, &step.NodeTitle,
		&step.Status, &inputsRaw, &outputsRaw, &step.ErrorMessage,
		&step.StartedAt, &step.FinishedAt, &step.DurationMS,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if len(inputsRaw) > 0 {
		_ = json.Unmarshal(inputsRaw, &step.Inputs)
	}
	if step.Inputs == nil {
		step.Inputs = make(map[string]interface{})
	}
	if len(outputsRaw) > 0 {
		_ = json.Unmarshal(outputsRaw, &step.Outputs)
	}
	if step.Outputs == nil {
		step.Outputs = make(map[string]interface{})
	}
	return &step, nil
}

func (r *WorkflowRepository) CreateRunStep(ctx context.Context, step *model.WorkflowRunStep) (*model.WorkflowRunStep, error) {
	inputsBytes, _ := json.Marshal(step.Inputs)
	outputsBytes, _ := json.Marshal(step.Outputs)

	query := fmt.Sprintf(`
		INSERT INTO workflow_run_steps (
			run_id, node_id, node_type, node_title, status, inputs, outputs,
			error_message, started_at, finished_at, duration_ms
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		)
		RETURNING %s
	`, stepColumns)

	row := r.pool.QueryRow(ctx, query,
		step.RunID, step.NodeID, step.NodeType, step.NodeTitle, step.Status,
		inputsBytes, outputsBytes, step.ErrorMessage, step.StartedAt, step.FinishedAt, step.DurationMS,
	)
	return scanStep(row)
}

func (r *WorkflowRepository) UpdateRunStep(ctx context.Context, step *model.WorkflowRunStep) error {
	inputsBytes, _ := json.Marshal(step.Inputs)
	outputsBytes, _ := json.Marshal(step.Outputs)

	query := `
		UPDATE workflow_run_steps SET
			status = $2,
			inputs = $3,
			outputs = $4,
			error_message = $5,
			started_at = $6,
			finished_at = $7,
			duration_ms = $8
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query,
		step.ID, step.Status, inputsBytes, outputsBytes, step.ErrorMessage,
		step.StartedAt, step.FinishedAt, step.DurationMS,
	)
	return err
}

func (r *WorkflowRepository) ListRunSteps(ctx context.Context, runID string) ([]model.WorkflowRunStep, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM workflow_run_steps
		WHERE run_id = $1
		ORDER BY started_at ASC, id ASC
	`, stepColumns)

	rows, err := r.pool.Query(ctx, query, runID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.WorkflowRunStep
	for rows.Next() {
		step, err := scanStep(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *step)
	}
	if list == nil {
		list = make([]model.WorkflowRunStep, 0)
	}
	return list, nil
}

func (r *WorkflowRepository) GetStats(ctx context.Context) (*model.WorkflowStatsResponse, error) {
	var stats model.WorkflowStatsResponse
	row := r.pool.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM workflows),
			(SELECT COUNT(*) FROM workflows WHERE is_active = true),
			(SELECT COUNT(*) FROM workflow_runs),
			(SELECT COUNT(*) FROM workflow_runs WHERE status = 'completed'),
			(SELECT COUNT(*) FROM workflow_runs WHERE status = 'failed')
	`)
	err := row.Scan(&stats.TotalWorkflows, &stats.ActiveWorkflows, &stats.TotalRuns, &stats.SuccessfulRuns, &stats.FailedRuns)
	if err != nil {
		return nil, err
	}
	return &stats, nil
}

func (r *WorkflowRepository) ListDueRSSWorkflows(ctx context.Context, limit int) ([]model.Workflow, error) {
	if limit <= 0 {
		limit = 50
	}
	query := fmt.Sprintf(`
		SELECT %s FROM workflows
		WHERE is_active = true
		  AND trigger_type = 'rss'
		  AND rss_feed_url <> ''
		  AND (next_run_at IS NULL OR next_run_at <= NOW())
		ORDER BY next_run_at NULLS FIRST, created_at ASC
		LIMIT $1
	`, workflowColumns)

	rows, err := r.pool.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.Workflow
	for rows.Next() {
		w, err := scanWorkflow(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *w)
	}
	if list == nil {
		list = make([]model.Workflow, 0)
	}
	return list, nil
}

func (r *WorkflowRepository) UpdateNextRunAt(ctx context.Context, workflowID string, nextRunAt *time.Time) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE workflows SET next_run_at = $2, updated_at = NOW() WHERE id = $1
	`, workflowID, nextRunAt)
	return err
}

func (r *WorkflowRepository) IsRSSItemSeen(ctx context.Context, workflowID, itemKey string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM workflow_rss_seen WHERE workflow_id = $1 AND item_key = $2
		)
	`, workflowID, itemKey).Scan(&exists)
	return exists, err
}

func (r *WorkflowRepository) MarkRSSItemSeen(ctx context.Context, workflowID, itemKey string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO workflow_rss_seen (workflow_id, item_key)
		VALUES ($1, $2)
		ON CONFLICT (workflow_id, item_key) DO NOTHING
	`, workflowID, itemKey)
	return err
}

func (r *WorkflowRepository) HasAnyRSSSeen(ctx context.Context, workflowID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM workflow_rss_seen WHERE workflow_id = $1)
	`, workflowID).Scan(&exists)
	return exists, err
}
