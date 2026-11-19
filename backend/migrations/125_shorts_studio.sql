-- +goose Up
ALTER TABLE plans ADD COLUMN IF NOT EXISTS shorts_processing_minutes_quota INTEGER;

CREATE TABLE shorts_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_file_id UUID REFERENCES workspace_files(id) ON DELETE SET NULL,
    content_type TEXT NOT NULL DEFAULT 'other',
    language TEXT NOT NULL DEFAULT 'ru',
    status TEXT NOT NULL DEFAULT 'draft',
    source_duration_seconds NUMERIC(12,3) NOT NULL DEFAULT 0,
    processing_minutes_reserved NUMERIC(12,3) NOT NULL DEFAULT 0,
    processing_minutes_consumed NUMERIC(12,3) NOT NULL DEFAULT 0,
    source_expires_at TIMESTAMPTZ,
    audio_file_id UUID REFERENCES workspace_files(id) ON DELETE SET NULL,
    audio_expires_at TIMESTAMPTZ,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX shorts_projects_workspace_status_idx ON shorts_projects(workspace_id, status, created_at DESC);
CREATE INDEX shorts_projects_expiry_idx ON shorts_projects(source_expires_at) WHERE source_expires_at IS NOT NULL;

CREATE TABLE shorts_clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES shorts_projects(id) ON DELETE CASCADE,
    start_seconds NUMERIC(12,3) NOT NULL,
    end_seconds NUMERIC(12,3) NOT NULL,
    transcript_text TEXT NOT NULL DEFAULT '',
    score NUMERIC(5,2) NOT NULL DEFAULT 0,
    score_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    crop_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    subtitle_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    overlay_config JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'candidate',
    draft_file_id UUID REFERENCES workspace_files(id) ON DELETE SET NULL,
    final_file_id UUID REFERENCES workspace_files(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT shorts_clips_valid_range CHECK (start_seconds >= 0 AND end_seconds > start_seconds)
);

CREATE INDEX shorts_clips_project_idx ON shorts_clips(project_id, score DESC);

CREATE TABLE shorts_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES shorts_projects(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    current_step TEXT NOT NULL DEFAULT '',
    progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    attempts INTEGER NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    lease_owner TEXT,
    lease_until TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX shorts_jobs_due_idx ON shorts_jobs(status, available_at);

CREATE TABLE shorts_subtitle_styles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    preview_file_id UUID REFERENCES workspace_files(id) ON DELETE SET NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX shorts_subtitle_styles_one_default_idx
    ON shorts_subtitle_styles(is_default) WHERE is_default;

CREATE TABLE shorts_kie_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clip_id UUID NOT NULL REFERENCES shorts_clips(id) ON DELETE CASCADE,
    segment_index INTEGER NOT NULL,
    start_seconds NUMERIC(12,3) NOT NULL,
    end_seconds NUMERIC(12,3) NOT NULL,
    kie_task_id TEXT,
    input_file_id UUID REFERENCES workspace_files(id) ON DELETE SET NULL,
    output_file_id UUID REFERENCES workspace_files(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'prepared',
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (clip_id, segment_index),
    CONSTRAINT shorts_kie_segments_valid_range CHECK (start_seconds >= 0 AND end_seconds > start_seconds AND end_seconds - start_seconds <= 15.5)
);

-- +goose Down
DROP TABLE IF EXISTS shorts_kie_segments;
DROP TABLE IF EXISTS shorts_subtitle_styles;
DROP TABLE IF EXISTS shorts_jobs;
DROP TABLE IF EXISTS shorts_clips;
DROP TABLE IF EXISTS shorts_projects;