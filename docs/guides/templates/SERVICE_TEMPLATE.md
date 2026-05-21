# SERVICE_TEMPLATE.md
## Service Layer Template (Business Logic)
### Ticketera – Yo Te Invito

Use this template to implement a service that contains **business rules** and **application orchestration**.

Services must:
- enforce domain invariants
- coordinate multiple repositories/Prisma calls
- define transaction boundaries when needed
- be testable (pure-ish functions + dependency injection where practical)

Services must NOT:
- parse HTTP requests directly
- return Express `res` objects
- contain UI concerns
- silently swallow errors

---

# 1) When to Use

Create or update a service when:
- logic is shared across endpoints
- you have domain rules (status transitions, limits, permissions)
- you need transactional operations
- you need to orchestrate multiple entities

---

# 2) File Placement & Naming

Recommended:
- `src/services/<module>.service.ts`

Naming:
- exported singleton: `<module>Service` or `<module>ServiceFactory`
- methods: verbs (`createX`, `issueX`, `acceptX`, `cancelX`)

---

# 3) Service Responsibilities

A service method should:
- accept a **typed input DTO**
- validate business constraints (NOT Zod; that is controller-level)
- query persistence layer via repository or Prisma client
- return a typed result DTO
- throw typed/app errors for exceptional states

---

# 4) Inputs/Outputs (DTOs)

Prefer explicit DTOs:
- `CreateInvitationInput`
- `CreateInvitationResult`

Never expose Prisma models directly to controllers unless explicitly allowed by conventions.

---

# 5) Transactions

If multiple writes must succeed together:
- wrap them in a single transaction (Prisma `$transaction` or your equivalent)
- keep transaction scope minimal

---

# 6) Implementation Skeleton

~~~ts
// src/services/<module>.service.ts
import { prisma } from "../db/prisma"; // adjust import
import { AppError } from "../errors/AppError"; // adjust import
import { invitationRepository } from "../repositories/invitation.repository"; // optional

export type CreateInvitationInput = {
  eventId: string;
  guestId: string;
  channel: "email" | "whatsapp";
  actorUserId?: string;
};

export type CreateInvitationResult = {
  invitation: {
    id: string;
    eventId: string;
    guestId: string;
    status: "pending" | "accepted" | "declined";
    channel: "email" | "whatsapp";
    createdAt: string;
  };
};

async function createInvitation(input: CreateInvitationInput): Promise<CreateInvitationResult> {
  // 1) Authorization / permissions (if not handled elsewhere)
  if (!input.actorUserId) {
    throw new AppError("UNAUTHENTICATED", "Authentication required", 401);
  }

  // 2) Load required state
  const event = await prisma.event.findUnique({ where: { id: input.eventId } });
  if (!event) throw new AppError("NOT_FOUND", "Event not found", 404);

  // 3) Domain rules
  if (event.status !== "published") {
    throw new AppError("DOMAIN_RULE", "Invitations can only be created for published events", 422);
  }

  // 4) Persistence (Repository preferred if you use it)
  const invitation = await prisma.invitation.create({
    data: {
      eventId: input.eventId,
      guestId: input.guestId,
      channel: input.channel,
      status: "pending",
      createdByUserId: input.actorUserId,
    },
  });

  // 5) Return DTO
  return {
    invitation: {
      id: invitation.id,
      eventId: invitation.eventId,
      guestId: invitation.guestId,
      status: invitation.status,
      channel: invitation.channel,
      createdAt: invitation.createdAt.toISOString(),
    },
  };
}

export const invitationService = {
  createInvitation,
};
~~~

---

# 7) Error Rules

Service should throw:
- `AppError` (or your standard error class) for expected domain failures
- native errors for truly unexpected failures (will become 500)

Do not return `{ ok: false }` unless your project standard requires it.

---

# 8) Testing Notes

- test domain rules and transitions
- mock repository/prisma where possible
- add at least:
  - one “happy path”
  - one “not found”
  - one “domain rule violation”

---

# 9) AI Self-Review

- [ ] Service contains business logic (not controller)
- [ ] Transaction used where needed
- [ ] Throws typed errors for expected failures
- [ ] No duplication with existing service methods
- [ ] Under ~300–400 lines per file

# End of SERVICE_TEMPLATE.md