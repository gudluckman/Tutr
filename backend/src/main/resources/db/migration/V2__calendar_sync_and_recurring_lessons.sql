CREATE TABLE google_calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    google_account_email VARCHAR(255),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    access_token_expires_at TIMESTAMPTZ,
    calendar_id VARCHAR(255) NOT NULL DEFAULT 'primary',
    sync_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lesson_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    title VARCHAR(180),
    first_lesson_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    hourly_rate NUMERIC(10, 2) NOT NULL,
    frequency VARCHAR(32) NOT NULL,
    interval_count INTEGER NOT NULL DEFAULT 1,
    occurrence_count INTEGER,
    recurrence_until TIMESTAMPTZ,
    recurrence_rule TEXT NOT NULL,
    google_event_id VARCHAR(255),
    google_calendar_id VARCHAR(255),
    google_sync_enabled BOOLEAN NOT NULL DEFAULT false,
    google_sync_status VARCHAR(64),
    google_sync_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lessons
    ADD COLUMN lesson_series_id UUID REFERENCES lesson_series(id) ON DELETE SET NULL,
    ADD COLUMN google_event_id VARCHAR(255),
    ADD COLUMN google_calendar_id VARCHAR(255),
    ADD COLUMN google_sync_enabled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN google_sync_status VARCHAR(64),
    ADD COLUMN google_sync_error TEXT;

CREATE INDEX idx_lessons_series ON lessons(lesson_series_id);
CREATE INDEX idx_lesson_series_tutor ON lesson_series(tutor_id);
