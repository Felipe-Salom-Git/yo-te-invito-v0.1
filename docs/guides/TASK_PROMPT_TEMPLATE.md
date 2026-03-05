# TASK_PROMPT_TEMPLATE.md
## Standard Task Prompt Template
### Ticketera – Yo Te Invito

This document provides a **standard template for creating development tasks** when working with AI assistants such as Cursor or Antigravity.

Using a consistent prompt structure helps the AI:

- understand the task correctly
- produce better execution plans
- avoid architectural violations
- follow project rules

This template is written in **English (for AI tools)** and **Spanish (for developers)**.

---

# English Version (For AI Assistants)

Use this structure when assigning tasks to AI tools.

---

## Task Context

Explain the feature, improvement, or fix.

Describe:

- what needs to be implemented
- what problem it solves
- where it fits in the system

Example:

Implement the ability for event organizers to create invitations for an event.  
Each invitation should be associated with an event and a guest.

---

## Relevant Documentation

Before implementing, the AI must read:

docs/context/PROJECT_CONTEXT.md  
docs/rules/PROJECT_RULES.md  
docs/rules/AI_WORKFLOW_RULES.md  
docs/rules/AI_CODE_REVIEW_RULES.md  
docs/architecture/ARCHITECTURE_GUARDRAILS.md  
docs/architecture/SYSTEM_OVERVIEW.md  

Additional docs depending on the task:

Backend:
docs/backend/BACKEND_CONVENTIONS.md  
docs/backend/API_CONTRACTS_OVERVIEW.md  

Frontend:
docs/frontend/FRONTEND_CONVENTIONS.md  

Domain:
docs/architecture/DOMAIN_MODEL.md  
docs/architecture/CORE_SCHEMA.md  

---

## Expected Behavior

Explain the expected behavior clearly.

Example:

- Organizers can generate invitations for an event
- Invitations are linked to guests
- Invitations store status (pending, accepted, declined)

---

## Technical Constraints

The AI must respect:

- layered architecture
- service-based business logic
- Zod validation in endpoints
- Prisma usage rules
- file size limits (300–400 lines)

---

## Execution Plan Requirement

Before implementing code, the AI must present:

Objective  
Files to Modify  
Implementation Steps  
Risks  
Rule Violations  
Smoke Test Plan  
Documentation Updates  

The AI must wait for approval before coding.

# End of Task Template