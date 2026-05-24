# Auditoría Footer Público — Yo Te Invito

**Slice:** 1 — Auditoría y arquitectura (sin implementación UI final)  
**Fecha:** 2026-05-24  
**Referencias:** `FRONTEND_CONTEXT.md` §7, `LEGAL_ADMIN_MODULE.md`, `NAVBAR_RESPONSIVE_AUDIT.md` § Slice 8, checklist V2 § Footer público completo

---

## 1. Resumen

El footer global actual (`Footer.tsx`) vive en el **root layout** y aparece en **casi todas las rutas** de la app (públicas, portales, admin, auth, checkout). Ya integra **9 enlaces legales** centralizados en `footerLegalLinks.ts` (slugs alineados con `LEGAL_SLUG_TO_KEY`) y **contacto opcional** vía `usePlatformConfig` → `PlatformConfigRepo` → `GET /admin/config`.

Es un footer **funcional pero mínimo**: copyright, contacto, grid legales y un único link de sitio («Eventos» → `/home`). **No** cumple aún el bloque «Footer público completo» del checklist (verticales, institucional, confianza, redes, accesos rápidos ampliados, variante por contexto).

**Recomendación principal:** evolucionar con **config centralizada** (`footerPublicConfig.ts` + mantener `footerLegalLinks.ts`), **variantes por ruta** (`full` / `minimal` / `hidden`) y **subcomponentes** extraídos solo cuando el markup de Slice 2 supere ~120 líneas — sin mega-refactor ni romper legales existentes.

---

## 2. Estado actual detectado

| Aspecto | Estado |
|---------|--------|
| Componente principal | `apps/web/components/Footer.tsx` (`'use client'`) |
| Render global | `apps/web/app/layout.tsx` — después de `<main>` |
| Links legales | `apps/web/lib/navigation/footerLegalLinks.ts` — 9 slugs `/legal/*` |
| Contacto | `usePlatformConfig()` → `repos.platformConfig.get(tenantId)` → **`/admin/config`** |
| Navegación sitio | Solo «Eventos» → `/home` (label desalineado con navbar «Inicio») |
| Verticales / explore / categorías | No en footer global |
| Redes sociales | No |
| Bloque institucional / confianza | No |
| Variante por ruta | No — mismo footer en portales y checkout |
| Footer gateway | `CategoryGatewayFooter` — solo en pantalla gateway (`/` overlay, `/categorias`) |
| Footer inline legal | `LegalDocumentPage` — mini footer de versión dentro del artículo |
| Admin en footer | Retirado (Slice Navbar 8) — correcto |
| `fetch` directo en Footer | No — usa hook + repository |
| LocalStorage | No |

---

## 3. Archivos revisados

| Archivo | Rol |
|---------|-----|
| `apps/web/components/Footer.tsx` | UI footer global |
| `apps/web/lib/navigation/footerLegalLinks.ts` | Enlaces legales estáticos |
| `apps/web/app/layout.tsx` | Montaje global Navbar + Footer |
| `apps/web/hooks/usePlatformConfig.ts` | TanStack Query → `platformConfig.get` |
| `apps/web/repositories/ApiRepository.ts` | `platformConfig` → `/admin/config` |
| `packages/shared/src/constants/legal-documents.ts` | `LEGAL_SLUG_TO_KEY` / `LEGAL_KEY_TO_SLUG` |
| `packages/shared/src/schemas/platform-config.schema.ts` | `contact.email/phone/address` |
| `apps/web/lib/navigation/publicNavConfig.ts` | Navbar público (comparación duplicación) |
| `apps/web/lib/navigation/userNavConfig.ts` | Menú cuenta (portal vía `/profiles`) |
| `apps/web/lib/home/categoryGatewayConfig.ts` | Hrefs verticales `/categoria/*` |
| `apps/web/components/category-gateway/CategoryGatewayScreen.tsx` | Gateway + `CategoryGatewayFooter` |
| `apps/web/components/category-gateway/CategoryGatewayFooter.tsx` | Links Ir al inicio / Explorar todo |
| `apps/web/components/legal/LegalDocumentPage.tsx` | Footer interno de documento |
| `apps/web/app/(public)/page.tsx` | Entry splash + gateway overlay |
| `apps/web/app/(public)/categorias/page.tsx` | Gateway reentrada |
| `apps/web/app/(portal)/*/layout.tsx` | Portales — heredan root layout |
| `docs/audits/NAVBAR_RESPONSIVE_AUDIT.md` | Deudas footer (Slice 8) |
| `docs/legal/LEGAL_ADMIN_MODULE.md` | Integración footer + legales |
| `docs/dev/LEGAL_ADMIN_QA_SMOKE.md` | Smoke footer legales |
| `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md` | Bloque Footer público completo |

---

## 4. Dónde se renderiza actualmente el footer

### 4.1 Montaje

```
app/layout.tsx (root, todas las rutas)
  ├── Navbar
  ├── <main>{children}</main>
  └── Footer                    ← global
```

No existe layout alternativo que omita el `Footer`. Los route groups `(public)`, `(portal)`, `(auth)` solo pasan `children` sin tocar el chrome global.

### 4.2 Por superficie

| Superficie | ¿Footer global? | Notas |
|------------|-----------------|-------|
| Público discovery (`/home`, `/explore`, `/categoria/*`, fichas) | Sí | Pie estándar con legales |
| Gateway `/` (fase gateway) | Sí en DOM | Overlay `fixed z-[100]` cubre viewport; footer global queda **fuera de vista** hasta salir |
| Gateway `/categorias` | Sí | **Doble pie:** `CategoryGatewayFooter` + `Footer` global |
| `/legal/[slug]` | Sí | **Triple pie:** inline en `LegalDocumentPage` + `Footer` global |
| Checkout `/checkout`, `/checkout/[eventId]` | Sí | Mismo footer completo — puede competir con foco de compra |
| Auth `/login`, `/register/*` | Sí | |
| Portal `/me/*`, `/producer/*`, `/gastro/*`, etc. | Sí | Grid legales bajo contenido de portal — ruido visual |
| Admin `/admin/*` | Sí | Mismo footer que sitio público |
| Redirect `/r/[code]` | Sí (breve) | Página de carga → redirige a checkout o `/home` |

### 4.3 Footer adicional (no global)

| Componente | Rutas | Propósito |
|------------|-------|-----------|
| `CategoryGatewayFooter` | `/` (overlay), `/categorias` | CTA secundario: `/home`, `/explore` — no sustituye al global |
| `LegalDocumentPage` `<footer>` | `/legal/*` | Copy de versión publicada — no es navegación |

### 4.4 Riesgo de doble footer

| Ruta | Severidad | Detalle |
|------|-----------|---------|
| `/categorias` | Media | Dos barras de navegación inferior con intents similares |
| `/legal/[slug]` | Baja–media | Footer legal de artículo + footer global con mismos links |
| `/` (gateway) | Baja | Solo uno visible; global sigue en DOM |
| Fichas con sticky CTA (rental mobile) | Baja | `RentalMobileStickyCta` + footer — distinto propósito; revisar `pb` en Slice 2 |

---

## 5. Links legales actuales

### 5.1 Fuente

`FOOTER_LEGAL_LINKS` en `footerLegalLinks.ts` — array estático `{ href, label }`.

### 5.2 Inventario (alineación con shared)

| Label footer | href | Key (`LEGAL_SLUG_TO_KEY`) |
|--------------|------|---------------------------|
| Términos y condiciones | `/legal/terminos` | `terms_general` |
| Privacidad | `/legal/privacidad` | `privacy_policy` |
| Compra, cancelación y reembolso | `/legal/compras-cancelaciones-reembolsos` | `purchase_refund_policy` |
| Transferencia de tickets | `/legal/transferencia-tickets` | `ticket_transfer_terms` |
| Productores | `/legal/productores` | `producer_terms` |
| Gastronómicos | `/legal/gastronomicos` | `gastro_terms` |
| Rentals | `/legal/rentals` | `rental_terms` |
| Hoteles | `/legal/hoteles` | `hotel_terms` |
| Referidos | `/legal/referidos` | `referrer_terms` |

**Slugs:** correctos respecto a `packages/shared/src/constants/legal-documents.ts`.  
**Documento interno** `support_internal_procedure`: sin slug público — correctamente ausente del footer.

### 5.3 Mantenimiento

- Links **hardcodeados** pero duplican el mapa shared; conviene **generar** desde `LEGAL_SLUG_TO_KEY` + labels en config (Slice 2) para un solo origen de verdad.
- **404** si el documento no está `PUBLISHED` en API — el link sigue visible (comportamiento esperado hasta publicar contenido real).
- Otros consumidores legales: `LegalDocumentsLinksList` (requirements dinámicos en registro/checkout), no reutiliza `FOOTER_LEGAL_LINKS`.

### 5.4 Contacto / soporte

| Campo | Origen | UI |
|-------|--------|-----|
| email, phone, address | `PlatformConfig.contact` vía `usePlatformConfig` | `mailto:` / `tel:` si hay datos |
| Canal soporte dedicado | No | Pendiente producto |
| Endpoint | `GET /admin/config` | Funciona en dev con tenant default; deuda: endpoint **público** de contacto (ver `LEGAL_ADMIN_AUDIT.md`) |

Admin edita contacto en `/admin/contactos`.

---

## 6. Relación con Navbar V2

### 6.1 Lo que el navbar ya cubre (no repetir en footer como competencia visual)

| Elemento | Navbar | Footer actual / propuesto |
|----------|--------|---------------------------|
| Logo → categorías | Sí (`/categorias`) | No |
| Inicio `/home` | Sí (`NavbarHomeButton`) | Sí como «Eventos» — **redundante y label distinto** |
| Explorar | Sí (desktop + drawer mobile) | Solo en `CategoryGatewayFooter` |
| Ciudad | Sí (`NavbarCitySelector` / drawer) | **No debe** aparecer en footer |
| Carrito | Sí (`NavbarCartButton` + badge) | **No** en footer |
| Menú usuario completo | Sí (`NavbarUserMenu` / drawer: tickets, cuenta, portal) | Footer puede link **texto simple** a `/profiles` o `/me` — no replicar dropdown |
| Verticales | Drawer mobile (`/categoria/*`) | Pendiente footer — links **secundarios**, no chips grandes |
| Portales por rol | `/profiles` + sidebars portales | Footer: «Mi portal» → `/profiles` (no listar producer/admin/gastro) |
| Hoteles | Próximamente en drawer | Footer puede «Hoteles (Próximamente)» → `/hoteles` |
| Admin | No en navbar/footer público | OK |

### 6.2 Lo que el footer sí debe aportar (complementario)

- **Legales** obligatorios (ya implementados).
- **Contacto** persistente (email/tel — config).
- **Descubrimiento pasivo** para usuarios que scrollean hasta el pie (explorar, categorías, verticales).
- **Confianza** (microcopy estático, sin interacción).
- **Redes / crédito desarrollador** (placeholders controlados).

### 6.3 Jerarquía visual recomendada

Footer en `bg-bg-muted`, tipografía `text-sm` / `text-xs`, sin sticky, sin badges. Navbar permanece `sticky` con acciones primarias — el footer **no** debe usar CTAs del mismo peso que «Explorar» del navbar.

---

## 7. Rutas públicas alcanzadas

Todas heredan `Footer` global salvo nota.

| Ruta | Footer global | Observación |
|------|---------------|-------------|
| `/` | Sí (oculto en gateway) | Tras intro → redirect `/home` |
| `/home` | Sí | Objetivo principal post-discovery |
| `/explore` | Sí | |
| `/categoria/event` \| `gastro` \| `rental` \| `excursion` | Sí | Hrefs verticales: `/categoria/{id}` |
| `/categorias` | Sí + gateway footer | Doble pie |
| `/events/[id]` | Sí | |
| `/restaurants/[id]` | Sí | |
| `/rentals/[id]` | Sí | Sticky CTA mobile encima del scroll |
| `/excursiones/[id]` | Sí | |
| `/hoteles`, `/hoteles/[id]` | Sí | Vertical Próximamente |
| `/legal/[slug]` | Sí + inline | |
| `/referrers`, `/referrers/[slug]` | Sí | |
| `/r/[code]` | Sí (transitorio) | |
| `/producers`, `/producers/[id\|slug]` | Sí | |
| `/users/[userId]` | Sí | Perfil comentarista |
| `/checkout`, `/checkout/[eventId]` | Sí | Valorar **minimal** en Slice 2 |
| `/login`, `/register/*` | Sí | Valorar **minimal** |
| `/me/*` (portal) | Sí | Valorar **hidden** o minimal legal-only |
| `/admin/*`, `/producer/*`, etc. | Sí | Valorar **hidden** o slim |

---

## 8. Rutas donde no debería aparecer o debería simplificarse

| Ruta / grupo | Variante recomendada | Motivo |
|--------------|---------------------|--------|
| `/checkout/*`, `/me/cart` | `minimal` | Foco conversión; mantener **solo** links legales esenciales + contacto |
| `/login`, `/register/*` | `minimal` | Legales ya en formulario; footer reducido |
| `/me/*`, `/producer/*`, `/gastro/*`, `/hotel/*`, `/referrer/*`, `/admin/*` | `hidden` o `minimal` | Navegación en sidebar/mobile portal; evitar grid legales duplicado bajo scroll largo |
| `/` gateway overlay, `/categorias` | `full` en global **o** ocultar global y dejar solo `CategoryGatewayFooter` | Resolver doble pie en Slice 2 |
| `/legal/[slug]` | `minimal` global + inline artículo | O quitar inline y confiar en global |
| `/r/[code]` | `hidden` | Pantalla de transición |

Implementación sugerida (Slice 2): `getFooterVariant(pathname)` en `lib/navigation/footerVisibility.ts` consumido por `Footer.tsx` — sin nuevos layouts de portal si se puede evitar.

---

## 9. Riesgos detectados

| # | Riesgo | Impacto | Mitigación en slices siguientes |
|---|--------|---------|--------------------------------|
| R1 | Footer global en portales/admin | UX ruidosa, scroll extra | Variante `hidden` / `minimal` por pathname |
| R2 | Doble/triple footer (`/categorias`, `/legal/*`) | Confusión, mobile largo | Condicionar gateway; alinear con `LegalDocumentPage` |
| R3 | `usePlatformConfig` → `/admin/config` en páginas públicas | Acoplamiento admin; posible fallo sin auth en prod | Nuevo `GET /public/platform/contact` o incluir en config pública existente |
| R4 | Links legales visibles con documentos no publicados | 404 usuario | Opcional: filtrar por API (complejidad) o aceptar hasta publish |
| R5 | Duplicar navbar (ciudad, carrito, menú completo) | Competencia visual | Checklist explícito en QA Slice 3 |
| R6 | Label «Eventos» vs «Inicio» | Inconsistencia marca | Unificar copy en Slice 2 |
| R7 | Hardcodear redes/contacto reales inexistentes | Deuda legal/confianza | `PLACEHOLDER` en config + `enabled: false` |
| R8 | Grid legales 9 ítems en mobile | Scroll horizontal / columna muy larga | 2 cols ya aplicadas (`sm:grid-cols-2`); probar 1 col en xs |
| R9 | Romper integración Legal Admin 7 | Regresión compliance | No eliminar slugs; tests manuales `LEGAL_ADMIN_QA_SMOKE` § Footer |
| R10 | Mega-refactor de layouts portales | Alcance | Solo cambiar `Footer`, no `PortalLayoutShell` |

---

## 10. Arquitectura recomendada

### 10.1 Principios

1. **Patrón existente:** UI → hooks/config → repos → API (contacto futuro público).
2. **Configs estáticos** para links/copy; **TanStack Query** solo para contacto dinámico.
3. **Componentes** extraídos cuando el markup lo justifique (regla ~300 líneas del proyecto).
4. **No** `fetch` ni `localStorage` en componentes footer.
5. **No** duplicar navegación crítica del navbar.

### 10.2 Árbol de componentes (objetivo Slice 2–3)

```
Footer.tsx                    # orquestador, lee variant + configs
├── FooterBrandBlock.tsx      # logo/texto institucional breve
├── FooterLinksGroup.tsx      # título sección + <ul> reutilizable
├── FooterContactBlock.tsx    # email/tel/dirección (config API)
├── FooterTrustBlock.tsx      # microcopy confianza (estático)
├── FooterSocialLinks.tsx     # iconos/enlaces YTI (placeholder)
└── FooterDeveloperCredit.tsx # crédito equipo dev (placeholder)
```

`CategoryGatewayFooter` permanece **específico del gateway**; en Slice 2 decidir si el global se oculta en `/categorias` o se eliminan links redundantes del gateway.

### 10.3 Variantes

```ts
type FooterVariant = 'full' | 'minimal' | 'hidden';
```

| Variant | Contenido |
|---------|-----------|
| `full` | Institucional + verticales + accesos rápidos + legales + contacto + confianza + redes + dev |
| `minimal` | Legales (subset checkout: términos, privacidad, compra/reembolso) + contacto opcional |
| `hidden` | No renderizar `<footer>` |

---

## 11. Configuración recomendada

### 11.1 Evaluación: un archivo vs varios

| Enfoque | Pros | Contras |
|---------|------|---------|
| Un solo `footerConfig.ts` | Simple al inicio | Crece rápido con slices |
| **Híbrido recomendado** | Legal separado; resto agrupado | 2–3 archivos máximo |

### 11.2 Estructura propuesta

```
apps/web/lib/navigation/
  footerLegalLinks.ts          # mantener; opcional derive de shared
  footerPublicConfig.ts        # NEW: verticales, quick links, trust, social, developer placeholders
  footerVisibility.ts          # NEW: pathname → FooterVariant
```

**No crear aún** 6 archivos separados (`footerVerticalLinks.ts`, etc.) hasta que `footerPublicConfig.ts` supere ~80–100 líneas exportadas.

### 11.3 Esquema config (borrador)

```ts
// footerPublicConfig.ts (orientativo)
export const FOOTER_QUICK_LINKS = [
  { href: '/explore', label: 'Explorar' },
  { href: '/categorias', label: 'Categorías' },
  { href: '/profiles', label: 'Mi portal' },
  { href: '/me/tickets', label: 'Mis tickets', requiresAuth?: true },
];

export const FOOTER_VERTICAL_LINKS = [
  { href: '/categoria/event', label: 'Eventos' },
  { href: '/categoria/gastro', label: 'Gastronomía' },
  { href: '/categoria/rental', label: 'Equipos y rentals' },
  { href: '/categoria/excursion', label: 'Excursiones' },
  { href: '/hoteles', label: 'Hoteles', comingSoon: true },
];

export const FOOTER_TRUST_ITEMS = [ /* microcopy */ ];

export const FOOTER_SOCIAL_LINKS = [
  { id: 'instagram', href: null, label: 'Instagram', placeholder: true },
];

export const FOOTER_DEVELOPER = {
  webUrl: null,
  socialUrl: null,
  label: 'Desarrollo web',
  placeholder: true,
};
```

**Contacto Yo Te Invito:** seguir `PlatformConfig.contact` hasta endpoint público; **no** hardcodear email real en config estática.

### 11.4 Generación links legales (mejora opcional Slice 2)

```ts
import { LEGAL_SLUG_TO_KEY } from '@yo-te-invito/shared';
// + mapa label por slug → FOOTER_LEGAL_LINKS
```

Garantiza que un nuevo slug shared no se olvide en footer.

---

## 12. Propuesta de slices siguientes

### Slice 2 — Footer público MVP (UI + config)

- Crear `footerPublicConfig.ts` + `footerVisibility.ts`.
- Ampliar `Footer.tsx` con secciones: institucional, verticales, accesos rápidos, confianza.
- Unificar label Inicio/Explorar; quitar redundancia «Eventos» suelto.
- Variante `minimal` en checkout/login; evaluar `hidden` en portales.
- Resolver doble pie en `/categorias`.
- Placeholders redes/dev con `aria-disabled` o sin `href` hasta datos reales.
- QA: `LEGAL_ADMIN_QA_SMOKE.md` § Footer + rutas del smoke manual del slice.

### Slice 3 — Pulido responsive, branding, endpoint contacto

- Revisión dark premium (espaciado, verde acento en hovers, bordes `border-border`).
- Mobile: una columna en xs, evitar overflow horizontal (`min-w-0`, `break-words`).
- Opcional API `GET /public/platform/contact`.
- Auth-aware links (`Mis tickets` solo logueado).
- Documentar smoke en `docs/audits/PUBLIC_FOOTER_SMOKE.md` (si el patrón navbar aplica).

---

## 13. Contenido propuesto (copy direccional — no final)

### Bloque institucional

> Yo Te Invito conecta personas con eventos, experiencias, gastronomía, excursiones y servicios turísticos en la ciudad. Descubrí, compará y gestioná tus entradas digitales en un solo lugar.

### Verticales

| Label | href |
|-------|------|
| Eventos | `/categoria/event` |
| Gastronomía | `/categoria/gastro` |
| Equipos y rentals | `/categoria/rental` |
| Excursiones | `/categoria/excursion` |
| Hoteles — Próximamente | `/hoteles` |

### Accesos rápidos

| Label | href | Notas |
|-------|------|-------|
| Explorar | `/explore` | Complementa navbar |
| Categorías | `/categorias` | Alineado con logo navbar |
| Mi portal | `/profiles` | No listar cada portal |
| Mis tickets | `/me/tickets` | Solo autenticado |
| Soporte | `mailto:` desde config o `/legal/...` futuro | Placeholder hasta canal real |

### Confianza (microcopy)

- Compra segura con confirmación de orden (demo hoy; copy genérico).
- Tickets digitales con QR para ingreso.
- Validación en puerta con lector oficial.
- Soporte y políticas claras — enlaces legales visibles.
- Tus datos tratados según política de privacidad.

### Redes y desarrolladores (placeholders)

| Campo | Estado | Ubicación config |
|-------|--------|------------------|
| Instagram Yo Te Invito | Pendiente | `FOOTER_SOCIAL_LINKS` |
| Email/tel soporte YTI | Pendiente producto | `PlatformConfig` + futuro público |
| Web equipo desarrollador | Pendiente | `FOOTER_DEVELOPER.webUrl` |
| Red social equipo desarrollador | Pendiente | `FOOTER_DEVELOPER.socialUrl` |

Renderizar solo si `href` no nulo; si no, texto muted «Próximamente» sin link roto.

---

## 14. Criterios de aceptación para el bloque completo

- [ ] Footer `full` en home, explore, categorías y fichas públicas listadas en checklist V2.
- [ ] Enlaces por vertical operativos (hoteles como Próximamente).
- [ ] Accesos rápidos: Explorar, Categorías, Portal (`/profiles`), Mis tickets (auth).
- [ ] Bloque institucional + confianza visible en variant `full`.
- [ ] Redes y crédito dev con placeholders controlados o datos reales.
- [ ] Contacto desde config (sin hardcode definitivo).
- [ ] **Todos** los slugs legales actuales siguen en footer (no regresión).
- [ ] Sin duplicar ciudad, carrito ni menú usuario del navbar.
- [ ] Variantes checkout/portales definidas y probadas.
- [ ] Responsive mobile sin scroll horizontal evidente.
- [ ] Sin `fetch` directo ni LocalStorage en componentes footer.
- [ ] Checklist V2 § Footer público completo marcado ítem por ítem.

---

## 15. Pendientes / datos reales a reemplazar

| Dato | Estado | Dónde configurar |
|------|--------|------------------|
| Instagram oficial Yo Te Invito | Pendiente | `footerPublicConfig` → social |
| Contacto soporte YTI (email/canal) | Parcial (`PlatformConfig`) | Admin `/admin/contactos` |
| Teléfono / dirección oficina | Parcial | `PlatformConfig.contact` |
| Web equipo desarrollador | Pendiente | `FOOTER_DEVELOPER` |
| Red social equipo desarrollador | Pendiente | `FOOTER_DEVELOPER` |
| Copy institucional final | Pendiente marketing | `FooterBrandBlock` o config |
| Publicación documentos legales | Pendiente cliente | `/admin/legales` — links ya apuntan bien |

---

## Smoke manual sugerido (post Slice 1)

Verificar en dev (`pnpm run -w dev`):

| Ruta | Verificar |
|------|-----------|
| `/` / `/home` | Footer visible; legales clicables; sin duplicado con navbar |
| `/explore` | Grid legales + contacto si config cargada |
| `/categoria/event` … `excursion` | Footer presente |
| Ficha evento / gastro / rental | Footer + sin conflicto sticky rental |
| `/hoteles` | Footer |
| `/legal/terminos` (si publicado) | Inline + global — evaluar redundancia |
| `/categorias` | Doble footer — documentado para Slice 2 |
| `/me` o `/admin` | Footer global bajo portal — candidato a ocultar |
| `/checkout/[eventId]` | Footer no debería distraer (mejora Slice 2) |
| Mobile 375px | Sin scroll horizontal en grid legales |

---

## Referencias cruzadas

- Navbar cerrado: `docs/audits/NAVBAR_RESPONSIVE_AUDIT.md`, `NAVBAR_RESPONSIVE_SMOKE.md`
- Smoke footer: `docs/audits/PUBLIC_FOOTER_SMOKE.md`
- Cierre bloque: `docs/audits/PUBLIC_FOOTER_CLOSING_AUDIT.md`
- Legales: `docs/legal/LEGAL_ADMIN_MODULE.md`, `docs/dev/LEGAL_ADMIN_QA_SMOKE.md`
- Checklist: `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md` § Footer público completo

---

## Slice 2 — Visibilidad y configuración base

**Fecha:** 2026-05-24

### Cambios realizados

| Archivo | Cambio |
|---------|--------|
| `lib/navigation/footerVisibility.ts` | `getFooterVariant(pathname)` → `full` \| `minimal` \| `hidden` |
| `lib/navigation/footerPublicConfig.ts` | Verticales, quick links, trust, social/dev placeholders (sin UI final) |
| `lib/navigation/footerLegalLinks.ts` | `FOOTER_LEGAL_LINKS_ESSENTIAL` para variante minimal |
| `components/Footer.tsx` | Prop `variant`; minimal = copyright + contacto + 3 legales |
| `components/RouteAwareFooter.tsx` | `usePathname()` + `Footer` — root layout sigue siendo Server Component |
| `app/layout.tsx` | `<RouteAwareFooter />` en lugar de `<Footer />` |
| `components/legal/LegalDocumentPage.tsx` | Pie inline solo nota de versión (sin © duplicado) |

### Rutas por variante

| Variante | Rutas |
|----------|-------|
| **full** | Default público: `/`, `/home`, `/explore`, `/categoria/*`, fichas (`/events/*`, `/restaurants/*`, `/rentals/*`, `/excursiones/*`, `/hoteles`, `/hoteles/*`), `/referrers`, `/producers/*`, `/users/*`, etc. |
| **minimal** | `/legal/*`, `/checkout`, `/checkout/*` |
| **hidden** | Portales: `/me/*`, `/producer/*`, `/admin/*`, `/gastro/*`, `/hotel/*`, `/referrer/*`, `/cuenta/*`; gateway `/categorias`; auth `/login`, `/register/*`, `/logout`; redirect `/r/*` |

### Decisión `/categorias`

**Ocultar footer global** (`hidden`). Se mantiene `CategoryGatewayFooter` dentro de `CategoryGatewayScreen` (CTA editorial «Ir al inicio» / «Explorar todo») sin duplicar grid legales ni contacto. La pantalla gateway en `/` (overlay post-splash) sigue usando el mismo `CategoryGatewayFooter`; el footer global en `/` permanece `full` pero queda fuera del viewport mientras el overlay está activo (sin cambio de comportamiento visible).

### Decisión `/legal/[slug]`

**Footer global `minimal`** (3 legales esenciales + contacto + copyright). **Pie inline del artículo** reducido a una línea de versión publicada, sin bloque © duplicado. Los 9 slugs siguen accesibles desde el footer minimal y el listado completo en rutas `full`.

### Riesgos pendientes (Slice 3+)

| Riesgo | Notas |
|--------|-------|
| `usePlatformConfig` → `/admin/config` en footer público | Sin cambio en Slice 2 |
| `footerPublicConfig` sin cablear a UI | Slice 4 — diseño footer completo |
| `/` con overlay gateway | Footer global `full` en DOM; no visible durante overlay |
| Checkout minimal aún muestra legales | Aceptable; evaluar `hidden` si QA pide más foco |

---

## Slice 3 — Contacto público

**Fecha:** 2026-05-24

### Endpoint creado

| Método | Ruta | Auth |
|--------|------|------|
| `GET` | `/public/platform-config?tenantId=` | No |

Implementación: `PublicPlatformConfigController`, `PublicPlatformConfigService` (`apps/api/src/public/`). Schema: `publicPlatformConfigQuerySchema`, `publicPlatformConfigResponseSchema` en `packages/shared/src/schemas/platform-config.schema.ts`.

### Campos expuestos

| Campo API | Origen Prisma hoy | Notas |
|-----------|-------------------|--------|
| `supportEmail` | `PlatformConfig.contactEmail` | |
| `supportPhone` | `PlatformConfig.contactPhone` | |
| `address` | `PlatformConfig.contactAddress` | |
| `whatsappPhone` | — | `null` hasta migración/campo dedicado |
| `instagramUrl` | — | `null` — Slice 4 redes |
| `websiteUrl` | — | `null` — Slice 4 |

### Campos no expuestos

- `categories` (JSON admin)
- Cualquier flag/config operativa interna
- Credenciales, secretos, datos de usuarios
- Respuesta completa de `GET /admin/config`

### Frontend

| Pieza | Detalle |
|-------|---------|
| Repo | `repos.publicPlatformConfig.get(tenantId)` → `GET /public/platform-config` |
| Hook | `usePublicPlatformConfig` — keys `publicPlatformConfigKeys.byTenant` |
| Footer | `resolveFooterContact()` en `footerPublicContact.ts` |
| Admin | `usePlatformConfig` / `platformConfig.get` sin cambios para `/admin/contactos` |
| Invalidación | Al guardar contacto en admin → invalida cache público |

### Fallbacks

Si la API devuelve todos los campos `null` o falla la query, el footer muestra:

- `soporte@yoteinvito.test`
- `+54 9 294 000-0000`

Con leyenda «Contacto de demostración — datos reales pendientes.» No bloquea el render.

### Pendientes de datos reales

- Cargar email/tel/dirección en `/admin/contactos` (persiste en `PlatformConfig`).
- Campos `whatsappPhone`, `instagramUrl`, `websiteUrl` requieren modelo/producto antes de exponer valores reales.
- Reemplazar placeholders del footer cuando exista contacto en BD.

### Smoke técnico

```bash
curl "http://localhost:3001/public/platform-config?tenantId=tenant-demo"
```

Incluido en `pnpm --filter api run smoke:api` (`public/platform-config`, sin auth).

---

## Slice 4 — Footer público completo

**Fecha:** 2026-05-24

### Componentes creados / modificados

| Archivo | Rol |
|---------|-----|
| `components/footer/FooterFull.tsx` | Variante `full` — grid dark premium |
| `components/footer/FooterMinimal.tsx` | Variante `minimal` |
| `components/footer/FooterBrandBlock.tsx` | Logo + copy institucional |
| `components/footer/FooterLinksGroup.tsx` | Verticales y accesos rápidos |
| `components/footer/FooterLegalSection.tsx` | Grid legales (`footerLegalLinks.ts`) |
| `components/footer/FooterContactBlock.tsx` | Soporte + contacto API/fallback |
| `components/footer/FooterTrustBlock.tsx` | Chips de confianza |
| `components/footer/FooterSocialLinks.tsx` | Redes (config + API) |
| `components/footer/FooterDeveloperCredit.tsx` | Crédito desarrollador |
| `components/footer/footerStyles.ts` | Tokens Tailwind compartidos |
| `components/footer/footerSocialUtils.ts` | Merge API `instagramUrl` / `websiteUrl` |
| `components/Footer.tsx` | Orquestador `full` \| `minimal` \| `hidden` |
| `lib/navigation/footerPublicConfig.ts` | Copy, links, placeholders actualizados |

### Bloques implementados (variante `full`)

- Institucional (logo → `/categorias`, texto)
- Verticales (5 links; Hoteles → `/hoteles` + badge Próximamente)
- Accesos rápidos (Explorar, Categorías, Inicio, Mi portal, Mis tickets)
- Legales (9 slugs sin cambios)
- Soporte/contacto (`usePublicPlatformConfig`)
- Confianza (chips; **sin** promesa de pagos reales)
- Redes (Instagram/Sitio — placeholder o URL API válida)
- Desarrollador (texto secundario + TODO)
- © en barra inferior

### Datos placeholder

| Dato | Ubicación |
|------|-----------|
| `soporte@yoteinvito.test` / tel demo | `footerPublicContact.ts` |
| Instagram / Sitio web sin URL | `FOOTER_SOCIAL_LINKS` + UI «próximamente» |
| Equipo desarrollador | `FOOTER_DEVELOPER_CREDIT.teamName` |
| Copy confianza | `FOOTER_TRUST_ITEMS` — evita «pago seguro» con proveedor real |

### Rutas afectadas

Sin cambios en `footerVisibility.ts`: `full` en discovery público; `minimal` en `/legal/*` y checkout; `hidden` en portales y `/categorias`.

### Decisiones de copy

- Confianza: «Resumen antes de confirmar» en lugar de integración de pagos reales (checkout demo).
- Hoteles: enlace a `/hoteles` con badge Próximamente (no `/categoria/hotel`).
- Accesos rápidos secundarios al navbar (sin ciudad, carro ni menú usuario).

### Slice 5 — Responsive, accesibilidad y smoke (2026-05-24)

| Ajuste | Detalle |
|--------|---------|
| Touch targets | `footerLinkClass` — `min-h-11` mobile, compact `md+` |
| Overflow | `overflow-x-clip` en shell y contenedor; `break-words` / `min-w-0` |
| Safe area | `pb-[max(...,env(safe-area-inset-bottom))]` en full/minimal |
| Redes placeholder | `aria-disabled="true"`, badge «Pendiente», sin `href="#"` |
| Hoteles | `aria-label` «Hoteles, próximamente» + badge visible |
| Rentals | Footer en flujo documental; página mantiene `pb-24` para sticky CTA |
| Smoke | `docs/audits/PUBLIC_FOOTER_SMOKE.md` |

---

## Cierre del bloque Footer público completo

**Estado:** cerrado V2 (2026-05-24), sujeto a datos reales y QA manual en dispositivo.

### Slices completados

| Slice | Entregable |
|-------|------------|
| 1 | `PUBLIC_FOOTER_AUDIT.md` — arquitectura |
| 2 | `footerVisibility.ts`, `RouteAwareFooter`, `footerPublicConfig.ts` |
| 3 | `GET /public/platform-config`, `usePublicPlatformConfig` |
| 4 | `components/footer/*` — UI dark premium completa |
| 5 | Responsive, a11y, `PUBLIC_FOOTER_SMOKE.md` |

### Decisiones finales

- Footer global controlado por `getFooterVariant(pathname)`.
- `/categorias`: solo `CategoryGatewayFooter`; global `hidden`.
- `/legal/*`: global `minimal` + nota de versión en artículo (sin © duplicado).
- Contacto público solo vía endpoint público; admin intacto en `/admin/contactos`.
- Confianza sin promesa de pagos reales (checkout demo).
- Navbar V2 no modificado en este bloque.

### Pendientes reales (producto)

| Dato | Acción |
|------|--------|
| Instagram Yo Te Invito | Config + API `instagramUrl` |
| Contacto institucional real | Admin contactos / BD |
| Web y red equipo desarrollador | `FOOTER_DEVELOPER_CREDIT` |
| Documentos legales publicados | `/admin/legales` publish |
| QA físico 375px / iOS | Manual opcional |

### Recomendaciones futuras

- Playwright smoke footer (variantes + links).
- Campos Prisma `instagramUrl` / `whatsappPhone` si se persisten en admin.
- Endpoint público ampliado solo si hay más campos aprobados.
- Evaluar footer `hidden` en checkout si QA pide más foco en conversión.
