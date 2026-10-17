package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type MediaProviderRepository struct{ pool *pgxpool.Pool }

func NewMediaProviderRepository(pool *pgxpool.Pool) *MediaProviderRepository {
	return &MediaProviderRepository{pool: pool}
}

func (r *MediaProviderRepository) List(ctx context.Context) ([]model.MediaProvider, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, display_name, api_base_url, api_key_encrypted <> '', enabled, test_only, capabilities, settings, updated_at FROM media_providers ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []model.MediaProvider
	for rows.Next() {
		var p model.MediaProvider
		var caps, settings []byte
		var keySet bool
		if err := rows.Scan(&p.ID, &p.DisplayName, &p.APIBaseURL, &keySet, &p.Enabled, &p.TestOnly, &caps, &settings, &p.UpdatedAt); err != nil {
			return nil, err
		}
		p.APIKeySet = keySet
		_ = json.Unmarshal(caps, &p.Capabilities)
		_ = json.Unmarshal(settings, &p.Settings)
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *MediaProviderRepository) Get(ctx context.Context, id string) (model.MediaProvider, error) {
	var p model.MediaProvider
	var caps, settings []byte
	var keySet bool
	err := r.pool.QueryRow(ctx, `SELECT id, display_name, api_base_url, api_key_encrypted <> '', enabled, test_only, capabilities, settings, updated_at FROM media_providers WHERE id = $1`, id).Scan(&p.ID, &p.DisplayName, &p.APIBaseURL, &keySet, &p.Enabled, &p.TestOnly, &caps, &settings, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.MediaProvider{}, ErrNotFound
	}
	if err != nil {
		return model.MediaProvider{}, err
	}
	p.APIKeySet = keySet
	_ = json.Unmarshal(caps, &p.Capabilities)
	_ = json.Unmarshal(settings, &p.Settings)
	return p, nil
}

func (r *MediaProviderRepository) GetStoredKey(ctx context.Context, id string) (string, error) {
	var key string
	err := r.pool.QueryRow(ctx, `SELECT api_key_encrypted FROM media_providers WHERE id = $1`, id).Scan(&key)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return key, err
}

func (r *MediaProviderRepository) Upsert(ctx context.Context, p model.MediaProvider, encryptedKey string) error {
	caps, _ := json.Marshal(p.Capabilities)
	settings, _ := json.Marshal(p.Settings)
	_, err := r.pool.Exec(ctx, `INSERT INTO media_providers (id, display_name, api_base_url, api_key_encrypted, enabled, test_only, capabilities, settings, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now()) ON CONFLICT (id) DO UPDATE SET display_name=EXCLUDED.display_name, api_base_url=EXCLUDED.api_base_url, api_key_encrypted=CASE WHEN EXCLUDED.api_key_encrypted = '' THEN media_providers.api_key_encrypted ELSE EXCLUDED.api_key_encrypted END, enabled=EXCLUDED.enabled, test_only=EXCLUDED.test_only, capabilities=EXCLUDED.capabilities, settings=EXCLUDED.settings, updated_at=now()`, p.ID, p.DisplayName, p.APIBaseURL, encryptedKey, p.Enabled, p.TestOnly, caps, settings)
	return err
}

func (r *MediaProviderRepository) ListModels(ctx context.Context, providerID string) ([]model.MediaProviderModel, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, provider_id, model_id, display_name, media_type, operation, enabled, is_default, parameters, sort_order FROM media_provider_models WHERE provider_id=$1 ORDER BY media_type, operation, sort_order, display_name`, providerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []model.MediaProviderModel
	for rows.Next() {
		var m model.MediaProviderModel
		var raw []byte
		if err := rows.Scan(&m.ID, &m.ProviderID, &m.ModelID, &m.DisplayName, &m.MediaType, &m.Operation, &m.Enabled, &m.IsDefault, &raw, &m.SortOrder); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(raw, &m.Parameters)
		out = append(out, m)
	}
	return out, rows.Err()
}

func (r *MediaProviderRepository) ListPricing(ctx context.Context, providerID string) ([]model.MediaProviderPricing, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, provider_id, model_id, media_type, operation, billing_unit, credit_cost, cost_per_second, cost_per_reference, enabled FROM media_provider_pricing WHERE provider_id=$1 ORDER BY media_type, operation, model_id`, providerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []model.MediaProviderPricing
	for rows.Next() {
		var p model.MediaProviderPricing
		if err := rows.Scan(&p.ID, &p.ProviderID, &p.ModelID, &p.MediaType, &p.Operation, &p.BillingUnit, &p.CreditCost, &p.CostPerSecond, &p.CostPerReference, &p.Enabled); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *MediaProviderRepository) ListRoutes(ctx context.Context) ([]model.MediaProviderRoute, error) {
	rows, err := r.pool.Query(ctx, `SELECT media_type, provider_id, priority, enabled FROM media_provider_routes ORDER BY media_type, priority`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []model.MediaProviderRoute
	for rows.Next() {
		var x model.MediaProviderRoute
		if err := rows.Scan(&x.MediaType, &x.ProviderID, &x.Priority, &x.Enabled); err != nil {
			return nil, err
		}
		out = append(out, x)
	}
	return out, rows.Err()
}

func (r *MediaProviderRepository) ReplaceRoutes(ctx context.Context, routes []model.MediaProviderRoute) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	seen := map[string]bool{}
	for _, x := range routes {
		if x.MediaType != "image" && x.MediaType != "video" || x.Priority < 1 || strings.TrimSpace(x.ProviderID) == "" {
			return fmt.Errorf("invalid media provider route")
		}
		key := x.MediaType + ":" + x.ProviderID
		if seen[key] {
			return fmt.Errorf("duplicate media provider route")
		}
		seen[key] = true
	}
	if _, err = tx.Exec(ctx, `DELETE FROM media_provider_routes`); err != nil {
		return err
	}
	for _, x := range routes {
		if _, err = tx.Exec(ctx, `INSERT INTO media_provider_routes (media_type,provider_id,priority,enabled,updated_at) VALUES ($1,$2,$3,$4,now())`, x.MediaType, x.ProviderID, x.Priority, x.Enabled); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func NewMediaProviderModelID() string { return uuid.NewString() }
