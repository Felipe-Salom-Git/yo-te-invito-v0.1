# AI_CODE_REVIEW_RULES.md
## AI Self-Review Checklist
### Ticketera – Yo Te Invito

This document defines the mandatory self-review process that AI assistants (Cursor, Antigravity, or similar) must perform **before** proposing code changes, generating patches, or opening PRs.

It complements:
- `docs/rules/PROJECT_RULES.md`
- `docs/rules/AI_WORKFLOW_RULES.md`
- `docs/architecture/ARCHITECTURE_GUARDRAILS.md`

If any item cannot be satisfied, the AI must:
1) explicitly report it, and  
2) propose a safe alternative or ask for clarification.

---

# 1. Pre-Flight Checks (Before Writing Code)

## 1.1 Read Required Docs
Confirm that the following have been read:

- docs/context/PROJECT_CONTEXT.md
- docs/rules/PROJECT_RULES.md
- docs/rules/AI_WORKFLOW_RULES.md
- docs/architecture/ARCHITECTURE_GUARDRAILS.md
- docs/architecture/SYSTEM_OVERVIEW.md
- docs/architecture/FOLDER_STRUCTURE.md

If any doc is missing or inconsistent, stop and report it.

---

## 1.2 Confirm Scope
- Is the objective clearly understood?
- Are acceptance criteria / “done” requirements clear?
- Is the scope minimal (no unrelated changes)?

If scope is unclear, ask questions before proceeding.

---

## 1.3 Search Before Creating
Before creating any new file/module/component:
- Search the repository for similar implementations.
- Search `docs/` for existing modules or patterns.

Prefer reuse/extension over creation.

---

# 2. Architecture Review (Guardrails)

## 2.1 Layer Boundaries
Verify the change respects the layered architecture:

Frontend (UI only)  
→ API Controllers (routing + validation)  
→ Services (business logic)  
→ Prisma (data access)  
→ Database  

Forbidden:
- Controllers containing business logic
- Frontend implementing business rules
- Services doing HTTP concerns
- Skipping layers
- Circular dependencies

---

## 2.2 Module Boundaries
- Does the change belong to the correct module?
- Is cross-module coupling minimized?
- If a module needs to interact with another, is it via service orchestration (not direct data manipulation)?

---

## 2.3 File Size Rule
- Any file approaching 300–400 lines must be split.
- Separate UI from logic (hooks/services/utils).

If exceeding 400 lines is unavoidable, request approval in the execution plan.

---

# 3. API & Validation Review

## 3.1 Zod Validation in Endpoints
For every touched endpoint:
- Validate `params`, `query`, and `body` using Zod.
- Ensure errors are consistent and typed.
- Avoid duplicating backend validation logic in frontend.

---

## 3.2 No Magic Strings
- Ensure status values and repeated constants use enums/constants/types.
- Avoid repeating raw strings across the codebase.

---

# 4. Data & Database Review

## 4.1 Prisma Safety
- Prisma changes only if strictly required.
- If Prisma schema/migrations change:
  - explain why
  - describe migration impact
  - analyze backward compatibility

---

## 4.2 Query Efficiency
Check for:
- N+1 patterns
- missing pagination for lists
- selecting unnecessary fields

Prefer:
- pagination defaults
- selecting only needed columns/relations

---

# 5. Frontend Review

## 5.1 UI Purity
- UI components should focus on rendering and user interaction.
- Complex logic must live in hooks/services.

---

## 5.2 Rendering Performance
- Avoid unnecessary re-renders.
- Do not add memoization by default; only if justified.
- Avoid heavy computations in render.

---

# 6. Error Handling & Observability Review

## 6.1 Consistent Error Handling
- No silent failures.
- No unhandled promise rejections.
- No debug `console.log` in production code (unless repo convention allows it).

Ensure errors:
- provide meaningful context
- are handled at the correct layer

---

# 7. Testing & “Done” Review

## 7.1 Smoke Test Plan
Before finalizing, provide a minimal smoke test plan describing:
- how to run
- what flows to verify
- expected outcome

---

## 7.2 Definition of Done Alignment
Confirm the change meets DoD from `PROJECT_RULES.md`:
- builds successfully
- core flow not broken
- validation is present
- docs updated where necessary

---

# 8. Documentation Review

## 8.1 Documentation Updates Required
If you create or modify:
- a module
- a component
- an integration
- a contract

Then you must update/create relevant docs in `docs/`.

Documentation must include:
- purpose
- inputs/outputs
- data flow
- dependencies
- edge cases
- interactions with other modules

---

# 9. Git & Change Hygiene

## 9.1 Atomic Changes
- One feature/fix per commit whenever possible.
- Do not mix refactors/formatting with functional changes.

---

## 9.2 Commit Message
Use conventional prefixes:
- feat:
- fix:
- refactor:
- docs:
- chore:

---

# 10. Final Self-Review Summary (Required Output)

Before presenting the final solution, the AI must output a short checklist summary:

- ✅ Docs read
- ✅ Scope confirmed
- ✅ No duplicates created (searched repo/docs)
- ✅ Architecture respected (no layer/module violations)
- ✅ Zod validation present (if endpoints touched)
- ✅ Prisma untouched / Prisma change justified (if applicable)
- ✅ File sizes within limits (or approval requested)
- ✅ Smoke test plan included
- ✅ Docs updated
- ✅ Commit plan aligns with rules

If any item is not satisfied, explicitly mark it as ❌ and explain why.

---

# End of AI Code Review Rules