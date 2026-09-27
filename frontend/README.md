# Plane frontend

The web app for Plane, built with Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form and Zod. It talks to the live Plane API at `https://api.plane.yashlalwani.info/api/v1`.

Production URL: **https://plane.yashlalwani.info**

## What’s in it

| Route | What it does |
|---|---|
| `/` and `/about` | Landing page, and a reviewer guide with the demo account |
| `/login`, `/register`, `/forgot-password` | Account forms. `?returnTo=` brings users back after logging in. |
| `/verify-email/[token]`, `/reset-password/[token]`, `/invitations/[token]` | The pages that email links open |
| `/projects` | Your projects, and creating new ones |
| `/projects/[projectId]?tab=overview\|tasks\|notes\|members\|activity` | A project: dashboard, tasks (filters, sort, pagination, list and board), task details (subtasks, attachments, comments), notes, members and invitations, activity feed |
| `/settings` | Profile, avatar and password |

**How it works:**
- **Server data:** loaded and cached with TanStack Query (`lib/queries.ts`).
- **Requests:** go through `lib/api.ts`, which:
  - sends the auth cookies on every request (`credentials: "include"`)
  - refreshes an expired session once, then retries
  - turns API errors into readable messages
- **Signed-in pages:** send users back to login when their session ends, and ask unverified users to verify their email first.
- **Role-based UI:** buttons are shown by project role (Admin, Project Admin, Member). The API enforces the same rules.
- **Tokens:** never stored in the browser. Sessions live only in the API’s httpOnly cookies.

## Deploying on Vercel

1. Import the GitHub repository into Vercel.
2. Set the **Root Directory** to `frontend`. Vercel detects Next.js and uses `npm install` and `npm run build`.
3. Add the custom domain `plane.yashlalwani.info`.
4. Optional: set `NEXT_PUBLIC_API_URL` to use a different API. It defaults to `https://api.plane.yashlalwani.info/api/v1`.

The backend (Railway) must have:
- `CORS_ORIGIN=https://plane.yashlalwani.info`, the only origin allowed to call the API from a browser
- `CLIENT_URL=https://plane.yashlalwani.info`, which email links point to
- `COOKIE_DOMAIN=.plane.yashlalwani.info`, so the login cookies work for both subdomains

The API only accepts browser requests from `https://plane.yashlalwani.info`. The app therefore works on that domain only, not on `localhost` or Vercel preview URLs.

## Scripts

```bash
npm install
npm run build       # production build
npm run lint
npm run typecheck
```

## Demo account

`demo@plane.dev` / `DemoPass123!`: Admin of “Website Relaunch”, Member of “Mobile App Beta”.
