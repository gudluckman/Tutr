ALTER TABLE lessons
    ADD COLUMN google_color_id VARCHAR(2),
    ADD COLUMN google_extra_reminder_minutes INTEGER;

ALTER TABLE lesson_series
    ADD COLUMN google_color_id VARCHAR(2),
    ADD COLUMN google_extra_reminder_minutes INTEGER;
