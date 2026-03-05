# ARCHITECTURE_GUARDRAILS.md
## Architecture Guardrails
### Ticketera – Yo Te Invito

This document defines the architectural boundaries of the system.

Its purpose is to ensure that **AI assistants and developers do not violate the intended architecture**.

All code changes must respect these guardrails.

If a change requires breaking one of these rules, it must be explicitly justified in the execution plan.

---

# 1. Architectural Philosophy

The system follows a **layered architecture**.

Each layer has a specific responsibility and **must not take responsibilities from other layers**.

Primary goals:

- clear separation of concerns
- maintainable codebase
- predictable data flow
- safe AI-assisted development

---

# 2. System Layers

The system is divided into the following layers.
User
↓
Frontend (Next.js / React)
↓
API Layer (NestJS Controllers)
↓
Application Layer (Services)
↓
Data Access Layer (Prisma)
↓
Database (PostgreSQL)


Each layer must only interact with the **layer directly below it**.

Skipping layers is not allowed.

---

# 3. Frontend Responsibilities

The frontend is responsible for:

- UI rendering
- user interaction
- calling API endpoints
- client-side state management

The frontend must **never**:

- access the database
- implement business rules
- replicate backend validation logic

Business logic belongs in backend services.

---

# 4. API Layer Responsibilities (Controllers)

Controllers handle:

- HTTP request handling
- routing
- input validation (Zod or DTO validation)
- calling services

Controllers must remain **thin**.

Controllers must not contain:

- business logic
- database queries
- complex transformations

All business logic must live in services.

---

# 5. Service Layer Responsibilities

Services contain the **business logic of the application**.

Services are responsible for:

- business rules
- workflows
- orchestration between modules
- calling repositories / Prisma

Services must not contain:

- HTTP logic
- UI logic
- direct frontend concerns

Services are the core of the application domain.

---

# 6. Data Access Layer (Prisma)

Prisma is responsible only for:

- database access
- queries
- persistence

Prisma usage must remain isolated.

Prisma must not contain:

- business logic
- validation logic
- application workflows

---

# 7. Database Responsibilities

The database is responsible for:

- storing persistent data
- enforcing structural integrity
- indexes and relations

Application logic must not be implemented in the database layer.

---

# 8. Module Boundaries

The system is organized into logical modules.

Examples may include:

- events
- invitations
- guests
- tickets
- tracking
- users

Modules should interact through **services**, not through direct data manipulation.

Modules must avoid tight coupling.

---

# 9. Dependency Direction

Dependencies must flow **downward only**.

Allowed dependency direction:

Frontend
→ API Controllers
→ Services
→ Prisma
→ Database


Forbidden patterns:

- Services importing frontend logic
- Controllers importing database queries directly
- Frontend accessing database
- Circular dependencies between modules

---

# 10. File Size Guardrail

Files should not exceed **300–400 lines**.

If a file grows beyond this size, it should be split into:

- components
- hooks
- services
- utilities

Large monolithic files reduce maintainability.

---

# 11. No Hidden Logic

Critical logic must never be hidden in:

- utility functions without documentation
- anonymous functions
- deeply nested callbacks

Important logic must live in clearly named services.

---

# 12. Documentation Alignment

If a new module or architectural change is introduced:

The following documentation must be updated:

- PROJECT_ARCHITECTURE.md
- SYSTEM_OVERVIEW.md
- DOMAIN_MODEL.md (if domain changes)
- CORE_SCHEMA.md (if database changes)

Architecture must always stay synchronized with documentation.

---

# 13. AI Development Guardrails

AI systems working in this repository must:

- read the documentation before coding
- present execution plans before implementation
- avoid architectural violations
- avoid creating duplicate modules
- follow the layered architecture

If uncertain, the AI must ask for clarification instead of making assumptions.

---

# 14. When Architectural Changes Are Allowed

Architectural changes are allowed only when:

- the current architecture blocks necessary features
- scalability requires structural improvements
- the change improves maintainability

All architectural changes must be explicitly approved.

---

# 15. Summary

This document defines the **architectural guardrails** of the system.

These guardrails exist to:

- maintain system stability
- prevent architectural drift
- ensure safe collaboration with AI development tools

All development must respect these boundaries.

---

# End of Architecture Guardrails