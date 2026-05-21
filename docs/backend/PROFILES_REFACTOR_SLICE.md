# Backend Domain Refactor — Single User + Operational Profiles

> `demo:seed` / `demo-seed.ts` eliminados. Ver [guides/DEMO_REMOVAL.md](../guides/DEMO_REMOVAL.md).

## Summary

Migration from role-centric user model to **single user + operational profiles**. A person has one account; access to producer/gastro/referrer experiences is via **memberships** on business profiles.

### Slice 2 updates (continuación)
- **Seed histórico:** el antiguo `demo:seed` ya no existe; no ejecutar seeds masivos.
- **ProducerRolesGuard**: Permite acceso por membership además de rol legacy.
- **POST /profiles/producer/apply**: Usuario autenticado solicita perfil productor (PENDING).
- **Event create**: Asigna `producerProfileId` cuando el usuario tiene membership activo.

---

## 1. What Changed in Prisma

### New models

| Model | Purpose |
|-------|---------|
| `ProducerProfile` | Business entity for events |
| `GastroProfile` | Business entity for gastro content/discounts |
| `ReferrerProfile` | Business entity for referral links/commissions |
| `UserProducerMembership` | User ↔ ProducerProfile (OWNER, ADMIN, STAFF) |
| `UserGastroMembership` | User ↔ GastroProfile |
| `UserReferrerMembership` | User ↔ ReferrerProfile |

### New enums

- `ProfileStatus`: DRAFT, PENDING, ACTIVE, REJECTED, SUSPENDED
- `MembershipRole`: OWNER, ADMIN, STAFF
- `MembershipStatus`: ACTIVE, PENDING, DISABLED

### Ownership fields (additive)

| Table | Field | Notes |
|-------|-------|-------|
| Event | `producerProfileId` | Optional; `producerId` kept for legacy |
| ReferralLink | `referrerProfileId` | Optional; `referrerId` kept for legacy |
| Payout | `producerProfileId` | Optional; `producerId` kept for legacy |

---

## 2. Legacy Pieces Still in Use

- **User.role** — Kept. Used by RolesGuard and hybrid checks.
- **Event.producerId** — Still used for ownership when `producerProfileId` is null.
- **ReferralLink.referrerId** — Still used.
- **Payout.producerId** — Still used.
- **RoleApplication** — Unchanged. Profile application endpoints to be added later.
- **Route groups** — `/producer`, `/gastro`, `/referrer` unchanged.

---

## 3. Modules Updated

| Module | Changes |
|--------|---------|
| **Me** | `GET /me` returns `availableProfiles` (producer, gastro, referrer with hasAccess + profiles array) |
| **Producer** | `ProducerEventsCrudService` uses `ProfilesAuthorizationService.canManageEvent` and profile-aware list |
| **Common** | New `ProfilesAuthorizationService` for membership checks |

---

## 4. Migration Notes

- Migration `20260310170433_add_profiles_and_memberships` is additive.
- New columns are nullable; existing rows unchanged.
- Tras migrar: crear perfiles/memberships **manualmente** (admin UI o SQL) o con `user:restore-master` + flujos de aplicación de perfil. No hay `demo:seed`.

---

## 5. Seed / Demo (histórico)

Los scripts `demo-seed.ts` / `demo-seed-curated.ts` fueron **eliminados**. Ver [guides/DEMO_REMOVAL.md](../guides/DEMO_REMOVAL.md).

---

## 6. Frontend Impact

- **GET /me** response now includes `availableProfiles`. Frontend may:
  - Use `availableProfiles.producer.hasAccess` instead of role-based checks.
  - Support profile selector when user has multiple profiles.
- No breaking changes to public APIs.
- Producer events list and create/update logic unchanged from the outside; authorization is profile-aware internally.

---

## 7. Next Steps (Post-Slice)

- Profile application flow: `POST /profiles/producer/apply` etc.
- Admin approval for profile applications (instead of only role flip).
- Event create: set `producerProfileId` when user has profile.
- ReferralLink/ReferralCommission: use `referrerProfileId`.
- Deprecate `User.role` as primary source of producer/gastro/referrer access.
- RolesGuard: allow access when user has active membership, not only role.
