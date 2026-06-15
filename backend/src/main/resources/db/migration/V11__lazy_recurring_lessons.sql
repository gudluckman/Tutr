ALTER TABLE lesson_series
    ADD COLUMN lesson_notes TEXT,
    ADD COLUMN homework TEXT,
    ADD COLUMN excluded_lesson_dates TEXT NOT NULL DEFAULT '';
