CREATE TABLE imported_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    weekly_hours NUMERIC(10, 2) NOT NULL,
    weekly_income NUMERIC(10, 2) NOT NULL,
    source_filename VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_imported_earnings_tutor_start_date ON imported_earnings(tutor_id, start_date);
