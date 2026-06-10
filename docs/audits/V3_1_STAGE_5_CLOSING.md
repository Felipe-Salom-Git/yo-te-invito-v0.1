# V3.1 Etapa 5 — Scanner PWA — Cierre

**Fecha:** 2026-06-10  
**Rama:** `feat/v1-s03-api-foundation`  
**Checklist:** §24.1–24.4 (`docs/dev/Yo_Te_Invito_Checklist_V3_1_Mejoras_Cliente.md`)

## 1. Objetivo

Cuentas scanner vinculadas a perfiles comerciales, gestión desde portales productora/gastro, PWA instalable con cámara QR, selección de contexto acotada y scope de seguridad en API.

## 2. Slices ejecutados

| Slice | Commit | Resumen |
| ----- | ------ | ------- |
| 5.1 | `483a56a` | Modelo `ScannerAccount`, listados, `GET /scanner/account` |
| 5.2 | `e1e8566` | Crear/activar/reset usuario scanner desde portales |
| 5.3 | `5ab2673` | `ScannerPwaCta`, manifest + iconos `apps/scanner` |
| 5.4 | `5ab2673` | Cámara QR (`html5-qrcode`, `QrCameraScanner`) |
| 5.5 | `5ab2673` | Fallback manual (pestaña Manual en `/door`) |
| 5.6 | `5ab2673` | `GET /scanner/scan-targets` + picker PWA |
| 5.7 | `5ab2673` | Scope `assertScannerCanAccess*` en scan/tickets/gastro |
| 5.8 | *(este commit)* | Docs contexto + checklist + cierre formal |

Smokes auxiliares: `V3_1_STAGE_5_SCANNER_ACCOUNTS_SMOKE.md`, `V3_1_STAGE_5_SCANNER_USERS_SMOKE.md`.

## 3. Modelo y reglas

- Tabla `ScannerAccount`: un usuario `SCANNER` → un perfil padre (`PRODUCER`, `GASTRO`, …).
- Sin `UserProducerMembership` / membership gastro → el scanner **no** accede al portal productor/gastro.
- `isActive` en vínculo + `User.status` al activar/desactivar.
- Scope: scanner solo escanea eventos de su `producerProfileId` o descuentos de su `gastroProfileId`.

## 4. Superficies

| Área | Entregable |
| ---- | ---------- |
| API | `/producer/scanners`, `/gastro/scanners`, `/scanner/scan-targets`, scope en `/scanner/scan` |
| Web productora | `/producer/scanners`, `ScannerPwaCta` en dashboard |
| Web gastro | `/gastro/scanners`, `ScannerPwaCta` en dashboard |
| PWA | `apps/scanner` → `/door`, manifest, cámara + manual |
| Auth PWA (dev) | Header `X-Dev-User-Id` — JWT login pendiente |

## 5. Comandos QA

```bash
pnpm --filter shared run build
pnpm --filter api run smoke:v31-scanner-accounts
pnpm --filter api run smoke:v31-scanner-scope
pnpm --filter scanner run build
pnpm --filter web run build
```

## 6. Pendiente (post-Etapa 5)

| Ítem | Checklist |
| ---- | --------- |
| PDF listado entradas | §24.5 |
| Offline sync avanzado | §24.6 |
| Login JWT en PWA | — |
| Portal operador excursión | §24.1 |
| Reset scanner desde admin usuarios | §24.1 |
| QA manual móvil + prod `scanner.yoteinvito.club` | §24.2–24.3 |

## 7. QA manual sugerido

1. Crear usuario scanner desde productora → copiar contraseña temporal.
2. PWA `/door`: pegar ID usuario `SCANNER` → listar eventos de esa productora.
3. Escanear QR `yti:v1:` (cámara o manual).
4. Evento de otra productora → API 403.
5. Gastro: validar `yti:gastro-discount:v1:` con descuento del local.
6. Instalar PWA desde CTA del portal (Chrome / Safari).
