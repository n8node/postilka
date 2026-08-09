package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type KieSettingsRepository struct {
	pool *pgxpool.Pool
}

func NewKieSettingsRepository(pool *pgxpool.Pool) *KieSettingsRepository {
	return &KieSettingsRepository{pool: pool}
}

func (r *KieSettingsRepository) Get(ctx context.Context) (model.KieSettings, error) {
	var s model.KieSettings
	var enc string
	err := r.pool.QueryRow(ctx, `
		SELECT api_base_url, api_key_encrypted, model_text_to_image, model_image_to_image,
		       model_combine, model_filter,
		       token_cost_text_to_image, token_cost_image_to_image, token_cost_combine,
		       token_cost_filter, kopecks_per_media_credit, updated_at
		FROM kie_settings
		WHERE id = 1
	`).Scan(
		&s.APIBaseURL, &enc, &s.ModelTextToImage, &s.ModelImageToImage, &s.ModelCombine, &s.ModelFilter,
		&s.TokenCostTextToImage, &s.TokenCostImageToImage, &s.TokenCostCombine,
		&s.TokenCostFilter, &s.KopecksPerMediaCredit, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return model.KieSettings{}, ErrNotFound
		}
		return model.KieSettings{}, err
	}
	s.APIKey = enc
	return s, nil
}

func (r *KieSettingsRepository) Upsert(ctx context.Context, s model.KieSettings, apiKeyEncrypted string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO kie_settings (
			id, api_base_url, api_key_encrypted, model_text_to_image, model_image_to_image,
			model_combine, model_filter,
			token_cost_text_to_image, token_cost_image_to_image, token_cost_combine,
			token_cost_filter, kopecks_per_media_credit, updated_at
		) VALUES (
			1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now()
		)
		ON CONFLICT (id) DO UPDATE SET
			api_base_url = EXCLUDED.api_base_url,
			api_key_encrypted = EXCLUDED.api_key_encrypted,
			model_text_to_image = EXCLUDED.model_text_to_image,
			model_image_to_image = EXCLUDED.model_image_to_image,
			model_combine = EXCLUDED.model_combine,
			model_filter = EXCLUDED.model_filter,
			token_cost_text_to_image = EXCLUDED.token_cost_text_to_image,
			token_cost_image_to_image = EXCLUDED.token_cost_image_to_image,
			token_cost_combine = EXCLUDED.token_cost_combine,
			token_cost_filter = EXCLUDED.token_cost_filter,
			kopecks_per_media_credit = EXCLUDED.kopecks_per_media_credit,
			updated_at = now()
	`, s.APIBaseURL, apiKeyEncrypted, s.ModelTextToImage, s.ModelImageToImage, s.ModelCombine,
		s.ModelFilter,
		s.TokenCostTextToImage, s.TokenCostImageToImage, s.TokenCostCombine, s.TokenCostFilter,
		positiveOrDefault(s.KopecksPerMediaCredit, 5000))
	return err
}

func positiveOrDefault(n, def int) int {
	if n > 0 {
		return n
	}
	return def
}
