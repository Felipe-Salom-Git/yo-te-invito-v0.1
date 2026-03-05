# PROMPT_HEADER.md
## Standard Prompt Header for AI Development
### Ticketera – Yo Te Invito

This header must be used when interacting with AI assistants such as **Cursor or Antigravity**.

Its purpose is to ensure the AI loads the project context and follows the development rules before generating code.

---

# AI Development Instructions

Before implementing any change in this repository you must read the following documentation:

docs/context/PROJECT_CONTEXT.md

docs/rules/PROJECT_RULES.md  
docs/rules/AI_WORKFLOW_RULES.md  
docs/rules/AI_CODE_REVIEW_RULES.md  

docs/architecture/ARCHITECTURE_GUARDRAILS.md  
docs/architecture/PROJECT_ARCHITECTURE.md  
docs/architecture/SYSTEM_OVERVIEW.md  
docs/architecture/FOLDER_STRUCTURE.md  

If the task involves domain logic or database structures also read:

docs/architecture/DOMAIN_MODEL.md  
docs/architecture/CORE_SCHEMA.md  

If the task involves backend logic read:

docs/backend/BACKEND_CONVENTIONS.md  
docs/backend/API_CONTRACTS_OVERVIEW.md  
docs/backend/PRISMA_SCHEMA_GENERATION_GUIDE.md  

If the task involves frontend logic read:

docs/frontend/FRONTEND_CONVENTIONS.md  

---

# Required Workflow

You must follow this workflow:

1. Load and understand the documentation.
2. Verify the task does not duplicate existing modules.
3. Present an **Execution Plan** before writing code.
4. Wait for approval before implementing.
5. Follow the layered architecture strictly.
6. Keep changes minimal and localized.
7. Respect all rules in PROJECT_RULES.md.
8. Perform the self-review defined in AI_CODE_REVIEW_RULES.md.

---

# Execution Plan Format

Before coding you must present:

Objective  
Explain the goal of the task.

Files to Modify  
List files that will be created or modified.

Implementation Steps  
Step-by-step explanation.

Risks  
Potential compatibility issues.

Rule Violations  
Indicate if the task requires:
- installing dependencies
- modifying Prisma
- breaking architecture
- creating files larger than 400 lines

Smoke Test Plan  
Explain how the change will be verified.

Documentation Updates  
List documentation files that will need updates.

---

# Development Constraints

The AI must respect the following architectural rules:

Frontend  
UI rendering and API communication only.

API Controllers  
Handle requests and validation.

Services  
Contain business logic.

Prisma  
Database access only.

Database  
Persistence layer.

No layer should bypass another layer.

---

# Anti-Duplication Rule

Before creating any new component, service, or module:

1. Search the repository.
2. Search the documentation.
3. Confirm no equivalent module exists.

Prefer extending existing modules instead of creating new ones.

---

# AI Self-Review Requirement

Before presenting the final answer perform the review defined in:

docs/rules/AI_CODE_REVIEW_RULES.md

Provide a short checklist summary confirming compliance.

---

# End of Prompt Header