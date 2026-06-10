# V3.1 Etapa 0 — QA manual en servidor (checklist Euge)

**Dominio:** https://yoteinvito.club  
**Rama desplegada:** `feat/v1-s03-api-foundation`  
**Fecha:** 2026-06-10

Marcar `[x]` al validar cada ítem. Anotar incidencias al pie.

---

## 1. Público — discovery

- [ ] `/` — splash/gateway dark, sin fondo blanco (probar con OS en light mode)
- [ ] `/home` — carruseles, tabs categoría, dark consistente
- [ ] `/categorias` — gateway 2×2, footer propio
- [ ] `/explore` — filtros URL, chips, resultados
- [ ] `/categoria/event` — carruseles + subcategorías
- [ ] `/categoria/gastro` — cards con subtítulo propuesta (no solo ciudad)
- [ ] `/categoria/excursion` — horario/duración en cards si aplica
- [ ] `/categoria/rental` — CTA alquiler, sin copy de alojamiento

---

## 2. Fichas públicas

- [ ] Evento simple — fecha, ticketera, productora
- [ ] Evento multi-fecha — selector de fecha en checkout
- [ ] Restaurante/gastro — `/restaurants/[id]`; propuesta, horarios, descuentos
- [ ] Excursión — horario, punto encuentro, links externos
- [ ] Rental — WhatsApp, galería, local
- [ ] Hotel — ficha informativa Próximamente / contacto

---

## 3. Gastro hotfix (crítico)

- [ ] Admin: crear local gastro → ACTIVE
- [ ] Aparece en `/categoria/gastro`
- [ ] Aparece en `/explore?category=gastro`
- [ ] Card abre `/restaurants/[publicEventId]` (no `/gastronomicos/[eventId]`)
- [ ] Subtítulo card = propuesta/resumen (ciudad solo si no hay descripción)
- [ ] Suspender → no visible en discovery
- [ ] Reactivar → vuelve a discovery con `publicEventId` correcto
- [ ] Ficha pública carga sin 404

---

## 4. Modo dark (Etapa 13)

Probar con **sistema/navegador en modo claro**:

- [ ] Sin fondo blanco global
- [ ] Navbar, drawers, modales dark
- [ ] Cards y portales dark
- [ ] Login/register dark
- [ ] Sin flash blanco relevante al cargar

---

## 5. Productora

- [ ] Login productora
- [ ] Wizard evento 3 pasos
- [ ] Evento simple + entradas
- [ ] Evento multi-fecha + entradas por fecha
- [ ] Legal `producer_terms`: si **publicado** → puede enviar a revisión; si **DRAFT** → bloqueo esperado
- [ ] Ticket studio / listado PDF entradas

---

## 6. Admin

- [ ] Dashboard KPIs + cola
- [ ] `/admin/eventos` — archivar/restaurar
- [ ] `/admin/gastronomicos` — CRUD, activar/suspender
- [ ] `/admin/hoteles` — archivar/restaurar
- [ ] `/admin/etiquetas`
- [ ] `/admin/categorias` — banners editoriales
- [ ] `/admin/legales` — listado (no publicar sin aprobación cliente)
- [ ] `/admin/auditoria` — logs recientes post-deploy

---

## 7. Usuario (`/me`)

- [ ] Login / registro wizard
- [ ] `/me` dashboard
- [ ] `/me/cart` + checkout demo
- [ ] `/me/tickets` + detalle + impresión
- [ ] Transferencia de entrada
- [ ] Cambio de fecha (si evento multi-fecha)
- [ ] Favoritos / «Me interesa»
- [ ] Notificaciones in-app

---

## 8. Scanner PWA

- [ ] https://scanner.yoteinvito.club carga
- [ ] Login usuario scanner (prod: JWT real)
- [ ] Selección evento / descuento gastro
- [ ] Modo cámara QR
- [ ] Modo manual
- [ ] Descarga PDF listado entradas (productora)
- [ ] Offline/sync (opcional — QA móvil puerta)

---

## 9. Legales

- [ ] Footer — links a `/legal/*`
- [ ] `/legal/terminos`, `/legal/privacidad`, `/legal/productores`
- [ ] Registro — checkbox SIGNUP
- [ ] Checkout — checkbox CHECKOUT
- [ ] Wizard productora — aviso legal publicación

---

## 10. Getnet / pagos

- [ ] **No ejecutar pago real** sin confirmación explícita
- [ ] Checkout demo (`DEMO`) sigue funcionando
- [ ] Redirect Getnet no roto (smoke previo OK en VPS)
- [ ] Webhook Getnet portal — pendiente si no configurado

---

## Incidencias encontradas

| # | Ruta / área | Descripción | Severidad |
|---|-------------|-------------|-----------|
| 1 | | | |
| 2 | | | |

---

## Cierre

- [ ] QA manual aprobado para merge a `main`
- [ ] Pendientes documentados en `CONTEXT_PENDIENTES.md`
