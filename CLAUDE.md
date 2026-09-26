# CLAUDE.md: Plane

Instructions for Claude Code working on this repository. Read this file and `PRD.md` fully before writing any code. `PRD.md` defines **what** to build. This file defines **how** to build it.

---

## 1. Ground Rules (highest priority)

These rules come from the project owner (Yash) and override everything else, including your own instincts about "best practice".

**What this project is:** a personal, learning-focused resume project for showcasing backend skills. It is not a startup product and does not need to be 110% production-perfect.

**The rule in one line:** keep every feature, fix each one properly, and implement at learning level with no extra machinery just to make it perfect.

- Yash must be able to explain every line in an interview. The more complex the code, the harder that is. **Simple and readable always wins over clever.**
- Every feature in `PRD.md` must be implemented completely and correctly. Simple does not mean incomplete or buggy.
- Use patterns every backend developer recognizes (routes, controllers, middlewares, validators, utils). Do not invent abstractions.
- Do not add features, endpoints, fields, packages or config that `PRD.md` does not ask for. If you think something is missing, ask instead of adding it.
- Do not solve hypothetical problems. No generic base classes, repository pattern, dependency injection containers, service layers, event buses, plugin systems, or "future-proof" configuration.
- Code must be clean, typed, lint-free, and working. No `TODO`s, stubs, or placeholder handlers left behind.
- Comments only where the "why" is not obvious. No JSDoc blocks on every function.

When a choice is between "more correct in theory" and "simpler to explain", choose simpler as long as it is still correct for this project's scale.

## 2. Working Process

- Build in the phases listed in section 10, one phase at a time.
- **At the end of each phase, stop.** Give a short summary: what was built and files touched. Then wait for approval before starting the next phase.
- Before finishing a phase, run `npm run lint`, `npm run typecheck` and `npm test`. All must pass.
- Write the tests for a phase in that same phase, not at the end.
- If `PRD.md` is ambiguous, ask a question rather than guessing.
- The old tutorial code (MongoDB/JavaScript) is **reference only**. Do not port it. Build fresh with the stack below.

## 3. Tech Stack

| Area | Choice |
|---|---|
| Runtime | Node.js (current LTS) |
| Language | TypeScript (`strict: true`) |
| Framework | Express 5 |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| Auth | JWT access and refresh tokens (`jsonwebtoken`) in httpOnly cookies |
| Password hashing | `bcrypt` |
| File storage | Cloudinary (`cloudinary`), uploads received with `multer` memory storage |
| Email | Resend (`resend`) |
| Queue | BullMQ |
| Cache and queue backend | Redis (`ioredis`) |
| Logging | Pino (`pino`, `pino-http`, `pino-pretty` in dev) |
| Security middleware | `helmet`, `cors`, `express-rate-limit`, `cookie-parser` |
| Testing | Vitest + Supertest |
| API docs | OpenAPI 3 YAML + `swagger-ui-express` |
| Containers | Docker + Docker Compose |
| CI | GitHub Actions |
| Code quality | ESLint (`typescript-eslint`) + Prettier |
| Package manager | npm |
| Dev runner | `tsx` (watch mode) |
| Deployment | Railway |

Use current stable versions. Follow the current official Prisma docs for client generation and setup. Do not add packages outside this list without asking.

**Module system:** ES modules (`"type": "module"`, `module` and `moduleResolution` set to `NodeNext`). Relative imports use the `.js` extension, as NodeNext requires.

## 4. Repository Structure

```
plane/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── docs/
│   │   └── openapi.yaml
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts            # Zod-validated environment variables
│   │   │   ├── db.ts             # Prisma client instance
│   │   │   ├── redis.ts          # ioredis connection
│   │   │   ├── logger.ts         # Pino logger
│   │   │   └── cloudinary.ts     # Cloudinary config
│   │   ├── controllers/          # one file per resource
│   │   ├── routes/
│   │   │   ├── index.ts          # v1 router, mounts all routers
│   │   │   └── *.routes.ts
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts         # verifyJWT, requireVerifiedEmail
│   │   │   ├── project-role.middleware.ts # requireProjectRole
│   │   │   ├── validate.middleware.ts
│   │   │   ├── upload.middleware.ts
│   │   │   ├── rate-limit.middleware.ts
│   │   │   └── error.middleware.ts        # notFound + errorHandler
│   │   ├── validators/           # Zod schemas, one file per resource
│   │   ├── queues/
│   │   │   └── email.queue.ts    # queue + addEmailJob helper
│   │   ├── workers/
│   │   │   └── email.worker.ts   # separate process entry point
│   │   ├── utils/
│   │   │   ├── api-error.ts
│   │   │   ├── api-response.ts
│   │   │   ├── tokens.ts         # JWT sign/verify, random token + sha256 hash
│   │   │   ├── cookies.ts        # cookie options by environment
│   │   │   ├── cache.ts          # get/set/delete dashboard cache
│   │   │   ├── activity.ts       # logActivity helper
│   │   │   ├── email-templates.ts
│   │   │   ├── file-storage.ts   # upload/delete on Cloudinary
│   │   │   ├── pagination.ts
│   │   │   └── selects.ts        # shared Prisma selects, e.g. publicUserSelect
│   │   ├── types/
│   │   │   └── express.d.ts      # Request augmentation
│   │   ├── app.ts                # builds and exports the Express app (no listen)
│   │   └── server.ts             # starts the HTTP server
│   ├── tests/
│   │   ├── helpers/              # test DB reset, user/login factories
│   │   └── *.test.ts
│   ├── .env.example
│   ├── Dockerfile
│   ├── eslint.config.js
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── package.json
├── frontend/                     # empty for now (.gitkeep)
├── .github/workflows/ci.yml
├── docker-compose.yml
├── .gitignore
├── CLAUDE.md
├── PRD.md
└── README.md
```

**Controller files:** `auth`, `user`, `project`, `member`, `invitation`, `task`, `attachment`, `subtask`, `comment`, `note`, `dashboard`, `activity`, `healthcheck`.

**Nested routers:** project sub-resources use `Router({ mergeParams: true })` and are mounted under `/projects/:projectId/...`.

**No service layer.** Controllers call Prisma directly. Shared logic that is genuinely reused goes into a small function in `utils/`.

## 5. Coding Conventions

**General**
- Named exports only. `camelCase` for functions and variables, `PascalCase` for types, kebab-case with a suffix for file names (`task.controller.ts`, `task.routes.ts`, `task.validator.ts`).
- Small, flat functions. Early returns instead of nested `if`s.
- No `any`. Use Prisma-generated types and `z.infer` types.
- Use Prisma enums (`ProjectRole`, `TaskStatus`, `TaskPriority`, `InvitationStatus`) everywhere instead of string literals.

**Controllers**
- Signature `(req: Request, res: Response) => Promise<void>` or equivalent.
- **No `asyncHandler` wrapper.** Express 5 forwards rejected promises to the error handler automatically. (This is a good interview point.)
- Throw `ApiError` for expected failures. Respond with `res.status(code).json(new ApiResponse(code, data, message))`.
- Never return `passwordHash` or any token hash. Use `publicUserSelect` from `utils/selects.ts` whenever user data is included.
- Always scope child lookups to the parent: `prisma.task.findFirst({ where: { id: taskId, projectId } })`. A resource from another project is a `404`.
- Use `prisma.$transaction` only where two writes must succeed together (for example, create project plus Admin membership, or accept invitation plus create membership).

**Errors**
- `ApiError(statusCode, message, errors?)`.
- `errorHandler` in `error.middleware.ts` handles, in order: `ApiError`, `ZodError` (422 with `[{ field, message }]`), Prisma known errors (`P2002` → 409, `P2025` → 404), Multer errors (`LIMIT_FILE_SIZE` → 413, others → 400), and anything else → 500 with a generic message. It logs unexpected errors with Pino. It includes `stack` only in development.
- `notFound` returns 404 JSON for unknown routes.

**Validation**
- One `validate({ body?, params?, query? })` middleware that parses with Zod.
- Parsed `body` and `params` replace `req.body` and `req.params`. In Express 5, `req.query` is read-only, so parsed query goes to `req.validatedQuery`.
- All `:id` params are validated as UUIDs.
- Emails are trimmed and lowercased. Usernames are trimmed and lowercased.

**Auth middleware**
- `verifyJWT` reads the access token from the `accessToken` cookie or `Authorization: Bearer`, verifies it, loads the user, and sets `req.user`. Any failure is a 401.
- `requireVerifiedEmail` returns 403 `"Please verify your email first"` when `req.user.isEmailVerified` is false.
- `requireProjectRole(...roles)` loads the membership for `req.params.projectId` and `req.user.id`. No membership → 404 `"Project not found"`. Role not allowed → 403. It sets `req.projectMember`. Call it with no arguments to allow any member.
- `types/express.d.ts` adds `user`, `projectMember` and `validatedQuery` to `Request`.

**Tokens**
- Access and refresh tokens are JWTs with different secrets. Payload: `{ sub: userId }`.
- Verification, reset and invitation tokens: `crypto.randomBytes(32).toString("hex")`. Store only the SHA-256 hash, send the raw token in the email link.
- Refresh token: store its SHA-256 hash on the user. On refresh, compare hashes, then issue and store a new pair (rotation). One active refresh token per user.
- Cookie options come from one function in `utils/cookies.ts` (see PRD section 8).

**Email**
- Controllers call `addEmailJob({ to, subject, html, text })` from `queues/email.queue.ts`. They never call Resend directly.
- Templates are plain functions in `utils/email-templates.ts` that return `{ subject, html, text }`. Keep the HTML simple.
- Email links use `CLIENT_URL`: `/verify-email/{token}`, `/reset-password/{token}`, `/invitations/{token}`.

**Queue and worker (keep it this small)**
- One queue named `email`. Default job options: `attempts: 3`, `backoff: { type: "exponential", delay: 5000 }`, `removeOnComplete: true`, `removeOnFail: 100`.
- `workers/email.worker.ts` is its own entry point (`npm run worker`). It creates a BullMQ `Worker` that sends through Resend and throws on failure so BullMQ retries. It logs `completed` and `failed` events. It closes gracefully on `SIGTERM` and `SIGINT`.
- Development fallback: if `RESEND_API_KEY` is missing and `NODE_ENV=development`, log the email instead of sending.
- BullMQ connections need `maxRetriesPerRequest: null` on the ioredis connection.
- No other queues, no scheduled jobs, no job priorities, no flows.

**Cache (keep it this small)**
- `utils/cache.ts` exposes exactly `getDashboardCache(projectId)`, `setDashboardCache(projectId, data)` and `invalidateDashboardCache(projectId)`. Key `project:{projectId}:dashboard`, TTL 60 seconds, value stored as JSON.
- Each function wraps Redis calls in `try/catch`. On error, log a warning and behave like a cache miss. Redis being down must never break a request.
- The dashboard controller uses cache-aside: read the cache, on a miss compute with Prisma (`groupBy` and `count`), store the result, then return it.
- Call `invalidateDashboardCache` after: task create, update and delete; member role change; member removal; invitation accepted.
- Nothing else is cached.

**Activity log**
- `logActivity({ projectId, actorId, action, entityType, entityId, metadata })` in `utils/activity.ts`. Call it after the successful write, for the actions listed in PRD 3.11 only.

**Uploads**
- `multer.memoryStorage()`. Attachments: max 5 files, 5 MB each, MIME whitelist from the PRD. Avatar: 1 image, 2 MB.
- `utils/file-storage.ts`: `uploadFile(buffer, folder)` using `cloudinary.uploader.upload_stream` with `resource_type: "auto"`, returning `{ url, publicId }`; and `deleteFile(publicId)`.
- Folders: `plane/attachments`, `plane/avatars`.
- When deleting a task or project, collect attachment public ids first, delete the database rows, then delete the files from Cloudinary. Log Cloudinary delete failures but do not fail the request.

**Pagination**
- `utils/pagination.ts`: turns `page` and `limit` into `skip` and `take`, and builds the `pagination` object. Default 20, max 100.

**Logging**
- `pino-http` for request logs. Redact `req.headers.authorization` and `req.headers.cookie`. Use `pino-pretty` only when `NODE_ENV=development`. No `console.log` in app code.

**App setup order in `app.ts`:** `helmet` → `cors` → `express.json({ limit: "100kb" })` → `urlencoded` → `cookieParser` → `pino-http` → `/api-docs` → `/api/v1` routes → `notFound` → `errorHandler`.

## 6. Environment Variables

Validated in `src/config/env.ts` with Zod. On failure, print which variables are missing and exit. Provide all of them in `.env.example`.

```
NODE_ENV=development
PORT=8000
LOG_LEVEL=info

DATABASE_URL=postgresql://plane:plane@localhost:5432/plane
REDIS_URL=redis://localhost:6379

CLIENT_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

ACCESS_TOKEN_SECRET=
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=
REFRESH_TOKEN_EXPIRY=7d

RESEND_API_KEY=
EMAIL_FROM=Plane <onboarding@resend.dev>

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

`RESEND_API_KEY` is optional only in development. Cloudinary variables are required. In tests, Cloudinary and the email queue are mocked.

## 7. npm Scripts (backend/package.json)

```
dev          tsx watch src/server.ts
worker:dev   tsx watch src/workers/email.worker.ts
build        prisma generate && tsc
start        node dist/server.js
worker       node dist/workers/email.worker.js
lint         eslint .
format       prettier --write .
typecheck    tsc --noEmit
test         vitest run
test:watch   vitest
db:migrate   prisma migrate dev
db:deploy    prisma migrate deploy
db:seed      prisma db seed (runs prisma/seed.ts with tsx)
db:studio    prisma studio
```

## 8. Testing

- Integration tests with Vitest + Supertest against the exported `app` (not a running server).
- Use a separate test database (`DATABASE_URL` pointing to a `plane_test` database). Run `prisma migrate deploy` against it before tests. Truncate all tables before each test file with a helper.
- Run test files sequentially (`fileParallelism: false`) because they share one database.
- Mock `queues/email.queue.ts` (`addEmailJob`) and `utils/file-storage.ts` with `vi.mock`. Tests assert that `addEmailJob` was called with the right recipient and link. Redis is real in tests (provided by Docker Compose locally and by a service in CI).
- Helpers: `createUser({ verified })`, `loginAs(user)` returning an agent with cookies, `createProjectWithRole(role)`.

**Minimum coverage:**
- **Auth:** register, login, logout, current user, refresh rotation (the old refresh token is rejected after rotation), verify email, forgot password (same response for unknown emails), reset password, change password.
- **Verification gate:** an unverified user gets 403 on project routes.
- **Permissions:** for each row of the PRD permission matrix, one allowed and one denied case. Non-members get 404.
- **Invitations:** invite, duplicate invite (409), already a member (409), accept with matching email, accept with wrong email (403), expired token, revoke.
- **Tasks:** CRUD, assignee must be a member, list filters and pagination, task from another project returns 404.
- **Subtasks:** a member can toggle completion but cannot rename.
- **Comments:** author edit, non-author edit (403), Admin delete.
- **Dashboard:** correct counts; a second request is served from cache; a task update invalidates the cache.
- **Health check:** returns 200 with DB and Redis up.

## 9. Docker, CI and Deployment

**`backend/Dockerfile`**: two stages. The build stage runs `npm ci`, `prisma generate` and `tsc`. The run stage uses `node:<lts>-slim`, production dependencies, `dist/` and `prisma/`. The same image runs both the API (`node dist/server.js`) and the worker (`node dist/workers/email.worker.js`). In containers, start Node directly, not through npm: npm as the main process does not pass `SIGTERM` on, so the worker would be killed before its graceful shutdown runs.

**`docker-compose.yml`** (repo root): services `postgres` (with a volume), `redis`, `api` (runs `prisma migrate deploy` then `exec node dist/server.js`, depends on postgres and redis), and `worker` (`node dist/workers/email.worker.js`). It reads `backend/.env`. For local development, running only `docker compose up postgres redis` and then `npm run dev` plus `npm run worker:dev` must also work.

**`.github/workflows/ci.yml`**: on push and pull request, with Postgres and Redis service containers: `npm ci` → `prisma migrate deploy` → `lint` → `typecheck` → `test` → `build`. Working directory `backend`.

**Railway** (documented in the README, not automated): two services from the same repo with root directory `backend`, plus Railway Postgres and Railway Redis.
- API service: pre-deploy command `npm run db:deploy`, start command `node dist/server.js`.
- Worker service: start command `node dist/workers/email.worker.js`.
- Set `NODE_ENV=production`, `CLIENT_URL` and `CORS_ORIGIN` to the frontend URL once it exists.
- Run the seed once against the production database.

## 10. Build Phases

Stop after each phase for review (section 2).

1. **Scaffold.** Folder structure, `package.json`, TypeScript, ESLint and Prettier, `env.ts`, logger, `ApiError` and `ApiResponse`, error middleware, `app.ts` and `server.ts`, health check (DB and Redis), `docker-compose.yml` with Postgres and Redis, `.env.example`, `.gitignore`, Vitest setup with a health check test.
2. **Database.** Full Prisma schema from PRD section 5, first migration, Prisma client in `config/db.ts`, `publicUserSelect`.
3. **Auth, email queue and worker.** Token utils, cookie utils, auth validators, controllers and routes, `verifyJWT`, `requireVerifiedEmail`, email templates, email queue, email worker, rate limiting on auth routes. Auth tests.
4. **Users.** Profile update, avatar upload with Cloudinary (`file-storage.ts`, upload middleware). Tests.
5. **Projects and members.** `requireProjectRole`, project CRUD (creation in a transaction with the Admin membership), member list, role change, removal, the last-Admin rule, Cloudinary cleanup on project delete. Tests.
6. **Invitations.** Create, list, revoke, preview, accept (in a transaction). Tests.
7. **Tasks, attachments and subtasks.** Task CRUD, list filters, sort and pagination, attachments, subtasks with member rules. Tests.
8. **Comments and notes.** Tests.
9. **Activity log and dashboard.** `logActivity` calls added across controllers, activity feed, dashboard with cache-aside and invalidation. Tests.
10. **Docs and seed.** Complete `docs/openapi.yaml` for every endpoint with request and response examples and cookie plus bearer auth; Swagger UI at `/api-docs`; `prisma/seed.ts` with a verified demo account.
11. **Delivery.** Dockerfile, full Compose file (API and worker), GitHub Actions CI, and a README with an overview, architecture summary, stack, local setup, demo credentials, a link to the API docs, and Railway deployment steps.

## 11. Pitfalls From the Old Tutorial Code (do not repeat)

- A permission middleware factory that forgot to `return` its inner function.
- No global error handler, so errors came back as HTML.
- Child resources (tasks) not checked to belong to the project in the URL.
- Attachment URLs that did not match the stored file name.
- Forgot password revealing whether an email exists.
- Project delete leaving orphaned members, tasks and notes (use Prisma `onDelete: Cascade`).
- Being able to remove or demote the last Admin.
- Invalid ids causing 500s instead of validation errors.
- Wrong or typo'd status codes (for example `489`, `201` on reads).
- Email links pointing to routes that did not exist.
