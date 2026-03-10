# Yo Te Invito — Frontend ROADMAP Maqueta Completa

## Objetivo
Lograr una **maqueta completa** del frontend web, cubriendo todas las pantallas y flujos definidos en la arquitectura y esquema del proyecto, **ignorando la base de datos** (LocalStorage Edition).

Data: repositorio, seed, mocks. Backend/DB fuera de alcance.

---

# 1. Estado actual vs arquitectura

## 1.1 Rutas existentes

| Ruta | Estado |
|------|--------|
| `/` | Entry + SplashIntro |
| `/home` | Home con carruseles |
| `/explore` | Explorar eventos |
| `/events/[eventId]` | Detalle evento |
| `/content/[id]` | Contenido editorial |
| `/producers/[id]` | Perfil público productora |
| `/checkout` | Checkout carrito global |
| `/checkout/[eventId]` | Checkout por evento |
| `/checkout/success` | Post-compra |
| `/r/[code]` | Redirect referral |
| `/me/tickets` | Mis tickets |
| `/me/tickets/[ticketId]` | QR del ticket |
| `/cuenta` | Área cuenta |
| `/cuenta/preferencias` | Preferencias |
| `/cuenta/eventos-asistidos` | Eventos asistidos |
| `/cuenta/eventos-esperados` | Eventos esperados |
| `/admin` | Dashboard admin |
| `/admin/audit` | Auditoría |
| `/admin/eventos` | Admin eventos |
| `/admin/productoras` | Admin productoras |
| `/admin/tickets` | Admin tickets |
| `/admin/configuracion` | Config plataforma |
| `/admin/publicidad` | Eventos publicidad |
| `/producer` | Dashboard productor |
| `/producer/events` | Lista eventos |
| `/producer/events/[eventId]` | Detalle evento productor |
| `/producer/events/[eventId]/courtesies` | Cortesías |
| `/producer/events/[eventId]/referrals` | Referidos |
| `/referrer` | Portal referrer (shell) |
| `/gastro` | Portal gastro (shell) |
| `/login`, `/logout` | Auth |
| `/dev/local-db`, `/dev/scanner-sim`, `/dev/seed` | Dev tools |

---

## 1.2 Qué falta según arquitectura (CORE_SCHEMA, DOMAIN_MODEL)

### Entidades y flujos no cubiertos en UI

| Entidad/Flujo | Cobertura actual | Falta |
|---------------|------------------|-------|
| **Restaurant / Gastro** | No hay detalle público | `/restaurants/[id]` o integración en `/content/[id]` |
| **Excursion** | No hay detalle específico | `/excursiones/[id]` |
| **Rental** | No hay detalle específico | `/rentals/[id]` |
| **Resale** | No existe | `/reventa/[listingId]` |
| **Producer** | Existe `/producers/[id]` | OK |
| **Event** | Existe | OK |
| **Order** | Solo checkout success | `/me/orders`, `/me/orders/[orderId]` |
| **Payout** | No hay UI productor | `/producer/payouts` |
| **Producer Event Create/Edit** | No hay formulario | `/producer/events/nuevo`, `/producer/events/[eventId]/editar` |
| **Producer Referrals (standalone)** | Solo por evento | `/producer/referrals` |
| **Producer Content** | No existe | `/producer/contenido` |
| **Admin** | Shell OK | Cola aprobación, intervenciones, categorías |
| **Gastro** | Shell OK | Discounts, validations, content |
| **Referrer** | Shell OK | Dashboard, eventos asignados, detalle, settings |
| **Scanner** | `dev/scanner-sim` | UI operador real: scan, resultado, historial |
| **Ticket Types / Tandas** | Parcial en evento | Tab Entradas en productor más completa |

---

# 2. Gaps por dominio

## 2.1 Catálogo público (CORE_SCHEMA: Event, GastroProfile, ProducerProfile)

- [ ] **Restaurant detail** — `/restaurants/[id]` — Slice 17 (V4)
- [ ] **Excursion detail** — `/excursiones/[id]` — Slice 18 (V4)
- [ ] **Rental detail** — `/rentals/[id]` — Slice 19 (V4)
- [ ] **Resale listing** — `/reventa/[listingId]` — Slice 22 (V4)
- [ ] **Categories landing** — `/categorias` o filtros en explore
- [ ] **Búsqueda avanzada** — debounce, sugerencias, chips de filtros

## 2.2 Usuario (User, Order, Ticket)

- [ ] **My Orders** — `/me/orders` — Historial de compras
- [ ] **Order detail** — `/me/orders/[orderId]` — Detalle + tickets
- [ ] **Settings** — `/cuenta/configuracion` o `/settings` — Replay intro, notificaciones, ciudad
- [ ] **Notifications center** — Panel/bell con lista
- [ ] **Favorites / Wishlist** — Toggle y página en cuenta

## 2.3 Productor (ProducerProfile, Event, PayoutRequest)

- [ ] **Event create** — `/producer/events/nuevo`
- [ ] **Event edit** — `/producer/events/[eventId]/editar`
- [ ] **Pricing / Tandas** — Tab Entradas con tipos, tandas, batch activo
- [ ] **Payouts** — `/producer/payouts` — Solicitar, historial
- [ ] **Referrals standalone** — `/producer/referrals`
- [ ] **Producer content** — `/producer/contenido` — Editorial, imágenes

## 2.4 Admin (AuditLog, platform config)

- [ ] **Event approval queue** — Cola de aprobación
- [ ] **Interventions** — Revocar ticket, resolver incidencias
- [ ] **Category management** — Categorías de eventos, gastro, excursiones, rentals
- [ ] **Excursions admin** — CRUD excursiones
- [ ] **Rentals admin** — CRUD rentals
- [ ] **Admin dashboard real blocks** — Métricas, alertas

## 2.5 Gastro (GastroProfile, Discount, DiscountRedemption)

- [ ] **Gastro dashboard** — KPIs, resumen
- [ ] **Discount management** — CRUD descuentos
- [ ] **Validation registry** — Log de validaciones
- [ ] **Gastro content editor** — Editorial, imágenes

## 2.6 Referrer (ReferrerProfile, ReferralLink, ReferralCommission)

- [ ] **Referrer dashboard** — Ganancias, ventas, comisiones
- [ ] **Associated events** — Eventos asignados
- [ ] **Referrer event detail** — Ventas, comisión, solicitar pago
- [ ] **Referrer settings** — Password, preferencias

## 2.7 Scanner (TicketScanLog)

- [ ] **Scanner entry** — Ruta dedicada (o mejorar dev/scanner-sim)
- [ ] **Scan result screen** — OK, ALREADY_USED, REVOKED, INVALID
- [ ] **Scan history UI** — Quién, cuándo, resultado

## 2.8 Resale

- [ ] **Resale create flow** — Crear listing desde ticket
- [ ] **Resale rules UI** — Reglas, disclaimer

## 2.9 UX transversal

- [ ] **Empty / Error / Loading** — Skeletons, estados vacíos, retry
- [ ] **Share UX** — Copiar link, share nativo
- [ ] **Advanced filters** — Fecha, precio, rating
- [ ] **Mobile nav** — Bottom nav por rol
- [ ] **Accessibility** — Focus, ARIA, contraste
- [ ] **Motion** — Microinteracciones, transiciones
- [ ] **Demo data control** — Reset, reseed, presets (mejorar dev/)

---

# 3. Fases sugeridas para maqueta completa

## Fase 1 — Catálogo público completo
1. Restaurant detail
2. Excursion detail
3. Rental detail
4. Resale listing público
5. Categories landing / filtros mejorados

## Fase 2 — Usuario y pedidos
1. My Orders + Order detail
2. Settings (replay intro, ciudad)
3. Favorites / Wishlist
4. Notifications center
5. Share UX

## Fase 3 — Productor
1. Event create / edit
2. Pricing / Tandas tab completa
3. Payouts
4. Referrals standalone
5. Producer content

## Fase 4 — Admin
1. Event approval queue
2. Interventions panel
3. Category management
4. Excursions / Rentals admin
5. Dashboard con bloques reales

## Fase 5 — Gastro y Referrer
1. Gastro dashboard, discounts, validations, content
2. Referrer dashboard, eventos asignados, detalle, settings

## Fase 6 — Scanner y Resale
1. Scanner entry + scan result + history
2. Resale create flow + rules

## Fase 7 — Pulido
1. Empty/Error/Loading
2. Mobile nav
3. Accessibility
4. Motion / microinteracciones
5. Demo data control

---

# 4. Prioridad recomendada (maqueta funcional)

Para tener una maqueta navegable de extremo a extremo sin depender de DB:

| Prioridad | Items |
|-----------|-------|
| Alta | Restaurant / Excursion / Rental detail, My Orders, Event create/edit, Scanner UI, Settings |
| Media | Resale, Payouts, Admin approval queue, Gastro dashboard, Referrer dashboard |
| Baja | Category management, Interventions, Excursions/Rentals admin, Notifications, Favorites |

---

# 5. Referencias

- **`docs/project/ROLES_OBJECTIVES_SPEC.md`** — Especificación canónica de objetivos por rol (comprador, productora, admin, referido, gastro)
- `docs/guides/DEVELOPER_USERS.md` — Usuarios mock por rol para testing
- `docs/context/FRONTEND_CONTEXT_V2.md`
- `docs/architecture/CORE_SCHEMA.md`
- `docs/architecture/DOMAIN_MODEL.md`
- `docs/architecture/PROJECT_ARCHITECTURE.md`
- `docs/frontend/ROADMAP_V3_FRONTEND.md` … `ROADMAP_V5_FRONTEND.md`

---

# 6. Criterios de salida (maqueta completa)

Al finalizar este roadmap, el frontend tendrá:

1. Pantallas para todas las entidades del CORE_SCHEMA usadas en web
2. Flujos navegables: usuario, productor, admin, gastro, referrer
3. Scanner UI funcional con LocalRepository
4. Sin dependencia de base de datos real
5. UX base: empty, error, loading
6. Listo para sustituir LocalRepository por ApiRepository sin refactor grande
