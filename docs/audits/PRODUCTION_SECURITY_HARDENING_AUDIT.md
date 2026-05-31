# Production Security Hardening Audit — VPS DonWeb

**Fecha:** 2026-05-31

## Alcance

Cierre operativo de seguridad base en VPS DonWeb:

- auditoría inicial,
- SSH hardening,
- rotación de secretos,
- permisos `.env`,
- UFW base,
- resolución de drift `UserPushSubscription`.

## Resultado

**Estado:** OK con observaciones pendientes.

## Verificaciones OK

- Servicios activos: `yti-api`, `yti-web`, `yti-scanner`, `nginx`, `postgresql`, `redis-server`.
- Web/API/Scanner responden por dominio real (`yoteinvito.club`, `api`, `scanner`).
- SSH por clave en puerto `5230` (`ssh yoteinvito`, usuario `deploy`).
- Root SSH deshabilitado; login por password deshabilitado.
- `.env` con owner `deploy:deploy` y permisos `600`.
- API con `NODE_ENV=production` y `DEV_AUTH_ENABLED=false`.
- UFW activo con reglas: `5230`, `80`, `443` (IPv4/IPv6).
- Regla global `200.58.112.191` eliminada (no era IP DonWeb).
- Secretos rotados: password root VPS, DB `yti_app`, `JWT_SECRET`, `NEXTAUTH_SECRET` (sin documentar valores).

## Hotfix aplicado

Se agregó migración:

`apps/api/prisma/migrations/20260531072000_restore_user_push_subscription/migration.sql`

**Motivo:** `schema.prisma` esperaba `UserPushSubscription`, pero producción no tenía la tabla y no existía migración previa que la creara. Prisma reportaba schema al día sin crear la tabla.

**Resultado:** API dejó de emitir errores Prisma por tabla inexistente; `GET /health` OK.

## Pendientes

- Backups automáticos a **Google Cloud Storage** — bucket `yti-prod-storage` y SA creados (Etapa A); falta script/cron y restore drill (Etapa B). Ver [`GOOGLE_CLOUD_RUNBOOK.md`](../deploy/GOOGLE_CLOUD_RUNBOOK.md).
- Bind interno de servicios `3000` / `3001` / `3002` a `127.0.0.1` (hoy UFW bloquea externamente).
- Revisión `postfix` puerto `25`.
- Revisión `snmpd` puerto `161`.
- Rate limiting Nginx/Nest.
- Monitoreo/alertas.
- Health check extendido DB/Redis.
- Legales reales (sustituir bootstrap).
- Storage imágenes; pagos reales (Getnet).

## Referencias

| Documento | Uso |
|-----------|-----|
| [`DONWEB_PRODUCTION_RUNBOOK.md`](../deploy/DONWEB_PRODUCTION_RUNBOOK.md) | §24 + §25 seguridad post-deploy |
| [`CONTEXT_PENDIENTES.md`](../context/CONTEXT_PENDIENTES.md) | Backlog producción |
| [`Yo_Te_Invito_Checklist_V2_Produccion.md`](../dev/Yo_Te_Invito_Checklist_V2_Produccion.md) | § Producción técnica |
