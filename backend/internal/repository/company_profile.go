package repository

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type CompanyProfileRepository struct{ pool *pgxpool.Pool }

func NewCompanyProfileRepository(pool *pgxpool.Pool) *CompanyProfileRepository {
	return &CompanyProfileRepository{pool: pool}
}

const companyProfileColumns = `id, workspace_id, name, company_name, industry, description, website,
 target_audience, tone, text_instructions, banned_words, brand_color, visual_style, visual_avoid,
 is_default, created_at, updated_at`

func scanCompanyProfile(row pgx.Row) (*model.CompanyProfile, error) {
	var item model.CompanyProfile
	err := row.Scan(&item.ID, &item.WorkspaceID, &item.Name, &item.CompanyName, &item.Industry,
		&item.Description, &item.Website, &item.TargetAudience, &item.Tone, &item.TextInstructions,
		&item.BannedWords, &item.BrandColor, &item.VisualStyle, &item.VisualAvoid, &item.IsDefault,
		&item.CreatedAt, &item.UpdatedAt)
	return &item, err
}

func (r *CompanyProfileRepository) List(ctx context.Context, workspaceID string) ([]model.CompanyProfile, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+companyProfileColumns+` FROM company_profiles WHERE workspace_id = $1 ORDER BY is_default DESC, updated_at DESC`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]model.CompanyProfile, 0)
	for rows.Next() {
		item, scanErr := scanCompanyProfile(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		items = append(items, *item)
	}
	return items, rows.Err()
}

func (r *CompanyProfileRepository) Get(ctx context.Context, workspaceID, id string) (*model.CompanyProfile, error) {
	item, err := scanCompanyProfile(r.pool.QueryRow(ctx, `SELECT `+companyProfileColumns+` FROM company_profiles WHERE workspace_id = $1 AND id = $2`, workspaceID, id))
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	return item, err
}

func (r *CompanyProfileRepository) Create(ctx context.Context, workspaceID string, in model.CompanyProfileInput) (*model.CompanyProfile, error) {
	in = trimProfileInput(in)
	id := uuid.NewString()
	if in.IsDefault {
		_, _ = r.pool.Exec(ctx, `UPDATE company_profiles SET is_default = false WHERE workspace_id = $1`, workspaceID)
	}
	return scanCompanyProfile(r.pool.QueryRow(ctx, `INSERT INTO company_profiles
		(id, workspace_id, name, company_name, industry, description, website, target_audience, tone, text_instructions, banned_words, brand_color, visual_style, visual_avoid, is_default)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING `+companyProfileColumns,
		id, workspaceID, in.Name, in.CompanyName, in.Industry, in.Description, in.Website, in.TargetAudience, in.Tone, in.TextInstructions, in.BannedWords, in.BrandColor, in.VisualStyle, in.VisualAvoid, in.IsDefault))
}

func (r *CompanyProfileRepository) Update(ctx context.Context, workspaceID, id string, in model.CompanyProfileInput) (*model.CompanyProfile, error) {
	in = trimProfileInput(in)
	if in.IsDefault {
		_, _ = r.pool.Exec(ctx, `UPDATE company_profiles SET is_default = false WHERE workspace_id = $1 AND id <> $2`, workspaceID, id)
	}
	return scanCompanyProfile(r.pool.QueryRow(ctx, `UPDATE company_profiles SET name=$3, company_name=$4, industry=$5, description=$6, website=$7, target_audience=$8, tone=$9, text_instructions=$10, banned_words=$11, brand_color=$12, visual_style=$13, visual_avoid=$14, is_default=$15, updated_at=now() WHERE workspace_id=$1 AND id=$2 RETURNING `+companyProfileColumns,
		workspaceID, id, in.Name, in.CompanyName, in.Industry, in.Description, in.Website, in.TargetAudience, in.Tone, in.TextInstructions, in.BannedWords, in.BrandColor, in.VisualStyle, in.VisualAvoid, in.IsDefault))
}

func (r *CompanyProfileRepository) Delete(ctx context.Context, workspaceID, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM company_profiles WHERE workspace_id = $1 AND id = $2`, workspaceID, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *CompanyProfileRepository) PromptContext(ctx context.Context, workspaceID, id, mediaType string) (string, error) {
	if strings.TrimSpace(id) == "" {
		return "", nil
	}
	item, err := r.Get(ctx, workspaceID, id)
	if err != nil {
		return "", err
	}
	if mediaType == "image" || mediaType == "video" {
		parts := []string{}
		if item.CompanyName != "" {
			parts = append(parts, "Company: "+item.CompanyName)
		}
		if item.TargetAudience != "" {
			parts = append(parts, "Audience: "+item.TargetAudience)
		}
		if item.BrandColor != "" {
			parts = append(parts, "Brand color: "+item.BrandColor)
		}
		if item.VisualStyle != "" {
			parts = append(parts, "Visual style: "+item.VisualStyle)
		}
		if item.VisualAvoid != "" {
			parts = append(parts, "Avoid: "+item.VisualAvoid)
		}
		return strings.Join(parts, "\n"), nil
	}
	parts := []string{}
	if item.CompanyName != "" {
		parts = append(parts, "Company: "+item.CompanyName)
	}
	if item.Description != "" {
		parts = append(parts, "Description: "+item.Description)
	}
	if item.TargetAudience != "" {
		parts = append(parts, "Audience: "+item.TargetAudience)
	}
	if item.Tone != "" {
		parts = append(parts, "Tone: "+item.Tone)
	}
	if item.TextInstructions != "" {
		parts = append(parts, "Writing rules: "+item.TextInstructions)
	}
	if item.BannedWords != "" {
		parts = append(parts, "Avoid words: "+item.BannedWords)
	}
	return strings.Join(parts, "\n"), nil
}

func trimProfileInput(in model.CompanyProfileInput) model.CompanyProfileInput {
	in.Name = strings.TrimSpace(in.Name)
	in.CompanyName = strings.TrimSpace(in.CompanyName)
	in.Industry = strings.TrimSpace(in.Industry)
	in.Description = strings.TrimSpace(in.Description)
	in.Website = strings.TrimSpace(in.Website)
	in.TargetAudience = strings.TrimSpace(in.TargetAudience)
	in.Tone = strings.TrimSpace(in.Tone)
	in.TextInstructions = strings.TrimSpace(in.TextInstructions)
	in.BannedWords = strings.TrimSpace(in.BannedWords)
	in.BrandColor = strings.TrimSpace(in.BrandColor)
	in.VisualStyle = strings.TrimSpace(in.VisualStyle)
	in.VisualAvoid = strings.TrimSpace(in.VisualAvoid)
	return in
}
