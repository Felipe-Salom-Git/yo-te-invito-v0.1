# V3.1 Etapa 5 — Slice 5.2 — Scanner users from portals smoke

## Objetivo

Validar creación de usuarios scanner desde portales productora/gastro, activación/desactivación y reset de contraseña.

## Endpoints (Slice 5.2)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/producer/scanners` | Productora | Crea usuario `SCANNER` + `ScannerAccount` |
| PATCH | `/producer/scanners/:accountId` | Productora | Activa/desactiva (`isActive` + `User.status`) |
| POST | `/producer/scanners/:accountId/reset-password` | Productora | Resetea contraseña (opcional o temporal) |
| POST | `/gastro/scanners` | Gastro owner | Igual para perfil gastro |
| PATCH | `/gastro/scanners/:accountId` | Gastro owner | Igual |
| POST | `/gastro/scanners/:accountId/reset-password` | Gastro owner | Igual |

## UI

| Ruta | Descripción |
|------|-------------|
| `/producer/scanners` | Panel `ScannerUsersPanel` |
| `/gastro/scanners` | Panel `ScannerUsersPanel` |

Nav: `portalNavConfig.ts` — ítem «Scanners».

## Comando

```bash
pnpm --filter shared run build
cd apps/api && npx prisma migrate deploy
pnpm --filter api run smoke:v31-scanner-accounts
```

## Checks (smoke extendido)

| Check | Esperado |
|-------|----------|
| `createForProducer` | Usuario SCANNER + cuenta vinculada |
| Sin password en body | `temporaryPassword` en respuesta |
| `updateProducerAccountStatus(false)` | `isActive: false`, user SUSPENDED |
| Reactivar | `isActive: true`, user ACTIVE |
| `resetProducerPassword` | Nueva `temporaryPassword` |
| Rol SCANNER crea scanner | Forbidden |
| Email duplicado | 409 Conflict |

## Pendiente (slices posteriores)

- Slice 5.3: CTA instalar Scanner PWA en portales.
- Slice 5.7: Scope estricto en `/scanner/scan`.
- Admin reset desde `/admin/usuarios` (opcional).
