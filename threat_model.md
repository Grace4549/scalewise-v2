# Threat Model

## Project Overview

ScaleWise is a marketplace that connects clients with approved experts for paid advisory sessions. The production stack is a React/Vite frontend and an Express 5 API backed by PostgreSQL via Drizzle, with cookie-based session authentication through `express-session`.

This scan treats `artifacts/api-server/` and `artifacts/scalewise/` as production scope, treats shared packages under `lib/` as production-shared code when they are consumed by those artifacts, and treats `artifacts/mockup-sandbox/` as dev-only unless a production path proves otherwise. Per platform assumptions, deployed traffic is terminated over TLS by the platform. The application is publicly deployed at `https://scalewise.co.ke` with a Replit fallback domain, so public internet attackers can reach all intentionally exposed routes.

## Assets

- **User accounts and sessions** — email addresses, password verifiers, session cookies, and role assignments. Compromise enables account takeover and privilege escalation.
- **Marketplace communications** — booking-linked messages between clients, experts, and admins. These contain private business context and must remain scoped to authorized participants.
- **Booking and payout data** — bookings, notes, meet links, amounts, payout status, and admin payout operations. Exposure or tampering affects both privacy and money flows.
- **Expert application data** — applicant identity, contact information, pricing, biography, skills, and approval status. This includes PII and business-sensitive profile details.
- **Administrative analytics and commission data** — commission rates, breakdowns, pending payouts, and cross-platform booking visibility. These are explicitly restricted to expert/admin surfaces.
- **Application secrets** — `DATABASE_URL`, `SESSION_SECRET`, and any future third-party secrets. Secret compromise would let an attacker forge sessions or directly access backend data.
- **Recovery tokens and operational logs** — password reset tokens and the logs or log sinks that may contain sensitive workflow data. Exposure enables direct account takeover or disclosure of privileged recovery artifacts.

## Trust Boundaries

- **Browser to API** — all client requests to `/api/*` cross from an untrusted browser into the trusted backend. Every authenticated action must be validated server-side.
- **API to PostgreSQL** — the API has direct read/write access to core marketplace data. Injection or broken authorization at the API layer can expose the full dataset.
- **Unauthenticated to authenticated** — public browsing, reviews, login, registration, and expert applications are reachable without a session; bookings, inboxes, and dashboards are not.
- **Authenticated to role-restricted** — expert and admin capabilities sit on top of ordinary authenticated access and must be enforced server-side, not in frontend routing alone.
- **Authenticated browser state to new authenticated browser state** — SPA-side caches, query state, and in-memory data must be cleared or namespaced when identity changes so data from one signed-in account is not shown to the next account in the same tab.
- **Production to dev-only** — `artifacts/mockup-sandbox/` is assumed non-production and should be ignored unless a production entry point or build path proves reachability.

## Scan Anchors

- **Production entry points:** `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/*.ts`, `artifacts/scalewise/src/App.tsx`.
- **Highest-risk code areas:** session/auth logic in `artifacts/api-server/src/lib/auth.ts`, API middleware in `artifacts/api-server/src/app.ts`, password-reset handlers and expert-account registration in `artifacts/api-server/src/routes/auth.ts`, expert application and public profile handlers in `artifacts/api-server/src/routes/experts.ts`, booking creation and lifecycle transitions in `artifacts/api-server/src/routes/bookings.ts`, and route handlers for `messages`, `reviews`, and `admin`.
- **Public surfaces:** `/api/auth/login`, `/api/auth/register`, `/api/experts*`, `/api/reviews*`, `/api/healthz`, and the public frontend pages.
- **Public write/abuse-sensitive surfaces:** `/api/auth/forgot-password`, `/api/experts/apply`, `POST /api/reviews`, and public search/listing endpoints under `/api/experts*`.
- **Authenticated surfaces:** `/api/auth/me`, `/api/bookings*`, `/api/messages*`, `/api/reviews/verified`, `/api/expert/*`, `/api/admin/*`.
- **Intentional public behavior:** `POST /api/reviews` is a product-defined unauthenticated “public review” surface; future scans should not treat lack of auth on that route alone as a vulnerability unless another control boundary is bypassed. Expert profiles intentionally render both public reviews and verified reviews, so the mere fact that a public review can reference an expert profile should not be re-proposed without stronger evidence of a separate abuse-control failure.
- **Usually ignore as dev-only:** `artifacts/mockup-sandbox/`, generated `dist/` outputs, and workspace tooling unless they are executed in production paths.

## Threat Categories

### Spoofing

ScaleWise relies on server-side sessions stored in cookies. The application must use a high-entropy production session secret, protect session cookies from cross-site abuse, and ensure that only valid authenticated sessions can reach booking, messaging, expert, and admin routes.

Password-based login is also in scope. Password verifiers must resist offline cracking if the user table is exposed, and login endpoints must not allow trivial credential-stuffing or brute-force attacks.

Account recovery is part of the same identity boundary. Password reset tokens must be high-entropy, short-lived bearer secrets, must not be logged or exposed through operational tooling, and must not be recoverable from low-privilege observability paths. A completed password reset MUST also revoke already-issued authenticated sessions for that account so recovery actually ejects an attacker who already has a valid session cookie.

Expert onboarding sits on the same boundary. Approval of an expert application MUST NOT by itself grant identity proof for the eventual expert account; the platform must verify that the registrant controls the approved email address or other approved identity token before linking the account to the expert profile. If expert onboarding reuses an already-existing user account for the approved email, it MUST also prove control of that existing account before role-upgrading or binding the expert profile to it.

### Tampering

Clients, experts, and admins can all change marketplace state: account creation, expert applications, booking creation, booking status, payout state, profile edits, and messages. The backend must calculate sensitive fields server-side, validate all state transitions, and ensure users can only modify resources they own or are explicitly authorized to manage.

Booking creation is especially sensitive because it crosses pricing, scheduling, and communications boundaries at once. The backend must reject unsupported session types, derive or validate allowed durations server-side, and avoid trusting client-controlled booking terms that can alter what experts and admins see or act on.

### Information Disclosure

The platform stores personal data, private messages, meet links, booking notes, and admin-only financial information. API responses must be scoped to the requesting user’s role and relationship to the resource. Public endpoints must not leak internal identifiers, hidden business data, or admin/expert-only financial details beyond what the product intentionally publishes.

Frontend cache isolation is also part of this category: dashboards, inboxes, booking objects, and admin views must not be reusable across account switches inside the same SPA tab.

### Denial of Service

Public routes such as login, registration, expert application, search, and public review submission are reachable without authentication. The application must prevent unauthenticated users from using these endpoints for brute-force attempts, spam, or resource exhaustion. Expensive operations and external calls must remain bounded.

### Elevation of Privilege

ScaleWise has three meaningful privilege tiers: client, expert, and admin. The backend must enforce role checks and object ownership on every sensitive route. Any flaw that lets a client act as an expert or admin, read another user’s messages or bookings, or forge an authenticated/admin session is a high-priority production risk.
