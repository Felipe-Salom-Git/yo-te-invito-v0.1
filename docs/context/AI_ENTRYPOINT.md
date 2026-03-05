# AI_ENTRYPOINT.md
AI Development Entry Point

This file provides a **compressed overview of the entire project** so that AI development tools (Cursor, Antigravity, etc.) can quickly understand how the system works.

AI tools should read this file **before generating or modifying code**.

This document summarizes:

- system architecture
- module structure
- development rules
- backend and frontend conventions
- AI development workflow

For detailed documentation, refer to the files listed below.

---

# 1 Project Overview

**Ticketera – Yo Te Invito** is a platform for managing invitations and event participation.

The system allows event organizers to:

- create events
- invite guests
- track guest participation
- manage event invitations
- control guest access to events

The system is built with **AI-assisted development** and relies heavily on **documentation-driven architecture**.

---

# 2 Tech Stack

## Monorepo

- Nx + pnpm workspaces
- apps/web, apps/scanner, apps/api
- packages/shared (types, Zod schemas, enums)

## Backend

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod (request validation)

## Frontend

- Next.js (App Router)
- React
- TypeScript
- TailwindCSS
- TanStack Query
- NextAuth (auth baseline)

## Infrastructure

- Docker (Postgres)
- Environment-based configuration

---

# 3 High-Level System Flow

System request flow:

User  
↓  
Frontend (Next.js / React)  
↓  
API Layer (NestJS Controllers)  
↓  
Service Layer (Business Logic)  
↓  
Prisma ORM  
↓  
PostgreSQL Database  

Controllers orchestrate requests.  
Services contain business logic.  
Prisma handles database access.

---

# 4 Core Architecture Rules

The project follows a **layered architecture**.

Structure:


Controller → Service → Prisma → Database


Responsibilities:

### Controllers

Responsible for:

- handling HTTP requests
- validating inputs (Zod)
- calling services
- formatting responses

Controllers must **NOT contain business logic**.

---

### Services

Responsible for:

- business rules
- domain logic
- orchestrating database operations
- enforcing domain constraints

Services must **NOT handle HTTP concerns**.

---

### Prisma Layer

Responsible for:

- database access
- queries
- transactions
- persistence

No business rules should exist in the persistence layer.

---

# 5 Validation Strategy

All API inputs must be validated using **Zod schemas**.

Validation occurs in the **controller layer** before calling services.

Example:

- request body validation
- query validation
- route params validation

Services assume validated input.

---

# 6 File Size Constraints

To maintain AI readability and modularity:

Recommended limits:


~300–400 lines per file


If a file grows beyond this size, it should be split into smaller modules.

---

# 7 Project Folder Structure

The project documentation describes the full folder structure.

Key folders:


docs/
context/
rules/
architecture/
backend/
frontend/


Backend (apps/api) structure:

src/
  main.ts
  app.module.ts
  health/
  public/
  scanner/
  ... (domain modules)
prisma/
  schema.prisma


Frontend (apps/web, apps/scanner) structure:

app/         (App Router)
  page.tsx
  layout.tsx
components/
lib/
  api/
  query/


---

# 8 Documentation System

This project relies heavily on documentation to guide AI development.

AI tools must read documentation before generating code.

Primary documents:


docs/context/PROJECT_CONTEXT.md
docs/rules/PROJECT_RULES.md
docs/rules/AI_WORKFLOW_RULES.md
docs/rules/AI_CODE_REVIEW_RULES.md
docs/rules/ARCHITECTURE_GUARDRAILS.md

docs/architecture/PROJECT_ARCHITECTURE.md
docs/architecture/SYSTEM_OVERVIEW.md
docs/architecture/FOLDER_STRUCTURE.md


---

# 9 AI Development Templates

The project includes templates to enforce consistent code structure.

Templates:


ENDPOINT_TEMPLATE.md
SERVICE_TEMPLATE.md
REPOSITORY_TEMPLATE.md
ERROR_HANDLING_TEMPLATE.md
FRONTEND_COMPONENT_TEMPLATE.md
HOOK_TEMPLATE.md
DOCS_TEMPLATE.md


AI tools must follow these templates when generating new modules.

---

# 10 AI Development Workflow

When implementing new features:

1. Read the architecture documentation.
2. Identify the module involved.
3. Select the appropriate development template.
4. Implement the feature following the layered architecture.
5. Review the code against the AI code review rules.

Documentation must always be considered the **source of truth**.

---

# 11 Architectural Boundaries

AI must respect the following boundaries:

Controllers:
- HTTP orchestration only

Services:
- business logic only

Prisma:
- persistence only

Validation:
- Zod schemas in controllers

No layer should break these responsibilities.

---

# 12 Important AI Rules

AI must never:

- invent new architectural patterns
- bypass the service layer
- add business logic to controllers
- mix database access with controllers
- create overly large files

If a feature does not fit the architecture, AI must propose a design change before implementing it.

---

# End of AI_ENTRYPOINT.md