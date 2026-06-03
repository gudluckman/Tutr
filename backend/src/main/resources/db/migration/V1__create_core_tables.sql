CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tutor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(160) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    headline VARCHAR(255),
    bio TEXT,
    location VARCHAR(160),
    is_online BOOLEAN NOT NULL DEFAULT false,
    hourly_rate_min NUMERIC(10, 2),
    hourly_rate_max NUMERIC(10, 2),
    university VARCHAR(160),
    degree VARCHAR(160),
    atar VARCHAR(32),
    profile_image_url TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    parent_name VARCHAR(160),
    parent_email VARCHAR(255),
    parent_phone VARCHAR(64),
    school_year VARCHAR(64),
    subject VARCHAR(120),
    hourly_rate NUMERIC(10, 2),
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    title VARCHAR(180),
    lesson_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    hourly_rate NUMERIC(10, 2) NOT NULL,
    status VARCHAR(32) NOT NULL,
    payment_status VARCHAR(32) NOT NULL,
    lesson_notes TEXT,
    homework TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_profile_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    parent_name VARCHAR(160) NOT NULL,
    parent_email VARCHAR(255) NOT NULL,
    parent_phone VARCHAR(64),
    student_year VARCHAR(64),
    subject VARCHAR(120),
    message TEXT,
    preferred_location VARCHAR(160),
    preferred_mode VARCHAR(32),
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tutor_profiles_public ON tutor_profiles(is_public);
CREATE INDEX idx_tutor_profiles_location ON tutor_profiles(location);
CREATE INDEX idx_students_tutor ON students(tutor_id);
CREATE INDEX idx_lessons_tutor ON lessons(tutor_id);
CREATE INDEX idx_lessons_student ON lessons(student_id);
CREATE INDEX idx_enquiries_tutor_profile ON enquiries(tutor_profile_id);
