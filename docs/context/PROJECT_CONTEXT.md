# PROJECT_CONTEXT.md
## Project Context
### Ticketera – Yo Te Invito

---

# 1. Project Overview

**Ticketera – Yo Te Invito** is a web platform designed to manage invitations, ticket distribution, and event participation tracking.

The system allows event organizers to create events, distribute digital invitations or tickets, and track attendee confirmations and participation.

The platform is designed to be **scalable, modular, and automation-friendly**, allowing AI-assisted development using tools such as **Cursor and Antigravity**.

The project prioritizes:

- maintainable architecture
- predictable development workflows
- modular design
- AI-assisted development with strict rules

---

# 2. Core Purpose

The main purpose of the system is to provide a **digital invitation and ticket management platform** where event organizers can:

- create and manage events
- distribute invitations or tickets
- track confirmations and attendance
- manage event-related data efficiently

The platform is designed to simplify invitation management and reduce manual coordination.

---

# 3. Primary Users

The platform has two main types of users:

### Event Organizers

Users who create and manage events.

They can:

- create events
- generate invitations or tickets
- manage guest lists
- track confirmations
- monitor event participation

---

### Event Participants

Users who receive invitations or tickets.

They can:

- view event details
- confirm attendance
- access their digital ticket
- interact with event-related information

---

# 4. System Philosophy

The system follows several key development principles:

### Predictability

The architecture must be predictable so that both developers and AI tools can understand and modify the system safely.

---

### Modularity

The system is divided into small modules with clear responsibilities.

Each module should:

- have a clear purpose
- be independently understandable
- avoid tight coupling with other modules

---

### AI-Assisted Development

The project is designed to work with AI tools such as:

- Cursor
- Antigravity

Because of this, the repository includes strict documentation and development rules.

AI systems must always:

- read documentation before implementing changes
- present execution plans before coding
- avoid breaking architectural rules

---

# 5. High-Level System Components

The platform is composed of several main logical areas.

---

### Event Management

Handles creation and configuration of events.

Responsibilities include:

- event creation
- event settings
- event metadata
- event visibility and access control

---

### Invitation / Ticket System

Manages invitations or tickets associated with events.

Responsibilities include:

- invitation generation
- ticket distribution
- ticket validation
- invitation status tracking

---

### Guest Management

Handles guest lists and participant tracking.

Responsibilities include:

- managing invited users
- attendance confirmations
- guest metadata

---

### Participation Tracking

Tracks event participation and attendance.

Responsibilities include:

- confirmation tracking
- check-in systems
- event participation records

---

### Notifications (Future Scope)

The platform may include a notification system for:

- invitation delivery
- confirmation reminders
- event updates

---

# 6. Data Consistency Philosophy

The system prioritizes **data stability and consistency**.

Important records should not be deleted if they are still referenced by other modules.

When necessary, systems may **copy or snapshot data** between collections to ensure historical consistency.

Example:

Approved quotes may be copied into tracking collections to avoid data loss if original records are removed.

---

# 7. Documentation Driven Development

This project follows a **documentation-first approach**.

All major modules and components must include documentation explaining:

- purpose
- inputs
- outputs
- data flow
- dependencies

Documentation is stored inside the `docs/` folder.

---

# 8. AI Development Expectations

AI systems working on this repository must:

- read documentation before coding
- follow `PROJECT_RULES.md`
- follow `AI_WORKFLOW_RULES.md`
- present execution plans before making changes
- avoid creating duplicate modules
- maintain architectural boundaries

---

# 9. Scope Evolution

The platform is expected to evolve over time.

Future modules may include:

- payment systems
- advanced event analytics
- integrations with external services
- notification systems
- automation workflows

All new features must respect the architectural principles of the system.

---

# 10. Summary

Ticketera – Yo Te Invito is a modular event invitation and ticket management platform designed with **maintainability and AI-assisted development in mind**.

The project uses structured documentation, strict development rules, and modular architecture to ensure safe collaboration between human developers and AI tools.

---

# End of Project Context