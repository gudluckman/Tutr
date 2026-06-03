# Tutr

Tutr is an MVP SaaS-style tutor marketplace and business management platform for independent private tutors. The initial product lets tutors publish a profile, receive parent/student enquiries, manage students and lessons, track lesson payment status, and view simple income analytics.

Development milestones are tracked in [`PROGRESS.md`](PROGRESS.md) as a
lightweight daily standup log.

## Tech Stack

- Backend: Java 21, Spring Boot 3.5, Maven
- Backend libraries: Spring Web, Spring Security, Spring Data JPA, PostgreSQL driver, Flyway, Validation, Lombok, JJWT
- Frontend: React, TypeScript, Vite
- Frontend libraries: React Router, TanStack Query, Axios, Tailwind CSS
- Database: PostgreSQL via Docker Compose

## Local Setup

Start PostgreSQL from the repository root:

```bash
docker compose up -d
```

Run the backend:

```bash
cd backend
SPRING_PROFILES_ACTIVE=local ./mvnw spring-boot:run
```

Local and dev databases start empty after Flyway migrations. To load repeatable local sample data on demand, start the Docker Postgres container and run:

```bash
./backend/scripts/seed-local-db.sh
```

The seed script resets local app tables and loads demo tutors, students, enquiries, lessons, and analytics data. You can then log into the seeded tutor dashboard with:

```text
Email: sarah.chen@tutr.dev
Password: password123
```

To enable Google Calendar sync locally, create an OAuth client in Google Cloud, enable the Google Calendar API, and set:

```text
GOOGLE_CALENDAR_CLIENT_ID=<client-id>
GOOGLE_CALENDAR_CLIENT_SECRET=<client-secret>
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:8080/api/v1/calendar/google/callback
FRONTEND_URL=http://localhost:5173
```

Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Build the frontend:

```bash
cd frontend
npm run build
```

Compile/test the backend:

```bash
cd backend
./mvnw test
```

The backend API base URL is:

```text
http://localhost:8080/api/v1
```

The Vite frontend defaults to:

```text
http://localhost:5173
```

Copy the example env files before customising local settings:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

The `local` backend profile uses the Docker Postgres defaults unless you create `backend/.env.local`.
The Docker Postgres data is temporary in this repo, so local test rows disappear when the container is recreated.

## Supabase / Managed Postgres

If you provision a Supabase (or Neon, RDS, etc.) Postgres instance for beta/production, set the following environment variables for the backend before starting it. Your provider will give you the host, port, database, username and password.

For local development, copy the example file and fill in the values from Supabase:

```bash
cp backend/.env.dev.example backend/.env.dev
```

Example using Supabase's Session Pooler, which is usually the easiest local/DBeaver option if your network does not support IPv6:

```bash
DATABASE_URL=jdbc:postgresql://aws-0-<REGION>.pooler.supabase.com:5432/postgres?sslmode=require
DATABASE_USERNAME=postgres.<PROJECT_REF>
DATABASE_PASSWORD=<DB_PASSWORD>
JWT_SECRET=<your-jwt-secret>
```

If your network supports IPv6 or you have Supabase's IPv4 add-on, the direct connection also works:

```bash
DATABASE_URL=jdbc:postgresql://db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=<DB_PASSWORD>
```

Then start the backend with the local profile so Spring imports `backend/.env`:

```bash
cd backend
SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run
```

- Ensure `pgcrypto` is available (the repo migration runs `CREATE EXTENSION IF NOT EXISTS pgcrypto;`).
- Flyway runs on startup, so the first boot will apply `V1__create_core_tables.sql` and create tables.
- In DBeaver, use the Supabase Session Pooler: host `aws-0-<REGION>.pooler.supabase.com`, port `5432`, database `postgres`, username `postgres.<PROJECT_REF>`, your database password, and SSL mode `require`. Use the direct host `db.<PROJECT_REF>.supabase.co` only when IPv6/direct connections work for your machine.
- Do not commit secrets; use environment variables or your platform's secret store.

## Dev Deployment

The repo includes a Render Blueprint in `render.yaml`:

- `tutr-api`: Dockerized Spring Boot backend, health checked at `/api/v1/health`
- `tutr-web`: Vite static frontend with SPA rewrites to `index.html`

For a dev deployment:

1. Create a Supabase Postgres project.
2. Connect this GitHub repo in Render and create services from `render.yaml`.
3. Set backend env vars from `backend/.env.dev.example`: `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `JWT_SECRET`, `FRONTEND_URL`, and `CORS_ALLOWED_ORIGINS`.
4. Set frontend `VITE_API_BASE_URL` to the deployed backend URL plus `/api/v1`.
5. After both services deploy, visit `https://<api-host>/api/v1/health` and then open the frontend URL.

## MVP Features

- Tutor registration and login with JWT authentication
- Public tutor search and profile pages
- Public enquiry form on tutor profiles
- Convert enquiries into students from the tutor dashboard
- Tutor profile editing and publishing controls
- Student CRUD for each tutor
- Lesson CRUD with status and payment status
- Enquiry inbox with status updates
- Analytics summary for revenue, unpaid lessons, and lesson counts

## Project Structure

```text
tutr/
  backend/
    src/main/java/com/tutr/api/
      auth/
      users/
      tutors/
      students/
      lessons/
      enquiries/
      analytics/
      common/
      config/
    src/main/resources/db/migration/
  frontend/
    src/
      app/
      api/
      pages/
      components/
      types/
  docker-compose.yml
  README.md
  .gitignore
```

## Future Roadmap

- Stronger auth flows: refresh tokens, password reset, email verification
- Profile quality improvements: subjects, availability, testimonials, richer search filters
- Better lesson workflows: recurring lessons, cancellation notes, invoice exports
- Parent/student conversion flow from enquiries to students
- Production deployment configuration, observability, and CI
- Payments, calendar sync, chat, and advanced marketplace features after the MVP is validated
