# GrowPia

A premium expert marketplace connecting business owners with verified industry experts for paid consultancy and coaching sessions.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/scalewise run dev` — run the frontend (port 18082)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `SESSION_SECRET` — Secret for express-session

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + TanStack Query + shadcn/ui
- API: Express 5 + express-session (cookie-based auth)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- DB schema: `lib/db/src/schema/` — users, experts, bookings, reviews, messages
- API contract: `lib/api-spec/openapi.yaml`
- Generated hooks: `lib/api-client-react/src/generated/`
- Generated Zod schemas: `lib/api-zod/src/generated/`
- API routes: `artifacts/api-server/src/routes/` — auth, experts, bookings, reviews, messages, admin
- Frontend pages: `artifacts/scalewise/src/pages/`
- Auth helper: `artifacts/api-server/src/lib/auth.ts`

## Architecture decisions

- Cookie-based sessions (express-session) rather than JWT — simpler for this use case, no token refresh complexity.
- Commission rates (20% Discovery/Consultancy, 15% Growth) are ONLY exposed on expert dashboard and admin routes — never returned to clients.
- Expert applications and expert profiles share a single `experts` table. The `status` field gates public visibility.
- Reviews are public (no auth required to submit or read). Admin can delete.
- Google Meet links are auto-generated on booking creation (random `meet.google.com` URL).

## Product

**Two user types:** Clients (business owners) and Experts (verified practitioners).

**13 industries:** Agriculture & Agribusiness, Beauty & Salons, Construction & Contracting, Education & Training, E-commerce & Retail, Financial Services, Healthcare & Clinics, Hospitality & Tourism, Logistics & Transport, Manufacturing & SMEs, Real Estate, Restaurants & Food Business, Tech Startups.

**3 session types:**
- Business Discovery — open conversation, 20% commission (admin/expert visible only)
- Consultancy — focused advice, 20% commission (admin/expert visible only)
- Growth Strategy — 3-month or 6-month plan, 15% commission (admin/expert visible only)

**Pages:** Home, Browse Experts, Expert Profile, Login, Register, Apply as Expert, Client Dashboard, Expert Dashboard, Admin Dashboard, Messages, About, Contact, FAQ, Privacy Policy, Terms of Service.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`.
- Commission rates must NEVER appear on any client-facing page or API response sent to clients.
- The `experts` table doubles as both the application queue and approved expert profiles.
- Express-session `sameSite: "none"` is set in production for cross-origin cookie support.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
