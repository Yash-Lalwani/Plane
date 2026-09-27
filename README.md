# Plane

Plane is a REST API for collaborative project management. Teams organize work into projects; inside a project, members manage tasks, subtasks, attachments, comments and notes. Access is controlled by per-project roles, emails are sent in the background through a queue, and the project dashboard is cached in Redis.

This is the backend. A frontend will be added later in `frontend/`.

**Live API:** https://api.plane.yashlalwani.info/api/v1 · **API docs:** https://api.plane.yashlalwani.info/api-docs (locally: http://localhost:8000/api-docs)

## Features

- **Auth:** register, login and logout; JWT access and refresh tokens in httpOnly cookies (also returned in the body for non-browser clients); refresh token rotation; email verification; forgot, reset and change password.
- **Per-project roles:** Admin, Project Admin and Member, with the last Admin protected from demotion or removal.
- **Projects and members:** membership is only through email invitations, which expire after 7 days.
- **Tasks:** filters (status, priority, assignee, overdue, search), sorting and pagination; subtasks, comments, and file attachments on Cloudinary.
- **Notes and activity:** project notes, and an activity feed of important actions.
- **Dashboard:** task and member counts, cached in Redis.
- **Background email:** a BullMQ queue and a separate worker process that sends through Resend, with retries.
- **API docs and demo data:** an OpenAPI spec with Swagger UI, and seed data with a demo account.

## Tech stack

| Area | Choice |
|---|---|
| Runtime and language | Node.js 24, TypeScript (strict, ES modules) |
| Framework | Express 5 |
| Database | PostgreSQL with Prisma 7 |
| Validation | Zod |
| Auth | `jsonwebtoken`, `bcrypt`, httpOnly cookies |
| Queue and cache | BullMQ and Redis (`ioredis`) |
| Email | Resend |
| File storage | Cloudinary, uploads through `multer` |
| Logging | Pino (`pino-http`) |
| Security | `helmet`, `cors`, `express-rate-limit` |
| Testing | Vitest and Supertest |
| Delivery | Docker, Docker Compose, GitHub Actions, Railway |

## Architecture

```
            ┌──────────────── API process ────────────────┐
 client ──▶ │ helmet → cors → body parsers → cookies → logs│
            │   → route → validate (Zod) → verifyJWT       │
            │   → requireVerifiedEmail → requireProjectRole│
            │   → controller ──▶ Prisma ──▶ PostgreSQL     │
            │        │                                     │
            │        ├──▶ Redis: dashboard cache           │
            │        ├──▶ Cloudinary: uploads              │
            │        └──▶ BullMQ "email" queue (Redis)     │
            └────────────────────────│─────────────────────┘
                                     ▼
                        Worker process ──▶ Resend
```

- **Request flow.**
  - Every request goes through the middleware chain above.
  - `validate` parses the body, params and query with Zod; invalid input is a `422` with field errors.
  - `verifyJWT` reads the access token from the cookie or an `Authorization: Bearer` header.
  - `requireProjectRole` loads the caller's membership. A non-member gets `404`, so the API never reveals which projects exist; a member without the right role gets `403`.
  - Controllers call Prisma directly, and there is no service layer.
- **Errors.** Controllers throw `ApiError`. Express 5 forwards rejected promises to one error handler, which also turns Zod, Prisma and Multer errors into JSON responses.
- **Emails.** Controllers only add a job to the `email` queue. The worker is a separate process that sends through Resend and retries failed jobs 3 times with exponential backoff.
- **Dashboard cache.** The dashboard uses cache-aside:
  - It reads Redis first. On a miss, it computes the counts with Prisma and stores them for 60 seconds.
  - Task changes, member changes and accepted invitations delete the cached entry.
  - If Redis is down, the dashboard is computed from the database.
- **Tokens.** Only SHA-256 hashes are stored for verification, reset, invitation and refresh tokens. Each user has one active refresh token, and every refresh replaces it.

```
backend/
├── prisma/            schema, migrations, seed
├── docs/openapi.yaml  API spec served by Swagger UI
├── src/
│   ├── config/        env validation, Prisma, Redis, logger, Cloudinary
│   ├── routes/        one router per resource (nested routers for project resources)
│   ├── middlewares/   auth, project roles, validation, uploads, rate limits, errors
│   ├── validators/    Zod schemas
│   ├── controllers/   request handlers
│   ├── queues/        email queue
│   ├── workers/       email worker entry point
│   └── utils/         tokens, cookies, cache, activity log, pagination, file storage
└── tests/             integration tests
```

## Local setup

You need Node.js 24 and Docker.

1. **Create the environment file.**

   ```bash
   cp backend/.env.example backend/.env
   ```

   In `backend/.env`:
   - Set `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` to two different random values. You can generate each with `openssl rand -hex 32`.
   - Fill in the three `CLOUDINARY_*` values from your Cloudinary dashboard.
   - Optionally leave `RESEND_API_KEY` empty. In development, the worker then logs each email (recipient, subject and link) instead of sending it.

2. **Start Postgres and Redis.** The first start also creates the `plane_test` database used by the tests.

   ```bash
   docker compose up -d postgres redis
   ```

3. **Install, migrate and seed.**

   ```bash
   cd backend
   npm install
   npm run db:migrate
   npm run db:seed
   ```

4. **Run the API and the worker** in two terminals.

   ```bash
   npm run dev          # API on http://localhost:8000
   npm run worker:dev   # email worker
   ```

To run everything in containers instead (Postgres, Redis, the API and the worker), use `docker compose up --build` from the repository root. The API container applies migrations before starting.

### Demo account

`npm run db:seed` creates a verified demo user:

- **Email:** `demo@plane.dev`
- **Password:** `DemoPass123!`

The demo user is an Admin in "Website Relaunch" and a Member in "Mobile App Beta". Both projects already have tasks, subtasks, comments, notes and activity. The seed never changes existing data: if the demo user exists, it does nothing.

In Swagger UI, call `POST /auth/login` with the demo credentials, copy `accessToken` from the response, click **Authorize** and paste it under `bearerAuth`.

## Tests

```bash
cd backend
npm test
```

The tests are integration tests that call the Express app through Supertest. Before starting, Vitest applies migrations to the separate `plane_test` database. Test files run one at a time, and each one empties the database first.

Redis is real: tests use Redis database 1, so they don't touch development data. The email queue and Cloudinary are mocked.

Postgres and Redis must be running (`docker compose up -d postgres redis`).

## npm scripts (in `backend/`)

| Script | What it does |
|---|---|
| `dev` / `worker:dev` | API / worker with reload on change (`tsx watch`) |
| `build` | `prisma generate` and compile to `dist/` |
| `start` / `worker` | Run the compiled API / worker |
| `lint`, `format`, `typecheck` | ESLint, Prettier, `tsc --noEmit` |
| `test`, `test:watch` | Vitest |
| `db:migrate` | Create and apply migrations in development |
| `db:deploy` | Apply migrations (production, CI) |
| `db:seed` | Insert the demo data |
| `db:studio` | Open Prisma Studio |

## CI

`.github/workflows/ci.yml` runs on every push and pull request. It starts Postgres and Redis service containers, then runs `npm ci`, `prisma migrate deploy`, lint, typecheck, tests and build.

## Deploying to Railway

The API and the worker are two Railway services built from this repository with the same `backend/Dockerfile`, plus Railway Postgres and Railway Redis.

1. Create a Railway project, and add **PostgreSQL** and **Redis** to it.
2. Add a service from this GitHub repository for the **API**:
   - **Root directory:** `backend`. Railway builds `backend/Dockerfile`.
   - **Start command:** leave it empty. The image's default command applies pending migrations (`prisma migrate deploy`) and then starts the server, so every deploy migrates the database automatically. If a migration fails, the server doesn't start and the deploy fails.
   - Generate a public domain for it.
3. Add a second service from the same repository for the **worker**:
   - **Root directory:** `backend`
   - **Start command:** `node dist/workers/email.worker.js`
   - No public domain is needed.
4. Set these variables on **both** services:
   - `NODE_ENV=production`
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}`
   - `REDIS_URL=${{Redis.REDIS_URL}}`
   - `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`: new random values, different from your local ones
   - `ACCESS_TOKEN_EXPIRY=15m` and `REFRESH_TOKEN_EXPIRY=7d`
   - `RESEND_API_KEY`, which is required in production, and `EMAIL_FROM`. The default `onboarding@resend.dev` sender only delivers to your own Resend account address; to email other people, verify a domain in Resend.
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`
   - `CLIENT_URL` and `CORS_ORIGIN`: the frontend URL, for example `https://plane.yashlalwani.info`. `CLIENT_URL` is used in email links, and `CORS_ORIGIN` is the only origin browsers may call the API from.
   - `COOKIE_DOMAIN`: the parent domain shared by the frontend and API, with a leading dot, for example `.plane.yashlalwani.info`. The auth cookies are then valid on both subdomains. Leave it unset to keep them on the API host only.
5. Run the seed once against the production database from your machine, using the Postgres **public** connection URL from Railway:

   ```bash
   cd backend
   DATABASE_URL="<Railway Postgres public URL>" npm run db:seed
   ```

Both services end up running Node directly rather than through `npm start` or `npm run worker`. The API's default command `exec`s into Node after migrating, and the worker's start command is `node` itself. Railway sends `SIGTERM` on redeploys. When npm is the main process it doesn't pass that signal on properly, so the worker would be killed before it could finish its current job and close cleanly.

If Redis connections time out over Railway's private network, append `?family=0` to `REDIS_URL`. That lets `ioredis` connect over IPv6.

## Notes

### Cloudinary PDF delivery

New Cloudinary accounts block delivery of PDF and ZIP files by default. PDF attachments upload fine, but their URLs return `401` until you enable **Settings → Security → Allow delivery of PDF and ZIP files** in the Cloudinary console.

### Known `npm audit` warnings

`npm audit` in `backend/` reports high-severity advisories that all come from the Prisma 7 CLI (`prisma`). They are safe to ignore:

- **`mysql2`:** the CLI ships drivers for every database it supports. The advisories only apply when connecting to a MySQL server. Plane uses PostgreSQL through `@prisma/adapter-pg` and never connects to MySQL.
- **`deepmerge-ts`** (through `@prisma/config`): the CLI uses it to merge our own `prisma.config.ts`. The advisory needs attacker-controlled recursive objects, and no request data ever reaches this code.

The only fix npm offers is a downgrade to Prisma 6, so the warnings are left as they are.
