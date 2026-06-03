ALTER TABLE lessons
    ADD COLUMN invite_email VARCHAR(255);

ALTER TABLE lesson_series
    ADD COLUMN invite_email VARCHAR(255);
