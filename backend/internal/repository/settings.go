package repository

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SettingsRepository struct {
	pool *pgxpool.Pool
}

func NewSettingsRepository(pool *pgxpool.Pool) *SettingsRepository {
	return &SettingsRepository{pool: pool}
}

func (r *SettingsRepository) Get(ctx context.Context, key string) (string, error) {
	var value string
	err := r.pool.QueryRow(ctx, `SELECT value FROM app_settings WHERE key = $1`, key).Scan(&value)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return value, err
}

func (r *SettingsRepository) Set(ctx context.Context, key, value string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO app_settings (key, value, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
	`, key, value)
	return err
}

func (r *SettingsRepository) IsInviteRegistrationEnabled(ctx context.Context) (bool, error) {
	value, err := r.Get(ctx, "auth.invite_registration_enabled")
	if errors.Is(err, ErrNotFound) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return value == "true", nil
}

func (r *SettingsRepository) SetInviteRegistrationEnabled(ctx context.Context, enabled bool) error {
	v := "false"
	if enabled {
		v = "true"
	}
	return r.Set(ctx, "auth.invite_registration_enabled", v)
}

func (r *SettingsRepository) IsOAuthLoginEnabled(ctx context.Context, provider string) (bool, error) {
	value, err := r.Get(ctx, "auth."+provider+"_login_enabled")
	if errors.Is(err, ErrNotFound) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return value == "true", nil
}

const adStudioHiddenCategoriesKey = "ad_studio.hidden_categories"

func (r *SettingsRepository) GetAdStudioHiddenCategories(ctx context.Context) ([]string, error) {
	value, err := r.Get(ctx, adStudioHiddenCategoriesKey)
	if errors.Is(err, ErrNotFound) || strings.TrimSpace(value) == "" {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var raw []string
	if err := json.Unmarshal([]byte(value), &raw); err != nil {
		return nil, nil
	}
	out := make([]string, 0, len(raw))
	seen := map[string]bool{}
	for _, item := range raw {
		id := strings.TrimSpace(item)
		if id == "" || seen[id] {
			continue
		}
		seen[id] = true
		out = append(out, id)
	}
	return out, nil
}

func (r *SettingsRepository) SetAdStudioHiddenCategories(ctx context.Context, hidden []string) error {
	if hidden == nil {
		hidden = []string{}
	}
	raw, err := json.Marshal(hidden)
	if err != nil {
		return err
	}
	return r.Set(ctx, adStudioHiddenCategoriesKey, string(raw))
}

const adStudioShuffleTemplatesKey = "ad_studio.shuffle_templates"

func (r *SettingsRepository) GetAdStudioShuffleTemplates(ctx context.Context) (bool, error) {
	value, err := r.Get(ctx, adStudioShuffleTemplatesKey)
	if errors.Is(err, ErrNotFound) || strings.TrimSpace(value) == "" {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return value == "true", nil
}

func (r *SettingsRepository) SetAdStudioShuffleTemplates(ctx context.Context, enabled bool) error {
	v := "false"
	if enabled {
		v = "true"
	}
	return r.Set(ctx, adStudioShuffleTemplatesKey, v)
}

func (r *SettingsRepository) SetOAuthLoginEnabled(ctx context.Context, provider string, enabled bool) error {
	v := "false"
	if enabled {
		v = "true"
	}
	return r.Set(ctx, "auth."+provider+"_login_enabled", v)
}

