# Legal Admin — QA smoke manual (Slice 8)

Complementa los scripts automatizados. Ejecutar con API + web en dev y documentos **publicados** en `tenant-demo`.

## Prerrequisitos

```bash
pnpm --filter api run seed:legal-documents
pnpm --filter api run seed:legal-content -- --dry-run
pnpm --filter api run seed:legal-content
# Publicar desde /admin/legales al menos: terms_general, privacy_policy, purchase_refund_policy
pnpm --filter api run smoke:legal   # automatizado
```

---

## Importación de contenido (`seed:legal-content`)

| # | Paso | Esperado |
|---|------|----------|
| 1 | `seed:legal-content -- --dry-run` | Lista 10 archivos → keys; sin escritura DB |
| 2 | `seed:legal-content` | 10× `updated draft` o `created draft`; published untouched |
| 3 | `/admin/legales` → `terms_general` | Borrador con texto de `01_TERMINOS_...md` (no placeholder) |
| 4 | `support_internal_procedure` | visibility INTERNAL; sin ruta `/legal/*` pública |
| 5 | Re-import sin `--force` | `skipped` si borrador ya tiene contenido |
| 6 | `--publish` (solo staging controlado) | Advertencia en consola; no usar en prod sin revisión |

---


## Admin (`/admin/legales`)

| # | Paso | Esperado |
|---|------|----------|
| 1 | Login ADMIN | Acceso a listado |
| 2 | Listado desktop | Tabla amplia (~10 filas), scroll horizontal solo dentro del cuadro si el viewport es angosto (sidebar + `min-w-[900px]`) |
| 3 | Listado mobile (`<md`) | Cards legibles; tabla oculta |
| 3b | Layout portal admin | Contenido usa ancho útil (`max-w-screen-2xl`), sin columna estrecha doble `max-w` |
| 4 | Abrir `terms_general` | Tabs config / editor / preview / publicar |
| 5 | Guardar borrador | Toast OK; versión DRAFT |
| 6 | Preview Markdown | Headings y listas renderizados; sin HTML ejecutable |
| 7 | Publicar | Confirmación; una sola PUBLISHED |
| 8 | Historial versiones | ARCHIVED + PUBLISHED visibles |
| 9 | Usuario no admin intenta `/admin/legales` | Redirección o 403 |

---

## Público (`/legal/*`)

| # | Paso | Esperado |
|---|------|----------|
| 1 | `/legal/terminos` publicado | 200, título y contenido |
| 2 | Slug inexistente | 404 página amigable |
| 3 | Documento solo DRAFT | 404 |
| 4 | `support_internal_procedure` | Sin ruta pública |
| 5 | Mobile | Contenido legible, padding correcto |

---

## Registro (`/register`)

| # | Paso | Esperado |
|---|------|----------|
| 1 | Flujo USER | Paso legal con checkboxes |
| 2 | Sin marcar todos | No crea cuenta / mensaje requerido |
| 3 | Aceptar y crear | Cuenta OK; aceptación en DB (`UserLegalAcceptance` SIGNUP) |
| 4 | Perfil PRODUCER | Checkboxes signup al final del formulario |

---

## Checkout

| # | Paso | Esperado |
|---|------|----------|
| 1 | `/me/cart` autenticado | Bloque legal si hay pendientes CHECKOUT |
| 2 | Confirmar sin aceptar | Error / toast |
| 3 | Aceptar y confirmar | Pedidos creados; aceptación CHECKOUT registrada |
| 4 | `/checkout` invitado | Checkboxes; no permite submit sin marcar |
| 5 | `/checkout/[eventId]` | Misma lógica auth vs invitado |

---

## Portales

| # | Paso | Esperado |
|---|------|----------|
| 1 | `/producer` con términos pendientes | Banner ámbar no bloqueante |
| 2 | Expandir y aceptar | Banner desaparece tras accept |
| 3 | Navegación normal | Portal usable sin bloqueo total |

---

## Footer

| # | Paso | Esperado |
|---|------|----------|
| 1 | Home / explore | Grid legales + contacto |
| 2 | Mobile | 1–2 columnas, links tocables |

---

## Regresión seguridad

- [ ] No aparece email de admin en respuestas públicas.
- [ ] Network tab: formularios usan API repo, no `fetch` directo a admin desde browser sin auth.
- [ ] Nueva versión publicada → usuario ve requisito pendiente de nuevo.

---

## Scripts

| Comando | Alcance |
|---------|---------|
| `pnpm --filter api run test:legal-documents` | Admin, public, publish, INTERNAL, requirements, RBAC |
| `pnpm --filter api run test:me-legal-acceptance` | Accept, idempotencia, re-aceptación v2, INTERNAL reject |
| `pnpm --filter api run smoke:legal` | Ambos |
