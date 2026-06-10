# V3.1 Etapa 5 — Scanner PWA — Cierre (Slices 5.1–5.8)

## Resumen

Etapa 5 entrega el modelo de cuentas scanner, gestión desde portales productora/gastro, PWA instalable con cámara QR, selección de contexto acotada al perfil padre y hardening de scope en API.

| Slice | Tema | Estado |
|-------|------|--------|
| 5.1 | Modelo `ScannerAccount` + listados | ✅ |
| 5.2 | Crear/activar/reset desde portales | ✅ |
| 5.3 | CTA PWA + manifest `apps/scanner` | ✅ |
| 5.4 | Cámara QR (`html5-qrcode`) | ✅ |
| 5.5 | Fallback manual (pestaña Manual) | ✅ |
| 5.6 | `GET /scanner/scan-targets` + picker PWA | ✅ |
| 5.7 | Scope en `scan`, `tickets`, gastro validate | ✅ |
| 5.8 | Smokes + este doc | ✅ |

## Pendiente fuera de Etapa 5

- §24.5 PDF listado entradas
- §24.6 Offline sync avanzado (cola parcial existe en PWA)
- Login JWT real en PWA (hoy `X-Dev-User-Id` en dev)
- Portal operador excursión
- Reset scanner desde `/admin/usuarios`

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/scanner/scan-targets` | Eventos o descuentos del perfil padre |
| GET | `/scanner/account` | Contexto scanner autenticado |
| POST | `/scanner/scan` | Valida entrada (scope productora) |
| GET | `/scanner/events/:id/tickets` | Preload offline (scope) |
| POST | `/scanner/gastro-discounts/validate` | Valida descuento (scope gastro) |

## PWA (`apps/scanner`)

- `/door` — UI principal (`DoorScannerClient`)
- `public/manifest.json` + iconos SVG
- Cámara: `components/QrCameraScanner.tsx`
- Persistencia: `scanner:lastEventId`, `scanner:lastDiscountId`, `scanner:inputMode`

## Portales web

- `ScannerPwaCta` — Abrir / Instalar / Copiar link
- Rutas: `/producer/scanners`, `/gastro/scanners`, dashboard gastro

## Smokes

```bash
pnpm --filter shared run build
pnpm --filter api run smoke:v31-scanner-accounts
pnpm --filter api run smoke:v31-scanner-scope
```

## QA manual sugerido

1. Crear usuario scanner desde productora → copiar contraseña temporal.
2. En PWA `/door`, pegar `X-Dev-User-Id` → ver eventos de esa productora.
3. Escanear con cámara o manual un QR `yti:v1:` válido.
4. Intentar evento de otra productora → API 403.
5. Desde gastro: validar descuento `yti:gastro-discount:v1:`.
6. Instalar PWA en móvil (Safari / Chrome) desde CTA del portal.
