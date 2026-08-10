package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type KieVideoSettingsRepository struct {
	pool *pgxpool.Pool
}

func NewKieVideoSettingsRepository(pool *pgxpool.Pool) *KieVideoSettingsRepository {
	return &KieVideoSettingsRepository{pool: pool}
}

func (r *KieVideoSettingsRepository) Get(ctx context.Context) (model.KieVideoSettings, error) {
	var s model.KieVideoSettings
	var enc string
	err := r.pool.QueryRow(ctx, `
		SELECT api_base_url, api_key_encrypted, model_text_to_video, model_image_to_video,
		       model_reference_to_video,
		       default_duration_text_to_video, default_duration_image_to_video,
		       default_duration_reference_to_video,
		       token_cost_text_to_video, token_cost_image_to_video, token_cost_reference_to_video,
		       kopecks_per_media_credit, updated_at
		FROM kie_video_settings
		WHERE id = 1
	`).Scan(
		&s.APIBaseURL, &enc, &s.ModelTextToVideo, &s.ModelImageToVideo, &s.ModelReferenceToVideo,
		&s.DefaultDurationTextToVideo, &s.DefaultDurationImageToVideo, &s.DefaultDurationReferenceToVideo,
		&s.TokenCostTextToVideo, &s.TokenCostImageToVideo, &s.TokenCostReferenceToVideo,
		&s.KopecksPerMediaCredit, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return model.KieVideoSettings{}, ErrNotFound
		}
		return model.KieVideoSettings{}, err
	}
	s.APIKey = enc
	return s, nil
}

func (r *KieVideoSettingsRepository) Upsert(ctx context.Context, s model.KieVideoSettings, apiKeyEncrypted string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO kie_video_settings (
			id, api_base_url, api_key_encrypted, model_text_to_video, model_image_to_video,
			model_reference_to_video,
			default_duration_text_to_video, default_duration_image_to_video,
			default_duration_reference_to_video,
			token_cost_text_to_video, token_cost_image_to_video, token_cost_reference_to_video,
			kopecks_per_media_credit, updated_at
		) VALUES (
			1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now()
		)
		ON CONFLICT (id) DO UPDATE SET
			api_base_url = EXCLUDED.api_base_url,
			api_key_encrypted = EXCLUDED.api_key_encrypted,
			model_text_to_video = EXCLUDED.model_text_to_video,
			model_image_to_video = EXCLUDED.model_image_to_video,
			model_reference_to_video = EXCLUDED.model_reference_to_video,
			default_duration_text_to_video = EXCLUDED.default_duration_text_to_video,
			default_duration_image_to_video = EXCLUDED.default_duration_image_to_video,
			default_duration_reference_to_video = EXCLUDED.default_duration_reference_to_video,
			token_cost_text_to_video = EXCLUDED.token_cost_text_to_video,
			token_cost_image_to_video = EXCLUDED.token_cost_image_to_video,
			token_cost_reference_to_video = EXCLUDED.token_cost_reference_to_video,
			kopecks_per_media_credit = EXCLUDED.kopecks_per_media_credit,
			updated_at = now()
	`, s.APIBaseURL, apiKeyEncrypted, s.ModelTextToVideo, s.ModelImageToVideo, s.ModelReferenceToVideo,
		s.DefaultDurationTextToVideo, s.DefaultDurationImageToVideo, s.DefaultDurationReferenceToVideo,
		s.TokenCostTextToVideo, s.TokenCostImageToVideo, s.TokenCostReferenceToVideo,
		positiveOrDefault(s.KopecksPerMediaCredit, 5000))
	return err
}

type KieVideoExampleRepository struct {
	pool *pgxpool.Pool
}

func NewKieVideoExampleRepository(pool *pgxpool.Pool) *KieVideoExampleRepository {
	return &KieVideoExampleRepository{pool: pool}
}

func (r *KieVideoExampleRepository) Create(ctx context.Context, e model.KieVideoExample) (model.KieVideoExample, error) {
	urlsJSON, err := json.Marshal(e.SourceImageURLs)
	if err != nil {
		return model.KieVideoExample{}, err
	}
	var out model.KieVideoExample
	err = r.pool.QueryRow(ctx, `
		INSERT INTO kie_video_examples (
			mode, prompt, aspect_ratio, duration, model_id, status, source_image_urls, sort_order
		) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
		RETURNING id, mode, prompt, aspect_ratio, duration, model_id, status, kie_task_id,
		          fail_message, result_s3_key, result_content_type, source_image_urls, sort_order,
		          created_at, updated_at
	`, e.Mode, e.Prompt, e.AspectRatio, e.Duration, e.ModelID, e.Status, string(urlsJSON), e.SortOrder).Scan(
		&out.ID, &out.Mode, &out.Prompt, &out.AspectRatio, &out.Duration, &out.ModelID, &out.Status,
		&out.KieTaskID, &out.FailMessage, &out.ResultS3Key, &out.ResultContentType, &urlsJSON,
		&out.SortOrder, &out.CreatedAt, &out.UpdatedAt,
	)
	if err != nil {
		return model.KieVideoExample{}, err
	}
	_ = json.Unmarshal(urlsJSON, &out.SourceImageURLs)
	return out, nil
}

func (r *KieVideoExampleRepository) ListAll(ctx context.Context) ([]model.KieVideoExample, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, mode, prompt, aspect_ratio, duration, model_id, status, kie_task_id,
		       fail_message, result_s3_key, result_content_type, source_image_urls, sort_order,
		       created_at, updated_at
		FROM kie_video_examples
		ORDER BY sort_order ASC, created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanKieVideoExamples(rows)
}

func (r *KieVideoExampleRepository) ListReady(ctx context.Context) ([]model.KieVideoExample, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, mode, prompt, aspect_ratio, duration, model_id, status, kie_task_id,
		       fail_message, result_s3_key, result_content_type, source_image_urls, sort_order,
		       created_at, updated_at
		FROM kie_video_examples
		WHERE status = 'ready'
		ORDER BY sort_order ASC, created_at ASC
		LIMIT $1
	`, model.KieVideoExampleMaxCount)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanKieVideoExamples(rows)
}

func (r *KieVideoExampleRepository) CountReady(ctx context.Context) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM kie_video_examples WHERE status = 'ready'
	`).Scan(&n)
	return n, err
}

func (r *KieVideoExampleRepository) GetByID(ctx context.Context, id string) (model.KieVideoExample, error) {
	var out model.KieVideoExample
	var urlsJSON []byte
	err := r.pool.QueryRow(ctx, `
		SELECT id, mode, prompt, aspect_ratio, duration, model_id, status, kie_task_id,
		       fail_message, result_s3_key, result_content_type, source_image_urls, sort_order,
		       created_at, updated_at
		FROM kie_video_examples
		WHERE id = $1
	`, id).Scan(
		&out.ID, &out.Mode, &out.Prompt, &out.AspectRatio, &out.Duration, &out.ModelID, &out.Status,
		&out.KieTaskID, &out.FailMessage, &out.ResultS3Key, &out.ResultContentType, &urlsJSON,
		&out.SortOrder, &out.CreatedAt, &out.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return model.KieVideoExample{}, ErrNotFound
		}
		return model.KieVideoExample{}, err
	}
	_ = json.Unmarshal(urlsJSON, &out.SourceImageURLs)
	return out, nil
}

func (r *KieVideoExampleRepository) Delete(ctx context.Context, id string) (model.KieVideoExample, error) {
	var out model.KieVideoExample
	var urlsJSON []byte
	err := r.pool.QueryRow(ctx, `
		DELETE FROM kie_video_examples WHERE id = $1
		RETURNING id, mode, prompt, aspect_ratio, duration, model_id, status, kie_task_id,
		          fail_message, result_s3_key, result_content_type, source_image_urls, sort_order,
		          created_at, updated_at
	`, id).Scan(
		&out.ID, &out.Mode, &out.Prompt, &out.AspectRatio, &out.Duration, &out.ModelID, &out.Status,
		&out.KieTaskID, &out.FailMessage, &out.ResultS3Key, &out.ResultContentType, &urlsJSON,
		&out.SortOrder, &out.CreatedAt, &out.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return model.KieVideoExample{}, ErrNotFound
		}
		return model.KieVideoExample{}, err
	}
	_ = json.Unmarshal(urlsJSON, &out.SourceImageURLs)
	return out, nil
}

func (r *KieVideoExampleRepository) MarkGenerating(ctx context.Context, id, taskID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE kie_video_examples
		SET status = 'generating', kie_task_id = $2, updated_at = now()
		WHERE id = $1
	`, id, taskID)
	return err
}

func (r *KieVideoExampleRepository) MarkReady(ctx context.Context, id, s3Key, contentType string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE kie_video_examples
		SET status = 'ready', result_s3_key = $2, result_content_type = $3,
		    fail_message = '', updated_at = now()
		WHERE id = $1
	`, id, s3Key, contentType)
	return err
}

func (r *KieVideoExampleRepository) MarkFailed(ctx context.Context, id, message string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE kie_video_examples
		SET status = 'failed', fail_message = $2, updated_at = now()
		WHERE id = $1
	`, id, message)
	return err
}

func (r *KieVideoExampleRepository) ListDueForPoll(ctx context.Context, limit int) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id FROM kie_video_examples
		WHERE status IN ('pending', 'generating')
		ORDER BY created_at ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func scanKieVideoExamples(rows pgx.Rows) ([]model.KieVideoExample, error) {
	var out []model.KieVideoExample
	for rows.Next() {
		var e model.KieVideoExample
		var urlsJSON []byte
		if err := rows.Scan(
			&e.ID, &e.Mode, &e.Prompt, &e.AspectRatio, &e.Duration, &e.ModelID, &e.Status,
			&e.KieTaskID, &e.FailMessage, &e.ResultS3Key, &e.ResultContentType, &urlsJSON,
			&e.SortOrder, &e.CreatedAt, &e.UpdatedAt,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(urlsJSON, &e.SourceImageURLs)
		out = append(out, e)
	}
	return out, rows.Err()
}
