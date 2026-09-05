package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type AdStudioSystemPromptRepository struct{ pool *pgxpool.Pool }

func NewAdStudioSystemPromptRepository(pool *pgxpool.Pool) *AdStudioSystemPromptRepository {
	return &AdStudioSystemPromptRepository{pool: pool}
}

const adStudioSystemPromptSelect = `SELECT id, mode, scenario, prompt_text, is_active, created_at, updated_at FROM ad_studio_system_prompts`

func scanAdStudioSystemPrompt(row pgx.Row) (model.AdStudioSystemPrompt, error) {
	var p model.AdStudioSystemPrompt
	err := row.Scan(&p.ID, &p.Mode, &p.Scenario, &p.PromptText, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)
	if err == pgx.ErrNoRows {
		return p, ErrNotFound
	}
	return p, err
}

func (r *AdStudioSystemPromptRepository) List(ctx context.Context) ([]model.AdStudioSystemPrompt, error) {
	rows, err := r.pool.Query(ctx, adStudioSystemPromptSelect+` ORDER BY mode, scenario`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []model.AdStudioSystemPrompt
	for rows.Next() {
		p, err := scanAdStudioSystemPrompt(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *AdStudioSystemPromptRepository) GetByID(ctx context.Context, id int) (model.AdStudioSystemPrompt, error) {
	return scanAdStudioSystemPrompt(r.pool.QueryRow(ctx, adStudioSystemPromptSelect+` WHERE id=$1`, id))
}

func (r *AdStudioSystemPromptRepository) GetByModeAndScenario(ctx context.Context, mode, scenario string) (model.AdStudioSystemPrompt, error) {
	return scanAdStudioSystemPrompt(r.pool.QueryRow(ctx, adStudioSystemPromptSelect+` WHERE mode=$1 AND scenario=$2`, mode, scenario))
}

func (r *AdStudioSystemPromptRepository) Create(ctx context.Context, p model.AdStudioSystemPrompt) (model.AdStudioSystemPrompt, error) {
	return scanAdStudioSystemPrompt(r.pool.QueryRow(ctx, `INSERT INTO ad_studio_system_prompts (mode, scenario, prompt_text, is_active) VALUES ($1,$2,$3,$4) RETURNING id, mode, scenario, prompt_text, is_active, created_at, updated_at`, p.Mode, p.Scenario, p.PromptText, p.IsActive))
}

func (r *AdStudioSystemPromptRepository) Update(ctx context.Context, p model.AdStudioSystemPrompt) (model.AdStudioSystemPrompt, error) {
	return scanAdStudioSystemPrompt(r.pool.QueryRow(ctx, `UPDATE ad_studio_system_prompts SET prompt_text=$1, is_active=$2, updated_at=NOW() WHERE id=$3 RETURNING id, mode, scenario, prompt_text, is_active, created_at, updated_at`, p.PromptText, p.IsActive, p.ID))
}

func (r *AdStudioSystemPromptRepository) Delete(ctx context.Context, id int) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM ad_studio_system_prompts WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
