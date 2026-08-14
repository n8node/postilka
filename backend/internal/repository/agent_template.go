package repository

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type AgentTemplateRepository struct {
	pool *pgxpool.Pool
}

func NewAgentTemplateRepository(pool *pgxpool.Pool) *AgentTemplateRepository {
	return &AgentTemplateRepository{pool: pool}
}

const agentTemplateColumns = `
	id, COALESCE(workspace_id::text, ''), COALESCE(created_by_user_id::text, ''),
	kind, slug, name, description, prompt, tools, settings,
	require_approval, is_active, created_at, updated_at
`

func scanAgentTemplate(row pgx.Row) (*model.AgentTemplate, error) {
	var t model.AgentTemplate
	var toolsRaw, settingsRaw []byte
	err := row.Scan(
		&t.ID, &t.WorkspaceID, &t.CreatedByUserID, &t.Kind, &t.Slug, &t.Name,
		&t.Description, &t.Prompt, &toolsRaw, &settingsRaw,
		&t.RequireApproval, &t.IsActive, &t.CreatedAt, &t.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if len(toolsRaw) > 0 {
		_ = json.Unmarshal(toolsRaw, &t.Tools)
	}
	if t.Tools == nil {
		t.Tools = []string{}
	}
	if len(settingsRaw) > 0 {
		_ = json.Unmarshal(settingsRaw, &t.Settings)
	}
	return &t, nil
}

func (r *AgentTemplateRepository) ListAvailable(ctx context.Context, workspaceID string) ([]model.AgentTemplate, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+agentTemplateColumns+`
		FROM agent_templates
		WHERE is_active = TRUE
		  AND (kind = 'system' OR workspace_id = $1)
		ORDER BY kind ASC, name ASC
	`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.AgentTemplate, 0)
	for rows.Next() {
		t, err := scanAgentTemplate(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *t)
	}
	return out, rows.Err()
}

func (r *AgentTemplateRepository) ListSystem(ctx context.Context) ([]model.AgentTemplate, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+agentTemplateColumns+`
		FROM agent_templates
		WHERE kind = 'system'
		ORDER BY name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.AgentTemplate, 0)
	for rows.Next() {
		t, err := scanAgentTemplate(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *t)
	}
	return out, rows.Err()
}

func (r *AgentTemplateRepository) Get(ctx context.Context, id string) (*model.AgentTemplate, error) {
	return scanAgentTemplate(r.pool.QueryRow(ctx, `
		SELECT `+agentTemplateColumns+` FROM agent_templates WHERE id = $1
	`, id))
}

func (r *AgentTemplateRepository) GetUsable(ctx context.Context, workspaceID, id string) (*model.AgentTemplate, error) {
	t, err := r.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if !t.IsActive {
		return nil, ErrNotFound
	}
	if t.Kind == model.AgentTemplateKindSystem {
		return t, nil
	}
	if t.WorkspaceID != workspaceID {
		return nil, ErrNotFound
	}
	return t, nil
}

func (r *AgentTemplateRepository) CreateUser(ctx context.Context, workspaceID, userID string, t model.AgentTemplate) (*model.AgentTemplate, error) {
	toolsRaw, err := json.Marshal(t.Tools)
	if err != nil {
		return nil, err
	}
	settingsRaw, err := json.Marshal(t.Settings)
	if err != nil {
		return nil, err
	}
	var id string
	err = r.pool.QueryRow(ctx, `
		INSERT INTO agent_templates (
			workspace_id, created_by_user_id, kind, slug, name, description, prompt,
			tools, settings, require_approval, is_active
		) VALUES ($1, $2, 'user', $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id
	`, workspaceID, userID, t.Slug, t.Name, t.Description, t.Prompt,
		toolsRaw, settingsRaw, t.RequireApproval, t.IsActive).Scan(&id)
	if err != nil {
		return nil, err
	}
	return r.Get(ctx, id)
}

func (r *AgentTemplateRepository) Update(ctx context.Context, t *model.AgentTemplate) (*model.AgentTemplate, error) {
	toolsRaw, err := json.Marshal(t.Tools)
	if err != nil {
		return nil, err
	}
	settingsRaw, err := json.Marshal(t.Settings)
	if err != nil {
		return nil, err
	}
	tag, err := r.pool.Exec(ctx, `
		UPDATE agent_templates
		SET name = $2, description = $3, prompt = $4, tools = $5, settings = $6,
		    require_approval = $7, is_active = $8, slug = $9, updated_at = NOW()
		WHERE id = $1
	`, t.ID, t.Name, t.Description, t.Prompt, toolsRaw, settingsRaw,
		t.RequireApproval, t.IsActive, t.Slug)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	return r.Get(ctx, t.ID)
}

func (r *AgentTemplateRepository) DeleteUser(ctx context.Context, workspaceID, id string) error {
	tag, err := r.pool.Exec(ctx, `
		DELETE FROM agent_templates WHERE id = $1 AND workspace_id = $2 AND kind = 'user'
	`, id, workspaceID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func NormalizeTemplateSlug(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	s = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			return r
		}
		if r == ' ' || r == '_' || r == '-' {
			return '-'
		}
		return -1
	}, s)
	s = strings.Trim(s, "-")
	if s == "" {
		s = "agent"
	}
	if len(s) > 48 {
		s = s[:48]
	}
	return s
}

func UniqueTemplateSlug(base string, now time.Time) string {
	return NormalizeTemplateSlug(base) + "-" + now.UTC().Format("20060102150405")
}
