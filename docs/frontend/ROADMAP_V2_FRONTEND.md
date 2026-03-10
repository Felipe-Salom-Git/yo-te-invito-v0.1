
---

# Roadmap Frontend V2

```md
# FRONTEND_WEB_ROADMAP_V2.md
## Yo Te Invito — Frontend Web V2

This roadmap extends the V1 LocalStorage-based frontend into a broader product-ready frontend surface.

The goal of V2 is to:
- complete the missing user-facing screens
- add richer browsing and account UX
- prepare organizer/admin surfaces
- improve demo realism before full backend integration

---

# V2 High-Level Goals

1. Complete missing user flows beyond basic purchase
2. Improve event discovery UX
3. Add user account utilities
4. Add organizer/admin visual surfaces
5. Prepare scanner/operator flows
6. Improve responsiveness, polish, and consistency
7. Keep architecture compatible with future API integration

---

# Slice V2-01 — Search UX Upgrade

## Objective
Improve event discovery with a more polished search experience.

## Deliverables
- debounced search input
- recent searches in localStorage
- clear search action
- no-results suggestions
- reusable search bar component

## Notes
Filtering can remain client-side for now but should be structured for future server-side search.

---

# Slice V2-02 — Advanced Filters Panel

## Objective
Add a richer filtering UI to Explore.

## Deliverables
- category filters
- price range placeholder
- city/location filter placeholder
- date filter placeholder
- filter chips
- clear-all filters action

## Notes
Do not hardcode backend assumptions; keep state local and UI-ready.

---

# Slice V2-03 — Event Categories Landing

## Objective
Add category-based navigation.

## Deliverables
- category shortcut cards
- category route or filtered explore entry
- reusable category badge/chip styles

## Example categories
- Música
- Fiesta
- Teatro
- Deportes
- Gastronomía
- Conferencias

---

# Slice V2-04 — Event Favorites / Wishlist

## Objective
Allow users to save favorite events.

## Deliverables
- toggle favorite action
- favorites persisted locally
- favorites page or favorites section in profile
- favorite icon button on cards and detail page

## Notes
Use repository abstraction, not direct localStorage in UI.

---

# Slice V2-05 — Share Event UX

## Objective
Add share-friendly event actions.

## Deliverables
- share button on event detail
- copy event link
- mobile share support when available
- fallback copy-to-clipboard

---

# Slice V2-06 — Event Detail Enhancements

## Objective
Make the event detail page feel more complete.

## Deliverables
- map/location block placeholder
- organizer summary block
- related events section
- FAQ or notes section
- richer info hierarchy

---

# Slice V2-07 — Checkout UX Polish

## Objective
Improve clarity and trust in the checkout experience.

## Deliverables
- sticky summary on desktop
- improved mobile checkout layout
- quantity edge-case handling
- validation messaging polish
- loading and success transitions

---

# Slice V2-08 — Order Confirmation Page

## Objective
Introduce a dedicated post-payment confirmation route.

## Deliverables
- confirmation summary page
- order ID display
- purchased ticket breakdown
- CTA to My Tickets
- CTA to Explore more events

## Suggested route
`/orders/[orderId]/success`

---

# Slice V2-09 — Ticket Detail Page

## Objective
Allow opening a dedicated ticket page.

## Deliverables
- ticket detail route
- QR display
- event summary
- ticket status
- ownership / order metadata placeholder

## Suggested route
`/tickets/[ticketId]`

---

# Slice V2-10 — My Orders Page

## Objective
Add order history UI.

## Deliverables
- orders list
- status display
- order summary cards
- link to related tickets
- empty state

## Suggested route
`/my-orders`

---

# Slice V2-11 — Profile Expansion

## Objective
Extend the profile page beyond placeholder state.

## Deliverables
- profile dashboard
- quick stats
- links to tickets, orders, favorites
- session placeholder improvements
- account settings entry points

---

# Slice V2-12 — Settings Page

## Objective
Add user-facing settings shell.

## Deliverables
- appearance/preferences placeholder
- notification preferences placeholder
- replay intro action
- demo reset actions
- account/settings grouped navigation

## Suggested route
`/settings`

---

# Slice V2-13 — Notifications Center UI

## Objective
Prepare a notifications UX surface.

## Deliverables
- notification bell entry in navbar
- notifications list page or panel
- read/unread styles
- empty state

## Notes
Use local seeded notifications first.

---

# Slice V2-14 — Auth Screens Polish

## Objective
Add cleaner auth entry UX before full auth integration.

## Deliverables
- login page shell
- register page shell or combined auth page
- social login placeholders
- event-friendly branded auth screen

---

# Slice V2-15 — Organizer Public Profile

## Objective
Prepare event organizer identity surfaces.

## Deliverables
- organizer summary card
- organizer public page shell
- organizer events list placeholder
- link from event detail

## Suggested route
`/organizers/[organizerId]`

---

# Slice V2-16 — Create Event Wizard UI Shell

## Objective
Prepare a multi-step event creation UI for organizer/admin flows.

## Deliverables
- create event shell
- stepper UI
- basic event info step
- ticket types step
- review/publish placeholder

## Suggested route
`/organizer/events/new`

## Notes
UI shell only if backend flow is not ready.

---

# Slice V2-17 — Organizer Event Management List

## Objective
Add organizer/admin event management surface.

## Deliverables
- event list table/cards
- statuses placeholder
- quick actions
- links to edit/manage view

## Suggested route
`/organizer/events`

---

# Slice V2-18 — Event Edit Screen Shell

## Objective
Prepare event editing UX.

## Deliverables
- editable form shell
- section grouping
- save draft placeholder
- publish/unpublish placeholder

## Suggested route
`/organizer/events/[eventId]/edit`

---

# Slice V2-19 — Scanner Entry UI

## Objective
Prepare an operator/scanner access screen.

## Deliverables
- scanner home page
- event selector
- scan action placeholder
- manual code input
- result state cards

## Suggested route
`/scanner`

## Domain notes
Use future scan results:
- OK
- ALREADY_USED
- REVOKED
- INVALID

---

# Slice V2-20 — Scan Result History UI

## Objective
Provide visual access to recent scan results.

## Deliverables
- recent scans list
- result badges
- timestamp display
- operator-friendly layout

---

# Slice V2-21 — Admin Dashboard Shell

## Objective
Create a minimal admin/ops visual shell.

## Deliverables
- admin dashboard route
- summary cards
- links to audit/logs/future modules
- dark branded admin layout reuse

---

# Slice V2-22 — Audit Log Viewer UI

## Objective
Prepare audit visibility on frontend.

## Deliverables
- audit log page shell
- log table
- action badges
- filters placeholder

## Notes
Useful once backend audit endpoints exist.

---

# Slice V2-23 — Empty / Error / Loading System

## Objective
Standardize async UX quality.

## Deliverables
- reusable skeletons
- reusable empty states
- reusable not-found blocks
- reusable error blocks
- route-level loading conventions

---

# Slice V2-24 — Mobile Navigation Optimization

## Objective
Improve mobile usability.

## Deliverables
- mobile bottom nav or better drawer
- improved tap targets
- navbar overflow handling
- screen-specific mobile polish

---

# Slice V2-25 — Accessibility Pass

## Objective
Improve accessibility quality.

## Deliverables
- keyboard navigation review
- aria labels for interactive controls
- focus states
- contrast validation
- modal accessibility improvements

---

# Slice V2-26 — Motion & Microinteractions Pass

## Objective
Improve premium feel without overdoing animation.

## Deliverables
- card hover polish
- route transitions if appropriate
- button microinteractions
- success feedback polish
- intro consistency refinement

---

# Slice V2-27 — Demo Data Control Center

## Objective
Improve local demo testing ergonomics.

## Deliverables
- reset demo data
- seed demo data
- generate sample tickets/orders
- dev-only data control panel

---

# Slice V2-28 — Backend Integration Readiness Pass

## Objective
Audit the frontend before swapping LocalRepository for ApiRepository.

## Deliverables
- repository coverage audit
- direct persistence access audit
- query invalidation review
- input/output contract review
- API integration checklist

---

# Recommended V2 Execution Order

1. Search UX Upgrade  
2. Advanced Filters Panel  
3. Event Categories Landing  
4. Event Favorites / Wishlist  
5. Share Event UX  
6. Event Detail Enhancements  
7. Checkout UX Polish  
8. Order Confirmation Page  
9. Ticket Detail Page  
10. My Orders Page  
11. Profile Expansion  
12. Settings Page  
13. Notifications Center UI  
14. Auth Screens Polish  
15. Organizer Public Profile  
16. Create Event Wizard UI Shell  
17. Organizer Event Management List  
18. Event Edit Screen Shell  
19. Scanner Entry UI  
20. Scan Result History UI  
21. Admin Dashboard Shell  
22. Audit Log Viewer UI  
23. Empty / Error / Loading System  
24. Mobile Navigation Optimization  
25. Accessibility Pass  
26. Motion & Microinteractions Pass  
27. Demo Data Control Center  
28. Backend Integration Readiness Pass