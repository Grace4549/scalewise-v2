---
name: Orval naming collision fix
description: How to avoid TS2308 export conflicts when naming OpenAPI schema components
---

## The rule

Never name an OpenAPI schema component with the same string that Orval would auto-generate from an operationId for the request body type.

Orval auto-names request body types as `<PascalCase(operationId)>Body`. For example, operationId `requestReschedule` → Orval generates a TypeScript interface named `RequestRescheduleBody` in `types/requestRescheduleBody.ts` AND a Zod schema named `RequestRescheduleBody` in `api.ts`. When both are re-exported from `lib/api-zod/src/index.ts` via `export *`, TypeScript 5.x raises TS2308 (ambiguous export).

**Why:** TypeScript 5.x stricter `export *` conflict detection treats same-named value and type exports from different modules as ambiguous even when one is a const and the other is an interface.

**How to apply:** When adding a new request body schema to openapi.yaml that corresponds to an endpoint, use a name that does NOT match `<PascalCase(operationId)>Body`. Prefer `Input` or `Payload` suffix instead of `Body`. Examples:
- operationId `requestReschedule` → schema name `RescheduleRequestInput` ✓ (not `RequestRescheduleBody` ✗)
- operationId `expertCancelBooking` → schema name `ExpertCancelInput` ✓ (not `ExpertCancelBody` ✗)
