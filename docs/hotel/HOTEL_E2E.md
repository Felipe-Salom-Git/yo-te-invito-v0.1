# E2E — Vertical Hoteles (mínimo)

Playwright specs: `e2e/hotel.spec.ts`

## Requisitos

- `pnpm dev:api` + `pnpm dev:web` (o dejar que Playwright los levante).
- Migraciones aplicadas (`publicEventId` en `HotelProfile`).
- **Sin** `demo:seed` ni usuarios `@demo.local`.

## Variables de entorno

| Variable | Requerido | Uso |
|----------|-----------|-----|
| `E2E_HOTEL_EMAIL` | Para tests de portal/ficha | Usuario con perfil hotel **ACTIVE**, membresía activa, ubicación con lat/lng en ficha |
| `E2E_HOTEL_PASSWORD` | Idem | |
| `E2E_ADMIN_EMAIL` | Solo tab admin Hoteles | Rol `ADMIN` (default: `E2E_USER_EMAIL`) |
| `E2E_ADMIN_PASSWORD` | Idem | (default: `E2E_USER_PASSWORD`) |
| `E2E_TENANT_ID` | No | Default `tenant-demo` |
| `E2E_API_BASE_URL` | No | Default `http://127.0.0.1:3001` |
| `PLAYWRIGHT_BASE_URL` | No | Default `http://127.0.0.1:3000` |

Si faltan credenciales hotel, los tests del bloque «portal y ficha» hacen **skip** (CI verde).

## Comandos

```bash
E2E_HOTEL_EMAIL=hotel@example.com E2E_HOTEL_PASSWORD=*** pnpm e2e:hotel
```

Solo reglas públicas (sin credenciales):

```bash
pnpm playwright test e2e/hotel.spec.ts -g "reglas públicas"
```

## Cobertura

| Test | Qué valida |
|------|------------|
| Gateway `/categorias` | 4 tiles; sin HOTELES |
| `/hoteles` | Pantalla Próximamente |
| Portal `/hotel` | Login hotel → completitud + editar |
| Guardar ficha | PATCH vía UI; redirect `/hotel` |
| `/hoteles/[id]` | API pública + copy informativo; sin reservar/comprar |
| `/hotel/valoraciones` | Managed reviews scope hotel |
| Admin tab Hoteles | Próximamente; sin CRUD subcategorías |

## Preparación manual del usuario hotel

1. Registro / apply hotel y aprobación admin (perfil `ACTIVE`).
2. Completar ubicación en `/hotel/editar` (mapa con coordenadas) y guardar una vez.
3. Re-ejecutar E2E para obtener `publicEventId` y test de ficha pública.

## Referencias

- Guía general: `docs/guides/SMOKE_TESTS_GUIDE.md`
- Ficha pública: Slice 11 — `GET /public/hotel-locations/by-event/:eventId`
