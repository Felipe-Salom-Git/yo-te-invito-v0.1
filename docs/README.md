# Ticketera – Yo Te Invito
AI-assisted development project.

This repository is designed to work with **AI development tools such as Cursor and Antigravity**.

The project uses a **strict documentation-driven architecture**, where AI systems must read the documentation before generating code.

---

# AI Bootstrap (Read First)

AI systems must read the following documents **before implementing features**.

Read them **in this exact order**:

1. docs/context/AI_ENTRYPOINT.md  
2. docs/context/PROJECT_CONTEXT.md  
3. docs/rules/PROJECT_RULES.md  
4. docs/rules/AI_WORKFLOW_RULES.md  
5. docs/rules/AI_CODE_REVIEW_RULES.md  
6. docs/rules/ARCHITECTURE_GUARDRAILS.md  
7. docs/architecture/PROJECT_ARCHITECTURE.md  
8. docs/architecture/SYSTEM_OVERVIEW.md  
9. docs/architecture/FOLDER_STRUCTURE.md  

These documents define:

- project goals
- architecture rules
- module boundaries
- AI workflow guidelines
- development constraints

AI tools **must not generate code before reading them.**

---

# Project Documentation Index

The `docs/` directory contains all project documentation.

## Context

Project background and goals.


docs/context/


- AI_ENTRYPOINT.md — index for AI tools (read first)
- PROJECT_CONTEXT.md — product vision and monorepo
- BACKEND_CONTEXT.md — API, Prisma, endpoints
- FRONTEND_CONTEXT.md — Next.js web app
- CONTEXT_PENDIENTES.md — backlog checklist
- FRONTEND_DEMO_NOTES.md — legacy demo mapping (not current persistence)

## Guides (dev & QA)

- [guides/README.md](guides/README.md) — **índice de guías vigentes**
- [guides/DEVELOPER_SCRIPTS_GUIDE.md](guides/DEVELOPER_SCRIPTS_GUIDE.md) — **manual de comandos npm (español)**
- [guides/SMOKE_TESTS_GUIDE.md](guides/SMOKE_TESTS_GUIDE.md) — smokes API + E2E Playwright
- [dev/SCRIPTS.md](dev/SCRIPTS.md) — referencia técnica breve (IA)
- [guides/DEMO_REMOVAL.md](guides/DEMO_REMOVAL.md) — qué se quitó de seeds/demo (pago demo sí)
- [guides/DEVELOPER_USERS.md](guides/DEVELOPER_USERS.md) — cuentas, roles, entorno local
- [guides/GUIA_PRUEBAS_FLUJOS_Y_API.md](guides/GUIA_PRUEBAS_FLUJOS_Y_API.md) — flujos contra API
- [legacy/guides/](legacy/guides/README.md) — **histórico — no usar para implementar**

---

## Rules

Development rules and AI workflow constraints.


docs/rules/


- PROJECT_RULES.md  
- AI_WORKFLOW_RULES.md  
- AI_CODE_REVIEW_RULES.md  
- ARCHITECTURE_GUARDRAILS.md  

---

## Architecture

Core system architecture documentation.


docs/architecture/


- PROJECT_ARCHITECTURE.md  
- SYSTEM_OVERVIEW.md  
- FOLDER_STRUCTURE.md  
- DOMAIN_MODEL.md  

---

## Backend

Backend implementation conventions.


docs/backend/


- CORE_SCHEMA.md  
- BACKEND_CONVENTIONS.md  
- API_CONTRACTS_OVERVIEW.md  
- PRISMA_SCHEMA_GENERATION_GUIDE.md  

---

## Frontend

Frontend implementation conventions.


docs/frontend/


- FRONTEND_CONVENTIONS.md  

---

# AI Development Templates

This repository includes a set of **AI-oriented development templates** designed to guide AI-assisted coding tools such as **Cursor** and **Antigravity**.

These templates define the expected structure for backend and frontend code to maintain:

- consistent architecture
- predictable code structure
- modular code organization
- strict separation of responsibilities

AI tools should **use these templates whenever creating new code or modules.**

---

# Purpose

The templates exist to ensure that AI-generated code:

- follows the **project architecture**
- respects the **Controller → Service → Prisma pattern**
- applies **Zod validation for API endpoints**
- keeps files within the **recommended size limits (~300–400 lines)**
- maintains a **clean and scalable codebase**

These templates are primarily **instructions for AI development tools**, not general developer documentation.

---

# Available Templates

The following templates are available in the repository:

| Template | Purpose |
|--------|--------|
| `ENDPOINT_TEMPLATE.md` | Structure for new API endpoints (routes, controllers, validation) |
| `SERVICE_TEMPLATE.md` | Structure for backend business logic services |
| `REPOSITORY_TEMPLATE.md` | Persistence layer abstraction for Prisma |
| `ERROR_HANDLING_TEMPLATE.md` | Global API error handling strategy |
| `FRONTEND_COMPONENT_TEMPLATE.md` | Standard structure for React components |
| `HOOK_TEMPLATE.md` | Structure for reusable frontend hooks |
| `DOCS_TEMPLATE.md` | Structure for architecture and feature documentation |

---

# When AI Should Use These Templates

AI tools should reference these templates when implementing new functionality.

## Creating a new API endpoint

Use:


ENDPOINT_TEMPLATE.md


---

## Implementing backend business logic

Use:


SERVICE_TEMPLATE.md


---

## Creating database access logic

Use:


REPOSITORY_TEMPLATE.md


---

## Implementing global error handling

Use:


ERROR_HANDLING_TEMPLATE.md


---

## Creating React UI components

Use:


FRONTEND_COMPONENT_TEMPLATE.md


---

## Creating reusable frontend logic

Use:


HOOK_TEMPLATE.md


---

## Writing new project documentation

Use:


DOCS_TEMPLATE.md


---

# Architecture Alignment

All templates follow the architecture defined in:


docs/architecture/


Key principles:

- Layered architecture
- Controllers orchestrate HTTP requests
- Services contain business logic
- Prisma handles database persistence
- Zod validates API input
- Modules remain small and focused

AI-generated code must **always respect these architecture rules**.

---

# AI Development Workflow

When generating new code:

1. Read the architecture documentation in:


docs/architecture/


2. Read the relevant template for the feature being implemented.

3. Generate code following the template structure.

4. Validate the implementation against:


docs/rules/AI_CODE_REVIEW_RULES.md


before finalizing.

---

# Important Rule

AI must **never invent new architecture patterns** inside this project.

All new code must conform to the architecture and development rules defined in the documentation.

If a feature does not fit the current architecture, AI must **propose a design change before implementing it**.