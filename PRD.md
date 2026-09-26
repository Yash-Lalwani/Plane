# Plane: Product Requirements Document

**Version:** 2.0
**Type:** REST API for a collaborative project management platform
**Status:** Backend in progress. A frontend will be added later in `/frontend`.

Plane is a learning-focused resume project. Every feature must be implemented correctly, but at a level that can be fully explained in an interview. See `CLAUDE.md` for the ground rules, which take priority over everything in this document.

---

## 1. Overview

Plane lets teams organize work into projects. Inside a project, members manage tasks, subtasks, attachments, comments and notes. Access is controlled by per-project roles. Emails are sent in the background through a queue, and the project dashboard is cached in Redis.

## 2. Roles

Roles are **per project**, stored on the project membership. A user can be an Admin in one project and a Member in another.

| Role | Value | Summary |
|---|---|---|
| Admin | `ADMIN` | Full control of the project, its members, invitations and notes |
| Project Admin | `PROJECT_ADMIN` | Manages tasks, subtasks and attachments |
| Member | `MEMBER` | Views everything, completes subtasks, comments |

Any authenticated user with a verified email can create a project. The creator automatically becomes that project's Admin.

A project must always have at least one Admin. The last Admin cannot be demoted or removed.

## 3. Features

### 3.1 Authentication

- **Register** with email, username, password and optional full name. A verification email is queued.
- **Login** with email and password. Returns an access token and a refresh token, both set as httpOnly cookies. The access token is also returned in the body so Swagger and non-browser clients can use `Authorization: Bearer`.
- **Logout** clears cookies and the stored refresh token.
- **Current user** returns the logged-in user's public profile.
- **Refresh token** issues a new access token and rotates the refresh token. The refresh token is stored hashed in the database. A token that does not match the stored hash is rejected.
- **Email verification** by token. Tokens are random, stored hashed, and expire after 20 minutes.
- **Resend verification email** for logged-in, unverified users.
- **Forgot password** always returns the same success message, whether or not the email exists (prevents account enumeration). If the account exists, a reset email is queued.
- **Reset password** by token. Tokens are stored hashed and expire after 20 minutes. A successful reset clears the stored refresh token, logging out other sessions.
- **Change password** requires the old password.

**Email verification rule:** unverified users can log in and use auth and profile endpoints, but every project-related endpoint (projects, members, invitations, tasks, notes, dashboard, activity, accepting an invitation) returns `403` until the email is verified.

**Password rule:** minimum 8 characters.

### 3.2 User Profile

- Update profile (full name, username).
- Upload or replace avatar (images only, stored on Cloudinary). The old avatar is deleted from Cloudinary when replaced.

### 3.3 Projects

- Create a project with a name and optional description.
- List the projects the user belongs to, including the user's role and the member count.
- Get project details, including the user's role and member count.
- Update project (Admin).
- Delete project (Admin). Deleting a project deletes all of its members, invitations, tasks, subtasks, attachments, comments, notes and activity. Attachment files are also deleted from Cloudinary.

Project names do not need to be unique.

### 3.4 Members

- List project members with their role and public profile.
- Change a member's role (Admin).
- Remove a member (Admin). Tasks assigned to the removed user become unassigned.
- The last Admin cannot be demoted or removed.

Members are added only through invitations (3.5).

### 3.5 Invitations

- Admin invites an email address with a role. The email does not need an existing account.
- An invitation email is queued with a link to `${CLIENT_URL}/invitations/{token}`.
- Tokens are random, stored hashed, and expire after 7 days.
- Inviting someone who is already a member returns `409`. Inviting an email that already has a pending, unexpired invitation to the same project returns `409`.
- Admin can list pending invitations and revoke one.
- Anyone with the token can preview the invitation (project name, inviter, role, invited email, status). This lets the frontend show an invitation page.
- A logged-in, verified user accepts the invitation. The user's email must match the invited email, otherwise `403`. Accepting creates the membership and marks the invitation accepted.
- An invitee without an account registers with the invited email, verifies it, then accepts.

Invitation statuses: `PENDING`, `ACCEPTED`, `REVOKED`. Expiry is checked against `expiresAt`.

### 3.6 Tasks

- Fields: title, description, status, priority, due date, assignee.
- Status: `TODO`, `IN_PROGRESS`, `DONE`. Default `TODO`.
- Priority: `LOW`, `MEDIUM`, `HIGH`. Default `MEDIUM`.
- The assignee must be a member of the project, otherwise `400`.
- Create, update and delete (Admin, Project Admin). View (all members).
- Task details include assignee, creator, subtasks, attachments and comment count.
- Every task lookup is scoped to the project in the URL. A task from another project returns `404`.

**Task list query parameters:**

| Param | Values |
|---|---|
| `status` | `TODO`, `IN_PROGRESS`, `DONE` |
| `priority` | `LOW`, `MEDIUM`, `HIGH` |
| `assignedTo` | a user id, or `me` |
| `overdue` | `true` returns tasks with a past due date that are not `DONE` |
| `search` | case-insensitive match on title |
| `sortBy` | `createdAt` (default), `dueDate`, `priority` |
| `order` | `asc`, `desc` (default) |
| `page`, `limit` | default `1` and `20`, max limit `100` |

### 3.7 Attachments

- Upload up to 5 files per request to a task (Admin, Project Admin).
- Max 5 MB per file. Allowed types: JPEG, PNG, WEBP, PDF, plain text.
- Files are stored on Cloudinary. The database stores URL, Cloudinary public id, original file name, MIME type, size and uploader.
- Delete an attachment (Admin, Project Admin). The file is also deleted from Cloudinary.

### 3.8 Subtasks

- Create and delete (Admin, Project Admin).
- Update: Admin and Project Admin can change title and completion. Members can only change completion. A member sending a title change gets `403`.

### 3.9 Comments

- Any project member can list and add comments on a task. The list is paginated, oldest first.
- The author can edit their comment.
- The author or a project Admin can delete a comment.

### 3.10 Notes

- Project-level notes with content.
- View (all members). Create, update, delete (Admin).

### 3.11 Activity Log

A per-project feed of important actions, written by controllers after a successful change.

Recorded actions:

| Action | When |
|---|---|
| `project.created` / `project.updated` | project created or updated |
| `member.joined` | invitation accepted |
| `member.role_changed` / `member.removed` | role changed or member removed |
| `invitation.sent` / `invitation.revoked` | invitation created or revoked |
| `task.created` / `task.updated` / `task.deleted` | task changes |
| `task.status_changed` | task status changed (recorded instead of `task.updated` when status is the change) |
| `note.created` / `note.updated` / `note.deleted` | note changes |

Each entry stores the actor, action, entity type, entity id, a small JSON metadata object (for example `{ "title": "...", "from": "TODO", "to": "DONE" }`), and a timestamp. All members can view the paginated feed, newest first.

### 3.12 Project Dashboard

One endpoint returning:

- total tasks
- task counts by status
- task counts by priority
- overdue task count
- open (not `DONE`) task count per assigned member
- member count

The response is cached in Redis (see 3.14).

### 3.13 Background Email (BullMQ)

- All emails (verification, password reset, invitation) are added to a single `email` queue. Controllers never call Resend directly.
- A separate worker process consumes the queue and sends the email through Resend.
- Jobs retry 3 times with exponential backoff. Failures are logged.
- If `RESEND_API_KEY` is not set and `NODE_ENV` is `development`, the worker logs the email (recipient, subject, link) instead of sending, so local development works without an email account.

### 3.14 Caching (Redis)

- Only the project dashboard is cached. Key: `project:{projectId}:dashboard`. TTL: 60 seconds.
- The key is deleted whenever something that affects the dashboard changes: task create, update or delete, member role change, member removal, invitation accepted.
- If Redis is unavailable, the dashboard is computed from the database and a warning is logged. The request does not fail.

### 3.15 System

- **Health check** reports API status, database connectivity and Redis connectivity. Returns `200` when both are reachable, `503` otherwise.
- **API docs** served with Swagger UI at `/api-docs` from an OpenAPI spec.
- **Seed data** script creates demo users (including a verified demo account whose credentials are in the README), projects, tasks with varied statuses, priorities and due dates, subtasks, comments, notes and activity, so the deployed API can be explored immediately.

## 4. Permission Matrix

| Action | Admin | Project Admin | Member |
|---|---|---|---|
| Create project (any verified user) | ✓ | ✓ | ✓ |
| View project, members, dashboard, activity | ✓ | ✓ | ✓ |
| Update or delete project | ✓ | ✗ | ✗ |
| Invite, list and revoke invitations | ✓ | ✗ | ✗ |
| Change member roles, remove members | ✓ | ✗ | ✗ |
| View tasks, subtasks, attachments | ✓ | ✓ | ✓ |
| Create, update, delete tasks | ✓ | ✓ | ✗ |
| Upload or delete attachments | ✓ | ✓ | ✗ |
| Create or delete subtasks, edit subtask title | ✓ | ✓ | ✗ |
| Mark subtask complete or incomplete | ✓ | ✓ | ✓ |
| View and add comments | ✓ | ✓ | ✓ |
| Edit own comment | ✓ | ✓ | ✓ |
| Delete any comment | ✓ | ✗ | ✗ (own only) |
| View notes | ✓ | ✓ | ✓ |
| Create, update, delete notes | ✓ | ✗ | ✗ |

Non-members get `404 Project not found` for any project route, so project existence is not leaked. Members without the required role get `403`.

## 5. Data Model

All ids are UUIDs. All tables have `createdAt`, and mutable tables have `updatedAt`.

**User**: `email` (unique, lowercase), `username` (unique, lowercase), `fullName?`, `passwordHash`, `avatarUrl?`, `avatarPublicId?`, `isEmailVerified`, `emailVerificationTokenHash?`, `emailVerificationExpiry?`, `passwordResetTokenHash?`, `passwordResetExpiry?`, `refreshTokenHash?`

**Project**: `name`, `description?`, `createdById → User`

**ProjectMember**: `projectId → Project` (cascade), `userId → User`, `role`. Unique on (`projectId`, `userId`).

**ProjectInvitation**: `projectId → Project` (cascade), `email`, `role`, `tokenHash` (unique), `status`, `invitedById → User`, `expiresAt`, `acceptedAt?`

**Task**: `projectId → Project` (cascade), `title`, `description?`, `status`, `priority`, `dueDate?`, `assignedToId? → User` (set null), `createdById → User`. Index on (`projectId`, `status`).

**Subtask**: `taskId → Task` (cascade), `title`, `isCompleted`, `createdById → User`

**Attachment**: `taskId → Task` (cascade), `url`, `publicId`, `fileName`, `mimeType`, `size`, `uploadedById → User`

**Comment**: `taskId → Task` (cascade), `authorId → User`, `content`

**Note**: `projectId → Project` (cascade), `content`, `createdById → User`

**ActivityLog**: `projectId → Project` (cascade), `actorId → User`, `action`, `entityType`, `entityId`, `metadata?` (JSON). Index on (`projectId`, `createdAt`).

**Enums**: `ProjectRole` (`ADMIN`, `PROJECT_ADMIN`, `MEMBER`), `TaskStatus` (`TODO`, `IN_PROGRESS`, `DONE`), `TaskPriority` (`LOW`, `MEDIUM`, `HIGH`), `InvitationStatus` (`PENDING`, `ACCEPTED`, `REVOKED`)

User deletion is out of scope.

## 6. API Reference

Base path: `/api/v1`. Updates use `PATCH` (partial updates). "Verified" means the user's email must be verified.

### Health and docs

| Method | Path | Access |
|---|---|---|
| GET | `/healthcheck` | Public |
| GET | `/api-docs` (outside `/api/v1`) | Public |

### Auth: `/auth`

| Method | Path | Access |
|---|---|---|
| POST | `/register` | Public, rate limited |
| POST | `/login` | Public, rate limited |
| POST | `/logout` | Logged in |
| GET | `/current-user` | Logged in |
| POST | `/refresh-token` | Refresh token (cookie or body) |
| POST | `/verify-email/:token` | Public |
| POST | `/resend-email-verification` | Logged in, rate limited |
| POST | `/forgot-password` | Public, rate limited |
| POST | `/reset-password/:token` | Public |
| POST | `/change-password` | Logged in |

### Users: `/users`

| Method | Path | Access |
|---|---|---|
| PATCH | `/me` | Logged in |
| PATCH | `/me/avatar` (multipart field `avatar`) | Logged in |

### Projects: `/projects` (all logged in and verified)

| Method | Path | Access |
|---|---|---|
| GET | `/` | Any |
| POST | `/` | Any |
| GET | `/:projectId` | Member |
| PATCH | `/:projectId` | Admin |
| DELETE | `/:projectId` | Admin |
| GET | `/:projectId/dashboard` | Member |
| GET | `/:projectId/activity` | Member |

### Members: `/projects/:projectId/members`

| Method | Path | Access |
|---|---|---|
| GET | `/` | Member |
| PATCH | `/:userId` | Admin |
| DELETE | `/:userId` | Admin |

### Invitations

| Method | Path | Access |
|---|---|---|
| POST | `/projects/:projectId/invitations` | Admin |
| GET | `/projects/:projectId/invitations` | Admin |
| DELETE | `/projects/:projectId/invitations/:invitationId` | Admin |
| GET | `/invitations/:token` | Public |
| POST | `/invitations/:token/accept` | Logged in, verified |

### Tasks: `/projects/:projectId/tasks`

| Method | Path | Access |
|---|---|---|
| GET | `/` | Member |
| POST | `/` | Admin, Project Admin |
| GET | `/:taskId` | Member |
| PATCH | `/:taskId` | Admin, Project Admin |
| DELETE | `/:taskId` | Admin, Project Admin |
| POST | `/:taskId/attachments` (multipart field `files`) | Admin, Project Admin |
| DELETE | `/:taskId/attachments/:attachmentId` | Admin, Project Admin |
| POST | `/:taskId/subtasks` | Admin, Project Admin |
| PATCH | `/:taskId/subtasks/:subtaskId` | Member (completion only), Admin, Project Admin |
| DELETE | `/:taskId/subtasks/:subtaskId` | Admin, Project Admin |
| GET | `/:taskId/comments` | Member |
| POST | `/:taskId/comments` | Member |
| PATCH | `/:taskId/comments/:commentId` | Author |
| DELETE | `/:taskId/comments/:commentId` | Author, Admin |

### Notes: `/projects/:projectId/notes`

| Method | Path | Access |
|---|---|---|
| GET | `/` | Member |
| POST | `/` | Admin |
| GET | `/:noteId` | Member |
| PATCH | `/:noteId` | Admin |
| DELETE | `/:noteId` | Admin |

## 7. Response Format

Success:

```json
{ "statusCode": 200, "data": {}, "message": "Task fetched successfully", "success": true }
```

Paginated `data`:

```json
{ "items": [], "pagination": { "page": 1, "limit": 20, "total": 57, "totalPages": 3 } }
```

Error:

```json
{ "statusCode": 422, "message": "Validation failed", "errors": [{ "field": "email", "message": "Invalid email" }], "success": false }
```

In development only, errors also include `stack`.

**Status codes used:** `200` OK, `201` created, `400` bad request, `401` not authenticated or invalid token, `403` not allowed or email not verified, `404` not found, `409` conflict, `413` file too large, `422` validation failed, `429` rate limited, `500` server error, `503` health check failing.

## 8. Non-Functional Requirements

- **Validation:** every body, params and query is validated with Zod. Invalid UUIDs in the URL return `422`, not `500`.
- **Security:** Helmet headers, CORS restricted to `CORS_ORIGIN`, rate limiting on register, login, forgot password and resend verification, bcrypt password hashing, hashed tokens in the database, secrets never returned in responses.
- **Cookies:** httpOnly always. In production `secure: true` and `sameSite: "none"` (frontend and API on different domains). In development `secure: false` and `sameSite: "lax"`.
- **Token lifetimes:** access token 15 minutes, refresh token 7 days (configurable through env).
- **Logging:** structured JSON logs with Pino, one log line per request, pretty output in development, `Authorization` and cookie headers redacted.
- **Config:** environment variables validated at startup. The app exits with a clear message if any are missing.
- **Testing:** Vitest and Supertest integration tests covering auth, permissions, invitations, tasks and dashboard caching.
- **Delivery:** Docker Compose runs Postgres, Redis, the API and the worker locally. GitHub Actions runs lint, typecheck, tests and build on every push and pull request. Deployed on Railway as an API service and a worker service, with Railway Postgres and Redis.

## 9. Out of Scope

Google OAuth, real-time updates (Socket.IO), soft deletes, user account deletion, multiple concurrent refresh sessions per user, global (non-project) admin roles, caching anything other than the dashboard.

## 10. Success Criteria

- Every endpoint in section 6 works as described and matches the permission matrix.
- Emails are sent only through the queue and worker, with retries.
- The dashboard is served from cache when warm and invalidated on relevant changes.
- Tests pass locally and in CI.
- `docker compose up` starts the full backend.
- Swagger UI documents every endpoint, and the seeded demo account works on the deployed API.
