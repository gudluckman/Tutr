ALTER TABLE lessons
    ADD COLUMN miro_board_url TEXT,
    ADD COLUMN google_meet_link TEXT;

ALTER TABLE lesson_series
    ADD COLUMN miro_board_url TEXT,
    ADD COLUMN google_meet_link TEXT;
