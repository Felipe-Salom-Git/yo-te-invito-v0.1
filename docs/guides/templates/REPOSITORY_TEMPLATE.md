# REPOSITORY_TEMPLATE.md
## Repository Template (Prisma Access Wrapper)
### Ticketera – Yo Te Invito

Use repositories only if your project wants a dedicated persistence abstraction between Services and Prisma.

**Preferred flow:**
Controller → Service → Repository → Prisma

Repository must:
- encapsulate Prisma queries
- return plain objects (or Prisma results if your conventions allow)
- contain no business rules

Repository must NOT:
- enforce domain rules (belongs in Service)
- depend on Express or HTTP types
- perform authorization checks

---

# 1) When to Use

Use a repository when:
- queries are reused across services
- you want a single place for complex Prisma queries
- you want to isolate Prisma from service logic for testing

If your architecture prefers Service → Prisma directly, keep repository usage minimal.

---

# 2) File Placement & Naming

Recommended:
- `src/repositories/<module>.repository.ts`

Naming:
- exported singleton: `<module>Repository`
- functions: `findById`, `findMany`, `create`, `update`, `delete`, `exists`, etc.

---

# 3) Query Principles

- select only required fields
- keep queries readable
- avoid N+1 patterns
- keep filters explicit
- never return huge graphs unless required

---

# 4) Implementation Skeleton

~~~ts
// src/repositories/<module>.repository.ts
import { prisma } from "../db/prisma"; // adjust

export type InvitationRow = {
  id: string;
  eventId: string;
  guestId: string;
  status: "pending" | "accepted" | "declined";
  channel: "email" | "whatsapp";
  createdAt: Date;
};

async function findById(id: string): Promise<InvitationRow | null> {
  return prisma.invitation.findUnique({
    where: { id },
    select: {
      id: true,
      eventId: true,
      guestId: true,
      status: true,
      channel: true,
      createdAt: true,
    },
  }) as unknown as InvitationRow | null;
}

async function create(data: {
  eventId: string;
  guestId: string;
  channel: "email" | "whatsapp";
  status: "pending" | "accepted" | "declined";
  createdByUserId: string;
}): Promise<InvitationRow> {
  return prisma.invitation.create({
    data,
    select: {
      id: true,
      eventId: true,
      guestId: true,
      status: true,
      channel: true,
      createdAt: true,
    },
  }) as unknown as InvitationRow;
}

async function updateStatus(id: string, status: InvitationRow["status"]): Promise<InvitationRow> {
  return prisma.invitation.update({
    where: { id },
    data: { status },
    select: {
      id: true,
      eventId: true,
      guestId: true,
      status: true,
      channel: true,
      createdAt: true,
    },
  }) as unknown as InvitationRow;
}

export const invitationRepository = {
  findById,
  create,
  updateStatus,
};
~~~

---

# 5) Repository Checklist

- [ ] No business rules
- [ ] No HTTP types
- [ ] Minimal fields selected
- [ ] Consistent return shape
- [ ] File size under ~300–400 lines

# End of REPOSITORY_TEMPLATE.md