package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type AuthScreenRepository struct {
	pool *pgxpool.Pool
}

func NewAuthScreenRepository(pool *pgxpool.Pool) *AuthScreenRepository {
	return &AuthScreenRepository{pool: pool}
}

type AuthScreenSettingsRecord struct {
	LogoS3Key       string
	LogoContentType string
	UpdatedAt       time.Time
}

func (r *AuthScreenRepository) GetSettings(ctx context.Context) (AuthScreenSettingsRecord, error) {
	const q = `
		SELECT COALESCE(logo_s3_key, ''), COALESCE(logo_content_type, ''), updated_at
		FROM auth_screen_settings
		WHERE id = TRUE
	`
	var out AuthScreenSettingsRecord
	err := r.pool.QueryRow(ctx, q).Scan(&out.LogoS3Key, &out.LogoContentType, &out.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return AuthScreenSettingsRecord{}, ErrNotFound
	}
	return out, err
}

func (r *AuthScreenRepository) UpdateLogo(ctx context.Context, s3Key, contentType string) (AuthScreenSettingsRecord, error) {
	const q = `
		INSERT INTO auth_screen_settings (id, logo_s3_key, logo_content_type, updated_at)
		VALUES (TRUE, NULLIF($1, ''), NULLIF($2, ''), NOW())
		ON CONFLICT (id) DO UPDATE
		SET logo_s3_key = EXCLUDED.logo_s3_key,
		    logo_content_type = EXCLUDED.logo_content_type,
		    updated_at = NOW()
		RETURNING COALESCE(logo_s3_key, ''), COALESCE(logo_content_type, ''), updated_at
	`
	var out AuthScreenSettingsRecord
	err := r.pool.QueryRow(ctx, q, s3Key, contentType).Scan(&out.LogoS3Key, &out.LogoContentType, &out.UpdatedAt)
	return out, err
}

func (r *AuthScreenRepository) ClearLogo(ctx context.Context) error {
	const q = `
		UPDATE auth_screen_settings
		SET logo_s3_key = NULL, logo_content_type = NULL, updated_at = NOW()
		WHERE id = TRUE
	`
	_, err := r.pool.Exec(ctx, q)
	return err
}

func scanAuthScreenSlide(row interface {
	Scan(dest ...any) error
}) (model.AuthScreenSlide, error) {
	var slide model.AuthScreenSlide
	err := row.Scan(
		&slide.Slot,
		&slide.Enabled,
		&slide.Tag,
		&slide.Title,
		&slide.Description,
		&slide.MediaKind,
		&slide.MediaS3Key,
		&slide.MediaType,
		&slide.DurationSeconds,
		&slide.UpdatedAt,
	)
	return slide, err
}

func (r *AuthScreenRepository) ListSlides(ctx context.Context) ([]model.AuthScreenSlide, error) {
	const q = `
		SELECT slot, enabled, tag, title, description, media_kind,
		       COALESCE(media_s3_key, ''), COALESCE(media_content_type, ''),
		       duration_seconds, updated_at
		FROM auth_screen_slides
		ORDER BY slot ASC
	`
	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]model.AuthScreenSlide, 0, model.AuthScreenMaxSlides)
	for rows.Next() {
		slide, err := scanAuthScreenSlide(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, slide)
	}
	return items, rows.Err()
}

func (r *AuthScreenRepository) GetSlide(ctx context.Context, slot int) (*model.AuthScreenSlide, error) {
	const q = `
		SELECT slot, enabled, tag, title, description, media_kind,
		       COALESCE(media_s3_key, ''), COALESCE(media_content_type, ''),
		       duration_seconds, updated_at
		FROM auth_screen_slides
		WHERE slot = $1
	`
	slide, err := scanAuthScreenSlide(r.pool.QueryRow(ctx, q, slot))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &slide, nil
}

func (r *AuthScreenRepository) UpdateSlide(ctx context.Context, slot int, update model.AuthScreenSlideUpdate) (*model.AuthScreenSlide, error) {
	const q = `
		UPDATE auth_screen_slides
		SET enabled = $2,
		    tag = $3,
		    title = $4,
		    description = $5,
		    duration_seconds = $6,
		    updated_at = NOW()
		WHERE slot = $1
		RETURNING slot, enabled, tag, title, description, media_kind,
		          COALESCE(media_s3_key, ''), COALESCE(media_content_type, ''),
		          duration_seconds, updated_at
	`
	slide, err := scanAuthScreenSlide(r.pool.QueryRow(ctx, q, slot,
		update.Enabled, update.Tag, update.Title, update.Description, update.DurationSeconds,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &slide, nil
}

func (r *AuthScreenRepository) UpdateSlideMedia(
	ctx context.Context,
	slot int,
	mediaKind, s3Key, contentType string,
) (*model.AuthScreenSlide, error) {
	const q = `
		UPDATE auth_screen_slides
		SET media_kind = $2,
		    media_s3_key = NULLIF($3, ''),
		    media_content_type = NULLIF($4, ''),
		    updated_at = NOW()
		WHERE slot = $1
		RETURNING slot, enabled, tag, title, description, media_kind,
		          COALESCE(media_s3_key, ''), COALESCE(media_content_type, ''),
		          duration_seconds, updated_at
	`
	slide, err := scanAuthScreenSlide(r.pool.QueryRow(ctx, q, slot, mediaKind, s3Key, contentType))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &slide, nil
}
