# PROJECT_RULES.md
## Ticketera – Yo Te Invito
### Development Rules for Antigravity & Cursor

---

# 1. Project Overview

This document defines the development rules, constraints, and workflow for the project **Ticketera – Yo Te Invito**.

These rules ensure:

- Code consistency
- Maintainability
- Predictable commits
- Minimal technical debt
- Stable collaboration between Antigravity, Cursor, and human developers

If a task requires breaking any rule, approval must be requested during the execution plan phase before proceeding.

---

# 2. Core Principles

## 2.1 Minimal Impact Changes

Changes must be as small and focused as possible.

Do not modify unrelated files or refactor large sections of the codebase unless strictly necessary.

---

## 2.2 Plan Before Implementation

Before writing code, always present a clear execution plan including:

- Objective
- Files that will be modified
- Steps to implement the change
- Potential risks
- Rule violations (if any)

Implementation must not begin without presenting the plan first.

---

## 2.3 Consistency Over Creativity

Follow existing patterns in the repository:

- Folder structure
- Naming conventions
- Architectural patterns
- Coding style

If there are multiple possible implementations, choose the one that is most consistent with the current codebase.

---

# 3. Dependency Rules

## 3.1 No New Libraries Without Approval

New dependencies must not be installed automatically.

If a dependency would significantly improve:

- performance
- security
- developer experience

It must be proposed during the execution plan and wait for approval.

---

## 3.2 Avoid Massive Refactors

Large refactors are not allowed unless:

- required to fix a critical issue
- required for the requested feature
- limited to directly affected files

Refactors must never expand beyond the local scope of the task.

---

## 3.3 Prisma Changes

Prisma schema or database logic should not be modified unless strictly required.

Any modification must include:

- explanation
- migration impact
- backward compatibility analysis

---

# 4. Git Workflow Rules

## 4.1 One Feature = One Commit

Each feature or fix should result in one commit whenever possible.

For larger work:

- one feature → one pull request
- multiple commits allowed but must remain atomic

---

## 4.2 Atomic Commits

Commits must contain only one logical change.

Do not mix:

- refactors
- formatting
- new features
- bug fixes

in the same commit.

---

## 4.3 Commit Message Format

Use standard commit prefixes:

feat: new feature  
fix: bug fix  
refactor: internal improvement  
docs: documentation update  
chore: maintenance

---

# 5. API and Validation Rules

## 5.1 Zod Validation

All API endpoints must validate inputs using Zod.

Validation should include:

- request body
- query parameters
- route params

When appropriate, responses may also be validated.

---

## 5.2 No Magic Strings

Statuses and repeated values must be implemented using:

- enums
- constants
- typed definitions

Avoid repeating raw strings across the codebase.

---

# 6. Naming Conventions

## 6.1 English Only

All code must use English naming, including:

- folders
- files
- functions
- variables
- interfaces
- enums
- types

---

## 6.2 Case Rules

Components → PascalCase  
Types → PascalCase  
Functions → camelCase  
Variables → camelCase  
Constants → SCREAMING_SNAKE_CASE  
Folders → kebab-case or project standard

---

# 7. File Size Limits

Files should not exceed 300–400 lines.

If a file approaches this size, it must be split by responsibility.

Examples:

UI rendering → component file  
Business logic → hooks / services / utilities

---

## 7.1 Separation of Concerns

Recommended separation:

components/  
hooks/  
services/  
utils/  
adapters/

UI components should not contain complex business logic.

---

# 8. Documentation Requirements

Documentation is mandatory.

---

## 8.1 Bilingual Comments

Code comments should be written in:

- English
- Spanish

This helps maintain collaboration across environments.

---

## 8.2 One Documentation File Per Module

Each major component or module should include a markdown documentation file explaining:

- Purpose
- Inputs
- Outputs
- Dependencies
- Data flow
- Interaction with other modules
- Edge cases
- Example usage (if applicable)

---

## 8.3 Centralized Documentation Folder

All documentation must be placed inside the documentation directory.

Recommended structure:

docs/

rules/  
PROJECT_RULES.md  

components/  
component-name.md  

modules/  
module-name.md  

architecture/  
system-overview.md  

guides/  
development-guide.md  

No documentation files should be scattered across the repository.

---

# 9. Anti-Duplication Rule

Before creating any new component, service, or module:

1. Search the repository
2. Search the documentation folder
3. Verify that a similar component does not already exist

Reuse existing components whenever possible.

If duplication is unavoidable, explain the reason in the execution plan.

---

# 10. Performance Guidelines

These rules help prevent performance issues.

---

## 10.1 Avoid Unnecessary Re-renders

Keep components small and focused.

Memoization should only be applied when there is a clear reason, not by default.

---

## 10.2 Lazy Loading

Heavy features or secondary routes should be lazy loaded when possible.

---

## 10.3 Efficient Queries

Database queries should:

- avoid N+1 patterns
- request only required fields
- support pagination when returning lists

---

## 10.4 No Blind Optimization

Performance optimizations should include a clear explanation of the expected improvement.

Avoid premature optimization.

---

# 11. Definition of Done

A feature is considered Done only when the following conditions are met:

---

## 11.1 Build Stability

- Project compiles successfully
- No runtime errors in core flows

---

## 11.2 Basic Smoke Testing

The main flow of the feature must be manually tested.

The developer must describe:

- how the feature was tested
- what was verified

---

## 11.3 Validation

Relevant endpoints must include Zod validation.

---

## 11.4 Documentation Updated

If a component or module was created or modified, its documentation file must be updated.

---

# 12. Execution Plan Template

Before starting implementation, the following plan must be presented.

---

## Execution Plan

Objective  
Describe the goal of the task.

---

Files to Modify  
List all files that will be changed.

---

Implementation Steps  
Step-by-step breakdown of the change.

---

Risks  
Potential compatibility or stability concerns.

---

Rule Violations  
Indicate if the task requires:

- installing dependencies
- modifying Prisma
- creating files larger than 400 lines
- breaking compatibility

Approval must be requested before proceeding.

---

Smoke Test Plan  
Explain how the change will be tested.

---

Documentation Updates  
List documentation files that will be created or updated.

---

End of Project Rules