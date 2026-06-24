CREATE TABLE google_calendar_deletions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deletion_type VARCHAR(64) NOT NULL,
    calendar_id VARCHAR(255) NOT NULL DEFAULT 'primary',
    event_id VARCHAR(255) NOT NULL,
    occurrence_date TIMESTAMPTZ,
    recurrence_rule TEXT,
    related_event_ids TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_google_calendar_deletions_tutor
    ON google_calendar_deletions(tutor_id, created_at);
