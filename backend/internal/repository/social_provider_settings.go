package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type SocialProviderSettingsRepository struct {
	pool *pgxpool.Pool
}

func NewSocialProviderSettingsRepository(pool *pgxpool.Pool) *SocialProviderSettingsRepository {
	return &SocialProviderSettingsRepository{pool: pool}
}

func (r *SocialProviderSettingsRepository) List(ctx context.Context) ([]model.SocialProviderSettingsRecord, error) {
	const q = `
		SELECT provider, config, updated_at
		FROM social_provider_settings
		ORDER BY provider ASC
	`
	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.SocialProviderSettingsRecord
	for rows.Next() {
		var provider string
		var raw []byte
		var rec model.SocialProviderSettingsRecord
		if err := rows.Scan(&provider, &raw, &rec.UpdatedAt); err != nil {
			return nil, err
		}
		rec.Provider = model.SocialProvider(provider)
		if err := json.Unmarshal(raw, &rec.Config); err != nil {
			return nil, err
		}
		items = append(items, rec)
	}
	return items, rows.Err()
}

func (r *SocialProviderSettingsRepository) Get(ctx context.Context, provider model.SocialProvider) (*model.SocialProviderSettingsRecord, error) {
	const q = `
		SELECT provider, config, updated_at
		FROM social_provider_settings
		WHERE provider = $1
	`
	var p string
	var raw []byte
	var rec model.SocialProviderSettingsRecord
	err := r.pool.QueryRow(ctx, q, string(provider)).Scan(&p, &raw, &rec.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	rec.Provider = model.SocialProvider(p)
	if err := json.Unmarshal(raw, &rec.Config); err != nil {
		return nil, err
	}
	return &rec, nil
}

func (r *SocialProviderSettingsRepository) Update(
	ctx context.Context,
	provider model.SocialProvider,
	config model.SocialProviderSettings,
) (*model.SocialProviderSettingsRecord, error) {
	raw, err := json.Marshal(config)
	if err != nil {
		return nil, err
	}
	const q = `
		UPDATE social_provider_settings
		SET config = $2, updated_at = NOW()
		WHERE provider = $1
		RETURNING provider, config, updated_at
	`
	var p string
	var out []byte
	var rec model.SocialProviderSettingsRecord
	err = r.pool.QueryRow(ctx, q, string(provider), raw).Scan(&p, &out, &rec.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	rec.Provider = model.SocialProvider(p)
	if err := json.Unmarshal(out, &rec.Config); err != nil {
		return nil, err
	}
	return &rec, nil
}

type MAXPlatformBotRecord struct {
	Config                 model.SocialProviderSettings
	PlatformBotTokenEnc    string
	PlatformBotUsername    string
	UpdatedAt              time.Time
}

func (r *SocialProviderSettingsRepository) GetMAXPlatformBot(ctx context.Context) (*MAXPlatformBotRecord, error) {
	const q = `
		SELECT config, COALESCE(platform_bot_token_encrypted, ''), COALESCE(platform_bot_username, ''), updated_at
		FROM social_provider_settings
		WHERE provider = $1
	`
	var raw []byte
	var rec MAXPlatformBotRecord
	err := r.pool.QueryRow(ctx, q, string(model.SocialProviderMAX)).Scan(
		&raw, &rec.PlatformBotTokenEnc, &rec.PlatformBotUsername, &rec.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, &rec.Config); err != nil {
		return nil, err
	}
	return &rec, nil
}

func (r *SocialProviderSettingsRepository) SaveMAXPlatformBot(
	ctx context.Context,
	config model.SocialProviderSettings,
	tokenEncrypted string,
	botUsername string,
) (*MAXPlatformBotRecord, error) {
	raw, err := json.Marshal(config)
	if err != nil {
		return nil, err
	}
	const q = `
		UPDATE social_provider_settings
		SET config = $2,
		    platform_bot_token_encrypted = NULLIF($3, ''),
		    platform_bot_username = NULLIF($4, ''),
		    updated_at = NOW()
		WHERE provider = $1
		RETURNING config, COALESCE(platform_bot_token_encrypted, ''), COALESCE(platform_bot_username, ''), updated_at
	`
	var out []byte
	var rec MAXPlatformBotRecord
	err = r.pool.QueryRow(ctx, q, string(model.SocialProviderMAX), raw, tokenEncrypted, botUsername).Scan(
		&out, &rec.PlatformBotTokenEnc, &rec.PlatformBotUsername, &rec.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(out, &rec.Config); err != nil {
		return nil, err
	}
	return &rec, nil
}
