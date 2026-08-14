package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type MissionRepository struct {
	pool *pgxpool.Pool
}

func NewMissionRepository(pool *pgxpool.Pool) *MissionRepository {
	return &MissionRepository{pool: pool}
}

const missionColumns = `
	id, workspace_id, COALESCE(agent_template_id::text, ''), COALESCE(created_by_user_id::text, ''),
	title, goal, metric, metric_target, status, channel_ids, starts_at, ends_at, frequency,
	constraints, brief, plan, measurability, result, created_at, updated_at
`

func scanMission(row pgx.Row) (*model.Mission, error) {
	var m model.Mission
	var channelRaw, constraintsRaw, briefRaw, planRaw, resultRaw []byte
	err := row.Scan(
		&m.ID, &m.WorkspaceID, &m.AgentTemplateID, &m.CreatedByUserID,
		&m.Title, &m.Goal, &m.Metric, &m.MetricTarget, &m.Status, &channelRaw,
		&m.StartsAt, &m.EndsAt, &m.Frequency, &constraintsRaw, &briefRaw, &planRaw,
		&m.Measurability, &resultRaw, &m.CreatedAt, &m.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if len(channelRaw) > 0 {
		_ = json.Unmarshal(channelRaw, &m.ChannelIDs)
	}
	if m.ChannelIDs == nil {
		m.ChannelIDs = []string{}
	}
	if len(constraintsRaw) > 0 {
		_ = json.Unmarshal(constraintsRaw, &m.Constraints)
	}
	if m.Constraints == nil {
		m.Constraints = map[string]any{}
	}
	if len(briefRaw) > 0 {
		_ = json.Unmarshal(briefRaw, &m.Brief)
	}
	if len(planRaw) > 0 {
		_ = json.Unmarshal(planRaw, &m.Plan)
	}
	if m.Plan.Items == nil {
		m.Plan.Items = []model.MissionPlanItem{}
	}
	if len(resultRaw) > 0 {
		_ = json.Unmarshal(resultRaw, &m.Result)
	}
	return &m, nil
}

type MissionListFilter struct {
	WorkspaceID string
	Status      string
	Limit       int
	Offset      int
}

func (r *MissionRepository) List(ctx context.Context, filter MissionListFilter) ([]model.Mission, int, error) {
	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}
	conditions := []string{"m.workspace_id = $1"}
	args := []any{filter.WorkspaceID}
	argN := 2
	if filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("m.status = $%d", argN))
		args = append(args, filter.Status)
		argN++
	}
	where := strings.Join(conditions, " AND ")

	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM missions m WHERE `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT ` + missionColumns + `,
			COALESCE((SELECT name FROM agent_templates t WHERE t.id = m.agent_template_id), ''),
			(SELECT COUNT(*) FROM posts p WHERE p.mission_id = m.id)
		FROM missions m
		WHERE ` + where + `
		ORDER BY m.updated_at DESC
		LIMIT ` + fmt.Sprintf("$%d OFFSET $%d", argN, argN+1)
	args = append(args, limit, offset)
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]model.Mission, 0)
	for rows.Next() {
		var m model.Mission
		var channelRaw, constraintsRaw, briefRaw, planRaw, resultRaw []byte
		if err := rows.Scan(
			&m.ID, &m.WorkspaceID, &m.AgentTemplateID, &m.CreatedByUserID,
			&m.Title, &m.Goal, &m.Metric, &m.MetricTarget, &m.Status, &channelRaw,
			&m.StartsAt, &m.EndsAt, &m.Frequency, &constraintsRaw, &briefRaw, &planRaw,
			&m.Measurability, &resultRaw, &m.CreatedAt, &m.UpdatedAt,
			&m.TemplateName, &m.PostCount,
		); err != nil {
			return nil, 0, err
		}
		_ = json.Unmarshal(channelRaw, &m.ChannelIDs)
		if m.ChannelIDs == nil {
			m.ChannelIDs = []string{}
		}
		_ = json.Unmarshal(constraintsRaw, &m.Constraints)
		if m.Constraints == nil {
			m.Constraints = map[string]any{}
		}
		_ = json.Unmarshal(briefRaw, &m.Brief)
		_ = json.Unmarshal(planRaw, &m.Plan)
		if m.Plan.Items == nil {
			m.Plan.Items = []model.MissionPlanItem{}
		}
		_ = json.Unmarshal(resultRaw, &m.Result)
		items = append(items, m)
	}
	return items, total, rows.Err()
}

func (r *MissionRepository) Get(ctx context.Context, workspaceID, id string) (*model.Mission, error) {
	m, err := scanMission(r.pool.QueryRow(ctx, `
		SELECT `+missionColumns+` FROM missions WHERE id = $1 AND workspace_id = $2
	`, id, workspaceID))
	if err != nil {
		return nil, err
	}
	_ = r.pool.QueryRow(ctx, `
		SELECT COALESCE((SELECT name FROM agent_templates WHERE id = $1), ''),
		       (SELECT COUNT(*) FROM posts WHERE mission_id = $2)
	`, nullIfEmpty(m.AgentTemplateID), m.ID).Scan(&m.TemplateName, &m.PostCount)
	return m, nil
}

func (r *MissionRepository) Create(ctx context.Context, m *model.Mission) (*model.Mission, error) {
	channelRaw, _ := json.Marshal(m.ChannelIDs)
	constraintsRaw, _ := json.Marshal(m.Constraints)
	briefRaw, _ := json.Marshal(m.Brief)
	planRaw, _ := json.Marshal(m.Plan)
	resultRaw, _ := json.Marshal(m.Result)
	var id string
	err := r.pool.QueryRow(ctx, `
		INSERT INTO missions (
			workspace_id, agent_template_id, created_by_user_id, title, goal, metric,
			metric_target, status, channel_ids, starts_at, ends_at, frequency,
			constraints, brief, plan, measurability, result
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
		) RETURNING id
	`, m.WorkspaceID, nullIfEmpty(m.AgentTemplateID), nullIfEmpty(m.CreatedByUserID),
		m.Title, m.Goal, m.Metric, m.MetricTarget, m.Status, channelRaw,
		m.StartsAt, m.EndsAt, m.Frequency, constraintsRaw, briefRaw, planRaw,
		m.Measurability, resultRaw,
	).Scan(&id)
	if err != nil {
		return nil, err
	}
	return r.Get(ctx, m.WorkspaceID, id)
}

func (r *MissionRepository) Update(ctx context.Context, m *model.Mission) (*model.Mission, error) {
	channelRaw, _ := json.Marshal(m.ChannelIDs)
	constraintsRaw, _ := json.Marshal(m.Constraints)
	briefRaw, _ := json.Marshal(m.Brief)
	planRaw, _ := json.Marshal(m.Plan)
	resultRaw, _ := json.Marshal(m.Result)
	tag, err := r.pool.Exec(ctx, `
		UPDATE missions SET
			title = $3, goal = $4, metric = $5, metric_target = $6, status = $7,
			channel_ids = $8, starts_at = $9, ends_at = $10, frequency = $11,
			constraints = $12, brief = $13, plan = $14, measurability = $15,
			result = $16, updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2
	`, m.ID, m.WorkspaceID, m.Title, m.Goal, m.Metric, m.MetricTarget, m.Status,
		channelRaw, m.StartsAt, m.EndsAt, m.Frequency, constraintsRaw, briefRaw,
		planRaw, m.Measurability, resultRaw)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	return r.Get(ctx, m.WorkspaceID, m.ID)
}

func (r *MissionRepository) ListMessages(ctx context.Context, workspaceID, missionID string, limit int) ([]model.MissionMessage, error) {
	if limit <= 0 || limit > 200 {
		limit = 80
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, workspace_id, mission_id, role, content, created_at
		FROM (
			SELECT id, workspace_id, mission_id, role, content, created_at
			FROM mission_messages
			WHERE workspace_id = $1 AND mission_id = $2
			ORDER BY created_at DESC
			LIMIT $3
		) q
		ORDER BY created_at ASC
	`, workspaceID, missionID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.MissionMessage, 0)
	for rows.Next() {
		var msg model.MissionMessage
		if err := rows.Scan(&msg.ID, &msg.WorkspaceID, &msg.MissionID, &msg.Role, &msg.Content, &msg.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, msg)
	}
	return out, rows.Err()
}

func (r *MissionRepository) InsertMessage(ctx context.Context, msg model.MissionMessage) (*model.MissionMessage, error) {
	var out model.MissionMessage
	err := r.pool.QueryRow(ctx, `
		INSERT INTO mission_messages (workspace_id, mission_id, role, content)
		VALUES ($1, $2, $3, $4)
		RETURNING id, workspace_id, mission_id, role, content, created_at
	`, msg.WorkspaceID, msg.MissionID, msg.Role, msg.Content).Scan(
		&out.ID, &out.WorkspaceID, &out.MissionID, &out.Role, &out.Content, &out.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &out, nil
}
