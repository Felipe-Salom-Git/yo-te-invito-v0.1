# DOCS_TEMPLATE.md
## Documentation Template (AI-Friendly)
### Ticketera – Yo Te Invito

Use this template when adding a new documentation file to the repository.
Docs must be:
- structured for fast scanning
- explicit about contracts and boundaries
- consistent with existing architecture docs

---

# Title

One sentence describing what this document covers.

---

# 1) Purpose

Explain:
- why this doc exists
- who should read it (AI tools, backend devs, frontend devs)
- what decisions it locks in

---

# 2) Scope

In scope:
- bullet list

Out of scope:
- bullet list

---

# 3) Context

Brief system context:
- related modules
- relevant domain entities
- dependencies (internal/external)

---

# 4) Definitions

Define key terms used in this doc.

Example:
- **Invitation**: a record representing an event invite for a guest.
- **Ticket**: a record representing the guest’s entitlement to attend.

---

# 5) Requirements

Functional requirements:
- [ ] item
- [ ] item

Non-functional requirements:
- performance, security, DX, observability
- [ ] item
- [ ] item

---

# 6) Architecture Alignment

State explicitly how this follows the architecture:
- Controller → Service → Prisma
- Zod validation
- file size limits
- module boundaries

---

# 7) API Contracts (If Applicable)

List endpoints:

- `METHOD /path`
  - Auth: required/optional
  - Request: params/query/body schemas
  - Response: shape + status codes
  - Errors: codes and status

---

# 8) Data Model (If Applicable)

- Entities involved
- Important fields
- Relationships
- Constraints/invariants

If Prisma changes are required, reference:
`docs/backend/PRISMA_SCHEMA_GENERATION_GUIDE.md`

---

# 9) Edge Cases

Document tricky cases explicitly:
- duplicates
- concurrency
- partial failures
- idempotency (if needed)

---

# 10) Testing & Smoke Plan

Testing:
- unit tests
- integration tests

Smoke plan:
- manual steps to verify quickly

---

# 11) Rollout Notes (Optional)

- migrations
- feature flags
- backward compatibility

---

# 12) Change Log

Date + summary of changes.

Example:
- 2026-03-05 — Initial version.

# End of DOCS_TEMPLATE.md