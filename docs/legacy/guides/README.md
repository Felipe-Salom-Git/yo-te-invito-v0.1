# LEGACY / HISTÓRICO — Guías archivadas

> **Este directorio no representa el estado operativo actual del proyecto.**  
> **No usar para implementar nuevas funcionalidades ni para ejecutar pruebas.**

Documentación movida aquí durante la limpieza documental (2026): slices de smoke antiguos, planes de ejecución con LocalDB, roadmaps de integración demo y comparativas con el proyecto demo externo.

## Regla vigente del proyecto

- **Pago demo sí** (checkout, `demo-confirm`, tickets, QR, scanner).
- **Datos demo automáticos no** (sin `demo:seed`, sin `@demo.local` por defecto).
- **Fuente de datos:** API + PostgreSQL.
- **Usuario maestro:** `felipe.e.salom@gmail.com`.

## Dónde está la documentación vigente

| Tema | Ruta |
|------|------|
| Índice de guías | [guides/README.md](../../guides/README.md) |
| Scripts developer | [guides/DEVELOPER_SCRIPTS_GUIDE.md](../../guides/DEVELOPER_SCRIPTS_GUIDE.md) |
| Smokes y E2E | [guides/SMOKE_TESTS_GUIDE.md](../../guides/SMOKE_TESTS_GUIDE.md) |
| Eliminación demo datos | [guides/DEMO_REMOVAL.md](../../guides/DEMO_REMOVAL.md) |
| Contexto IA | [context/AI_ENTRYPOINT.md](../../context/AI_ENTRYPOINT.md) |

## Contenido de este archivo

| Carpeta | Contenido |
|---------|-----------|
| [slices-smoke/](slices-smoke/) | `SLICE_*_SMOKE_TESTS.md`, `BOOTSTRAP_SMOKE_TEST.md` |
| [execution-plans/](execution-plans/) | Planes de ejecución con referencias a LocalRepository |
| [roadmaps/](roadmaps/) | Roadmaps integración DB, mejoras fase, alineación productora demo |
| [comparativas/](comparativas/) | Comparativa demo vs proyecto actual |
