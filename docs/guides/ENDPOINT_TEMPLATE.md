# ENDPOINT_TEMPLATE.md
## API Endpoint Template (Controller + Route)
### Ticketera – Yo Te Invito

Use this template to implement a new HTTP endpoint following the project architecture:

**Route → Controller → Service → (Repository) → Prisma → DB**

Endpoints must:
- validate input with **Zod**
- keep controllers thin (request/response orchestration only)
- delegate business logic to services
- never call Prisma directly from controllers (unless your project explicitly allows it; prefer Service/Repository)

---

# 1) When to Use

Create a new endpoint when you need to:
- add a new feature exposed through HTTP
- create/read/update/delete domain entities
- introduce actions that change domain state (e.g., “send invitation”, “accept ticket”)

---

# 2) File Placement & Naming

Use consistent naming and grouping.

Recommended structure (adjust to your repo conventions):
- `src/api/routes/<module>.routes.ts`
- `src/api/controllers/<module>.controller.ts`
- `src/api/validators/<module>.schemas.ts`

Naming rules:
- routes: `<module>.routes.ts`
- controller: `<module>.controller.ts`
- validators: `<module>.schemas.ts`
- exported handlers: `createX`, `getX`, `listX`, `updateX`, `deleteX`, or `actionX`

---

# 3) Endpoint Contract

Define the contract explicitly:
- HTTP method + path
- auth requirement
- request body / params / query schema
- response schema (shape and status codes)
- error cases

Example contract:

- `POST /api/events/:eventId/invitations`
- Auth: required
- Params: `{ eventId: string }`
- Body: `{ guestId: string, channel: "email" | "whatsapp" }`
- Response: `201 { invitation: ... }`

---

# 4) Zod Schemas (Validators)

Create schemas for:
- `params`
- `query`
- `body`
- `response` (recommended)

Use a single source of truth for types:
- derive TS types from Zod using `z.infer<>`

---

# 5) Controller Responsibilities

Controller must:
- parse and validate inputs
- call the service with a clean DTO
- map service result to HTTP response
- translate thrown errors into correct HTTP codes (via centralized error handling)

Controller must NOT:
- implement business rules
- do cross-entity orchestration logic
- access Prisma directly
- contain large blocks of logic (>100 lines is a smell)

---

# 6) Route Registration

Route must:
- attach middleware (auth, rate limit, etc.)
- call controller handler
- keep wiring minimal

---

# 7) Implementation Skeleton

> Use `~~~` fences inside this markdown so the file is easy to copy without breaking outer fences.

## 7.1 Validator Skeleton
~~~ts
// src/api/validators/<module>.schemas.ts
import { z } from "zod";

export const CreateInvitationParamsSchema = z.object({
  eventId: z.string().min(1),
});

export const CreateInvitationBodySchema = z.object({
  guestId: z.string().min(1),
  channel: z.enum(["email", "whatsapp"]),
});

export const CreateInvitationRequestSchema = z.object({
  params: CreateInvitationParamsSchema,
  body: CreateInvitationBodySchema,
});

export type CreateInvitationParams = z.infer<typeof CreateInvitationParamsSchema>;
export type CreateInvitationBody = z.infer<typeof CreateInvitationBodySchema>;
~~~

## 7.2 Controller Skeleton
~~~ts
// src/api/controllers/<module>.controller.ts
import type { Request, Response, NextFunction } from "express";
import { CreateInvitationRequestSchema } from "../validators/<module>.schemas";
import { invitationService } from "../../services/invitation.service";

export async function createInvitation(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = CreateInvitationRequestSchema.parse({
      params: req.params,
      body: req.body,
    });

    const result = await invitationService.createInvitation({
      eventId: parsed.params.eventId,
      guestId: parsed.body.guestId,
      channel: parsed.body.channel,
      actorUserId: req.user?.id, // adjust to your auth typing
    });

    return res.status(201).json({ invitation: result.invitation });
  } catch (err) {
    return next(err);
  }
}
~~~

## 7.3 Routes Skeleton
~~~ts
// src/api/routes/<module>.routes.ts
import { Router } from "express";
import { createInvitation } from "../controllers/<module>.controller";
import { requireAuth } from "../middleware/requireAuth"; // adjust

export const invitationRoutes = Router();

invitationRoutes.post(
  "/events/:eventId/invitations",
  requireAuth,
  createInvitation
);
~~~

---

# 8) Status Codes & Errors

Prefer:
- `200` for read/update success
- `201` for create success
- `204` for delete success with no body
- `400` validation errors
- `401` unauthenticated
- `403` unauthorized
- `404` not found
- `409` conflict
- `422` domain rule violation (optional; align with your global policy)

All errors must go through the centralized error handling policy.

---

# 9) Smoke Test Checklist

- [ ] Route is registered and reachable
- [ ] Zod validation rejects invalid inputs
- [ ] Auth checks are applied correctly
- [ ] Controller does not bypass service layer
- [ ] Success response matches contract
- [ ] Error responses match policy

---

# 10) AI Self-Review (Before PR)

- [ ] No Prisma usage in controller
- [ ] Business logic is in service
- [ ] File size under ~300–400 lines
- [ ] No duplicate endpoints exist
- [ ] Documentation updated if contract changed

# End of ENDPOINT_TEMPLATE.md