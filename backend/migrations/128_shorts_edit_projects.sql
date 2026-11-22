-- +goose Up

-- Reusable analysis results and independent montage projects.
CREATE TABLE IF NOT EXISTS shorts_sources (
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
CREATE INDEX IF NOT EXISTS shorts_sources_workspace_idx ON shorts_sources(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS shorts_edit_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES shorts_sources(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Montage without a name',
    status TEXT NOT NULL DEFAULT 'draft',
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shorts_edit_projects_source_idx ON shorts_edit_projects(source_id, created_at DESC);

CREATE TABLE IF NOT EXISTS shorts_edit_project_clips (
    edit_project_id UUID NOT NULL REFERENCES shorts_edit_projects(id) ON DELETE CASCADE,
    clip_id UUID NOT NULL REFERENCES shorts_clips(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    start_seconds NUMERIC(12,3) NOT NULL,
    end_seconds NUMERIC(12,3) NOT NULL,
    transcript_text TEXT NOT NULL DEFAULT '',
    included BOOLEAN NOT NULL DEFAULT true,
    subtitle_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    audio_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (edit_project_id, clip_id),
    CHECK (start_seconds >= 0 AND end_seconds > start_seconds)
);
CREATE INDEX IF NOT EXISTS shorts_edit_project_clips_order_idx ON shorts_edit_project_clips(edit_project_id, position);

-- Copy all old project records into the durable source-analysis collection.
INSERT INTO shorts_sources (
    id, workspace_id, created_by_user_id, source_file_id, content_type, language, status,
    source_duration_seconds, processing_minutes_reserved, processing_minutes_consumed,
    source_expires_at, audio_file_id, audio_expires_at, settings, created_at, updated_at
)
SELECT id, workspace_id, created_by_user_id, source_file_id, content_type, language, status,
       source_duration_seconds, processing_minutes_reserved, processing_minutes_consumed,
       source_expires_at, audio_file_id, audio_expires_at, settings, created_at, updated_at
FROM shorts_projects
ON CONFLICT (id) DO NOTHING;

-- Keep the old project ID as its first edit-project ID and copy montage-only settings.
INSERT INTO shorts_edit_projects (id, source_id, workspace_id, created_by_user_id, name, status, settings, created_at, updated_at)
SELECT id, id, workspace_id, created_by_user_id, 'Montage 1', status,
       jsonb_build_object(
           'subtitle_style', COALESCE(settings->'subtitle_style', '"classic"'::jsonb),
           'subtitle_position', COALESCE(settings->'subtitle_position', '"bottom"'::jsonb),
           'subtitle_font_size', COALESCE(settings->'subtitle_font_size', '58'::jsonb),
           'subtitle_text_color', COALESCE(settings->'subtitle_text_color', '"#FFFFFF"'::jsonb),
           'subtitle_background', COALESCE(settings->'subtitle_background', '"#101010"'::jsonb),
           'watermark', COALESCE(settings->'watermark', '""'::jsonb),
           'safe_zone', COALESCE(settings->'safe_zone', '70'::jsonb),
           'final_file_id', settings->'final_file_id'
       ), created_at, updated_at
FROM shorts_projects
ON CONFLICT (id) DO NOTHING;

-- Preserve candidate IDs, order, cuts, transcript and selection state.
-- +goose StatementBegin
DO $$
DECLARE
    project_column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'shorts_clips' AND column_name = 'project_id'
    ) INTO project_column_exists;

    IF project_column_exists THEN
        INSERT INTO shorts_edit_project_clips (edit_project_id, clip_id, position, start_seconds, end_seconds, transcript_text, included, created_at, updated_at)
        SELECT c.project_id, c.id,
               COALESCE((c.score_details->>'order')::integer,
                 row_number() OVER (PARTITION BY c.project_id ORDER BY c.score DESC, c.start_seconds)::integer - 1),
               c.start_seconds, c.end_seconds, c.transcript_text, c.status IN ('selected', 'draft'), c.created_at, c.updated_at
        FROM shorts_clips c
        ON CONFLICT (edit_project_id, clip_id) DO NOTHING;
    ELSE
        INSERT INTO shorts_edit_project_clips (edit_project_id, clip_id, position, start_seconds, end_seconds, transcript_text, included, created_at, updated_at)
        SELECT c.source_id, c.id,
               COALESCE((c.score_details->>'order')::integer,
                 row_number() OVER (PARTITION BY c.source_id ORDER BY c.score DESC, c.start_seconds)::integer - 1),
               c.start_seconds, c.end_seconds, c.transcript_text, c.status IN ('selected', 'draft'), c.created_at, c.updated_at
        FROM shorts_clips c
        ON CONFLICT (edit_project_id, clip_id) DO NOTHING;
    END IF;
END $$;
-- +goose StatementEnd
-- Analysis clips belong to the reusable source instead of the old project record.
ALTER TABLE shorts_clips ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES shorts_sources(id) ON DELETE CASCADE;
-- +goose StatementBegin
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'shorts_clips' AND column_name = 'project_id'
    ) THEN
        UPDATE shorts_clips SET source_id = project_id WHERE source_id IS NULL;
        ALTER TABLE shorts_clips DROP CONSTRAINT IF EXISTS shorts_clips_project_id_fkey;
        ALTER TABLE shorts_clips DROP COLUMN project_id;
    END IF;
END $$;
-- +goose StatementEnd
ALTER TABLE shorts_clips ALTER COLUMN source_id SET NOT NULL;
-- +goose StatementBegin
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'shorts_clips'::regclass AND conname = 'shorts_clips_source_id_fkey'
    ) THEN
        ALTER TABLE shorts_clips ADD CONSTRAINT shorts_clips_source_id_fkey FOREIGN KEY (source_id) REFERENCES shorts_sources(id) ON DELETE CASCADE;
    END IF;
END $$;
-- +goose StatementEnd
DROP INDEX IF EXISTS shorts_clips_project_idx;
CREATE INDEX IF NOT EXISTS shorts_clips_source_idx ON shorts_clips(source_id, score DESC);

-- Jobs: retain old export/rerender behavior as legacy jobs; new edit jobs use edit_project_id.
ALTER TABLE shorts_jobs ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES shorts_sources(id) ON DELETE CASCADE;
ALTER TABLE shorts_jobs ADD COLUMN IF NOT EXISTS edit_project_id UUID REFERENCES shorts_edit_projects(id) ON DELETE CASCADE;
-- +goose StatementBegin
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'shorts_jobs' AND column_name = 'project_id'
    ) THEN
        UPDATE shorts_jobs SET source_id = project_id WHERE source_id IS NULL;
        UPDATE shorts_jobs SET edit_project_id = project_id WHERE edit_project_id IS NULL AND job_type IN ('export','rerender');
        UPDATE shorts_jobs SET job_type = 'legacy_' || job_type WHERE job_type IN ('export','rerender');
        ALTER TABLE shorts_jobs DROP CONSTRAINT IF EXISTS shorts_jobs_project_id_fkey;
        ALTER TABLE shorts_jobs DROP COLUMN project_id;
    END IF;
END $$;
-- +goose StatementEnd
ALTER TABLE shorts_jobs ALTER COLUMN source_id SET NOT NULL;
ALTER TABLE shorts_jobs ALTER COLUMN edit_project_id DROP NOT NULL;
-- Preserve existing project IDs as compatibility records for administrative endpoints.
ALTER TABLE shorts_projects ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES shorts_sources(id) ON DELETE CASCADE;
UPDATE shorts_projects SET source_id = id WHERE source_id IS NULL;
ALTER TABLE shorts_projects ALTER COLUMN source_id SET NOT NULL;
-- +goose Down
-- Intentionally non-destructive: reverting would discard independent montages.
