# Yo Te Invito — Frontend Roadmap — Chat 03

## Goal
Finish the remaining role-based areas, admin modules, scanner-related screens, reventa advanced flows, and transversal UX/system passes.

## Scope for this chat
This chat should cover:
- admin expansions
- gastronomic area
- referral role area
- scanner
- resale advanced
- cross-app polish and backend readiness

## Admin Roadmap

### V2-A01 — Admin Dashboard Real Blocks
- global metrics
- revenue summary
- activity summary
- alerts

### V2-A02 — Event Approval Queue
- review list
- approve / reject actions
- moderation notes shell

### V2-A03 — Global Management
- productoras
- eventos
- tickets
- search/filter shell

### V2-A04 — Interventions Panel
- revoke ticket
- resolve claims
- action confirmation flow

### V2-A05 — Platform Configuration
- fees
- gateways
- global templates
- terms

### V2-A06 — Category Management
- event categories
- restaurant categories
- excursion categories
- rental categories

### V2-A07 — Public Advertising Events Admin
- create/edit no-ticket public events
- publication controls

### V2-A08 — Excursions Admin
- create/edit excursions

### V2-A09 — Rentals Admin
- create/edit rentals

### V2-A10 — Audit Log Viewer UI
- sensitive action logs
- filters
- expandable details

## Gastronomic Roadmap

### V2-G01 — Gastronomic Dashboard Shell
- content summary
- discounts summary
- validations summary

### V2-G02 — Discount Management
- create/edit discounts
- validity
- promo source
- active/inactive state

### V2-G03 — Validation Registry
- date
- promo
- source
- validation state

### V2-G04 — Gastronomic Content Editor
- editorial
- images
- public preview block

## Referral Role Roadmap

### V2-R01 — Referral Dashboard
- earnings
- sales
- commission summary

### V2-R02 — Associated Events List
- events assigned to referral
- sale links

### V2-R03 — Referral Event Detail
- sales generated
- revenue generated
- request commission
- confirm commission receipt

### V2-R04 — Referral Settings
- change password
- basic account settings

## Scanner Roadmap

### V2-S01 — Scanner Entry UI
- scanner entry route
- login-required-ready shell

### V2-S02 — Scan Result Screen
- result rendering for:
  - `OK`
  - `ALREADY_USED`
  - `REVOKED`
  - `INVALID`

### V2-S03 — Scan History UI
- who scanned
- when
- result
- event/ticket summary

### V2-S04 — Offline Scanner Advanced
- roadmap only
- do not overbuild in local V1/V2 unless explicitly requested

## Resale Advanced Roadmap

### V2-RV01 — Resale Create Flow
- create listing from owned ticket
- generate public resale link

### V2-RV02 — Resale Rules UI
- listing rules
- disclaimers
- limits
- resale status visibility

### V2-RV03 — Antifraud UX Shell
- user-facing warnings
- placeholder rules
- backend-ready boundary notes

## Public and User UX Roadmap

### V2-P01 — Search UX Upgrade
- real search behavior
- suggestions
- recent searches
- grouped results

### V2-P02 — Advanced Filters
- date range
- price
- rating
- availability
- persistent chips

### V2-P03 — Categories Landing
- category landing pages
- curated discovery

### V2-P04 — Favorites / Wishlist
- save events/places
- personalized home rows

### V2-P05 — Share UX
- copy link
- native share when supported

### V2-P06 — Rich Event Detail
- lineup
- FAQ
- policies
- venue guidance

### V2-P07 — Order Confirmation Page
- post-checkout summary
- CTA to tickets

### V2-P08 — Ticket Detail Extended
- richer metadata
- wallet placeholder
- PDF action shell

### V2-P09 — My Orders Page
- order history
- filters
- emitted tickets access

### V2-P10 — Upcoming Events by User Location
- improved location logic
- optional geolocation
- manual fallback

### V2-U01 — Profile Expansion
- avatar
- extended profile fields
- richer preferences

### V2-U02 — Settings Page
- security
- notifications
- replay intro
- preferred city

### V2-U03 — Notifications Center UI
- event reminders
- status changes
- updates

### V2-U04 — Attended / Expected Events Polish
- better cards
- filters
- sorting

## Cross-App System Passes

### V2-X01 — Global Empty/Error/Loading System
- skeletons
- empty states
- retry patterns

### V2-X02 — Mobile Navigation Optimization
- bottom navigation by role
- quick access patterns

### V2-X03 — Accessibility Pass
- focus states
- keyboard flows
- aria labels
- contrast review

### V2-X04 — Motion / Microinteractions Pass
- hover
- transitions
- feedback states
- premium feel

### V2-X05 — Demo Data Control Center
- reset demo data
- reseed
- role presets

### V2-X06 — Backend Integration Readiness Pass
- contracts review
- query keys review
- mutation shape review
- repository replaceability check
- route assumption audit

## Exit criteria for Chat 03
By the end of this roadmap, the frontend should have:
- all role areas covered at shell or functional level
- complete admin roadmap structure
- scanner and resale advanced structure
- major UX enhancements planned
- final system-wide readiness and polish plan
