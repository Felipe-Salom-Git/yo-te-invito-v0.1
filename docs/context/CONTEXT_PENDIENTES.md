# CONTEXT_PENDIENTES.md — Checklist de seguimiento

Lista viva de **pendientes y mejoras**. Marcá con `[x]` lo completado.

**Convención:** `- [ ]` pendiente · `- [x]` hecho

---

## A. Infraestructura y backend

- [ ] Ejecutar migraciones Prisma en cada entorno (`prisma migrate deploy`) y `prisma generate` tras cambios de schema
- [ ] Confirmar cliente Prisma alineado con DB (hotel, inbox, **RentalLocation**, opening hours JSON, etc.)
- [ ] Rate limiting y hardening en producción
- [ ] Variables de entorno documentadas por app

---

## B. Pagos y producción

- [ ] Integrar proveedor de pago real (hoy: demo confirm)
- [ ] Webhooks / reconciliación de pagos
- [ ] Política de reembolsos y revocación en flujo real

---

## C. Vertical hotel

- [ ] Usuario demo `hotel@demo.local` en Prisma si aplica
- [ ] Edición de ficha desde portal `/hotel`
- [ ] E2E: apply → admin aprueba → home carrusel `hotel`

---

## D. Gastro

- [ ] Scanner PWA: payload `yti:gastro-discount|…` y validación API
- [ ] Persistencia real de contenido gastro (stubs → Prisma)
- [ ] Storage para imágenes (salir de data-URL)

---

## E. Rentals (Equipos y Rentals)

- [x] Admin: locales + productos por local, horarios estructurados, imágenes header/galería
- [x] Detalle público: hero con cover, galería miniaturas + modal, tarjetas local/WhatsApp (sin layout evento)
- [ ] WhatsApp: número real por local o config (hoy hardcoded demo)
- [ ] Subcategorías rental en explore/home si el producto lo prioriza

---

## F. Admin y operaciones

- [ ] Cola de eventos pendientes visible en dashboard
- [ ] Google Maps autocomplete (opcional; hoy OSM embed)
- [ ] Auditoría con filtros útiles en UI

---

## G. Frontend — UX y calidad

- [ ] Empty / loading / error consistentes
- [ ] `next/image` + dominios remotos
- [ ] SEO metadata por ficha pública
- [ ] Sidebar móvil para portales
- [ ] Accesibilidad en modales
- [ ] Tema claro (opcional)

---

## H. Home y descubrimiento

- [ ] Tabs de categoría en hero anónimo (Path A en `FRONTEND_CONTEXT.md`)
- [ ] `fromPrice` / `producerName` en listados API
- [ ] “Guardar para después” persistido

---

## I. Tickets y Canvas

- [ ] Render del ticket comprador desde `TicketTemplate`
- [ ] Pruebas impresión / QR en plantillas reales

---

## J. Referidos y documentación

- [ ] Reventa E2E si se prioriza
- [ ] Comisiones referidores — reglas definitivas
- [x] Unificar docs context (`PROJECT_CONTEXT`, `FRONTEND_CONTEXT`, `BACKEND_CONTEXT` sin sufijos V1/V2/V3)
- [ ] Mantener este archivo al cerrar slices

---

## Referencias

| Documento | Uso |
|-----------|-----|
| `AI_ENTRYPOINT.md` | Índice IA |
| `PROJECT_CONTEXT.md` | Visión + monorepo |
| `BACKEND_CONTEXT.md` | API + Prisma + scripts |
| `FRONTEND_CONTEXT.md` | Web + rentals UI |
| `FRONTEND_DEMO_NOTES.md` | Histórico demo |
