# apps/admin-web/AGENTS.md — Admin Web Rules

## Scope

This app is the admin dashboard. It should build to static assets for production.

## Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- Axios
- Redux Toolkit + Redux Persist
- TanStack Query recommended for server state

## Core Screens

```txt
/login
/dashboard
/videos
/videos/new
/videos/:id
/websites
/websites/new
/websites/:id
/websites/:id/domains
/websites/:id/videos
/share-links
/share-links/new
/access-logs
/settings
```

## UX Requirements

- Clean admin-first interface.
- Copy share link button.
- Clear statuses: active, disabled, expired, revoked, processing, ready.
- Loading/error/empty states for every table.
- Confirmation dialog for destructive actions.
- Never show raw token after creation except in the creation success result.
- Warn admin that raw share token cannot be recovered later.

## State Management

Use Redux Toolkit + Redux Persist for:

```txt
auth
sidebar
local UI preferences
```

Use TanStack Query for:

```txt
videos
websites
domains
share links
access logs
```

## Forms

Use React Hook Form + Zod.

Every form must have:

- validation
- disabled submit while submitting
- error feedback
- success toast
- accessible labels

## API Rules

- Use one Axios client.
- Attach JWT access token for admin requests.
- Handle 401 by logout or refresh flow if implemented.
- Do not call public endpoints for admin data.
