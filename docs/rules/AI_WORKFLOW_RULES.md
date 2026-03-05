# AI_WORKFLOW_RULES.md
## AI Development Workflow
### Ticketera – Yo Te Invito

This document defines how AI assistants (Antigravity, Cursor, or similar tools) must operate when working inside this repository.

The purpose of these rules is to ensure:

- predictable changes
- architectural stability
- minimal technical debt
- safe collaboration between AI and human developers

These rules must always be followed together with `PROJECT_RULES.md`.

---

# 1. Always Read Documentation First

Before starting any task, the AI must read the documentation available in the `docs/` folder.

Priority order:

1. docs/rules/PROJECT_RULES.md
2. docs/rules/AI_WORKFLOW_RULES.md
3. docs/architecture/*
4. docs/modules/*
5. docs/components/*

If a module or component already exists, it must be reused instead of creating a new one.

---

# 2. Never Start Coding Immediately

Before writing code, the AI must present an **Execution Plan**.

The plan must include:

- Objective
- Files to modify
- Implementation steps
- Risks
- Possible rule violations
- Smoke test plan
- Documentation updates

Coding should begin only after the plan is accepted.

---

# 3. Prefer Modification Over Creation

When implementing new features:

Always check if an existing component, hook, service, or module can be reused.

Priority order:

1. reuse existing module
2. extend existing module
3. create new module (only if necessary)

Duplicated functionality should be avoided.

---

# 4. Respect Architecture

The AI must respect the architectural boundaries defined in the project.

Examples:

UI logic belongs in components  
Business logic belongs in services or hooks  
Data access belongs in repositories/adapters  

Never mix responsibilities in the same module.

---

# 5. Keep Changes Local

Changes should be limited to the smallest possible scope.

Avoid modifying unrelated files.

Avoid large refactors unless explicitly requested.

---

# 6. File Size Awareness

If a file grows beyond **300–400 lines**, it must be split.

Recommended separation:

- UI rendering → components
- logic → hooks
- business rules → services
- utilities → utils

Large monolithic files must be avoided.

---

# 7. Documentation Awareness

Before creating new modules, the AI must verify documentation.

Search inside:

docs/components  
docs/modules  
docs/architecture  

If the module already exists, reuse it.

If a new module is created, documentation must also be created.

---

# 8. Mandatory Documentation Updates

Whenever a new component, module, or integration is created:

A documentation file must also be created in the corresponding folder.

Example:

docs/components/ticket-card.md  
docs/modules/payment-service.md

The documentation should explain:

- purpose
- inputs
- outputs
- dependencies
- how it interacts with the system

---

# 9. Dependency Safety

The AI must never install new libraries automatically.

If a library is useful, it must be proposed in the execution plan and approved before installation.

---

# 10. Database Safety

Changes involving database schema, migrations, or Prisma must be handled carefully.

The execution plan must explain:

- why the change is required
- what migration will happen
- possible compatibility risks

No database changes should be performed silently.

---

# 11. Commit Discipline

Changes should follow the rules defined in `PROJECT_RULES.md`.

General expectations:

- one feature per commit when possible
- commits must be atomic
- commit messages must follow conventional prefixes

---

# 12. Performance Awareness

The AI should avoid introducing performance problems.

Examples:

- avoid unnecessary re-renders
- avoid heavy computations in UI components
- avoid inefficient database queries
- paginate large lists

Optimizations should only be implemented when justified.

---

# 13. Error Handling

The AI should implement consistent error handling.

Avoid:

- silent failures
- unhandled promise rejections
- raw console logs in production code

Errors should be structured and meaningful.

---

# 14. Avoid Overengineering

The AI should not introduce complex patterns unless clearly necessary.

Prefer:

- simple solutions
- existing patterns
- minimal abstractions

Complex architecture should only be added when the system actually requires it.

---

# 15. Communication with Developers

If the AI detects uncertainty, it must ask for clarification instead of guessing.

Examples:

- missing architecture context
- unclear data flow
- conflicting documentation
- potential rule violations

The AI must prefer **asking questions instead of making assumptions**.

---

# 16. When in Doubt

If the AI is unsure how to proceed:

1. Review documentation
2. Search the repository
3. Ask for clarification
4. Propose a safe implementation plan

Never proceed with uncertain architectural changes.

---

# End of AI Workflow Rules