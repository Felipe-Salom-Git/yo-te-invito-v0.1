# Guías vigentes — Yo Te Invito

Índice de documentación **operativa** para desarrollo y QA. Todo lo histórico está en [docs/legacy/guides/](../legacy/guides/README.md).

## Reglas del proyecto

```txt
Pago demo sí.
Datos demo automáticos no.
```

| Concepto | Detalle |
|----------|---------|
| **Pago demo** | Checkout con provider `DEMO` y `demo-confirm` — sirve para probar órdenes, tickets, QR y scanner sin Getnet/MP |
| **Datos demo** | No usar `demo:seed`, usuarios `@demo.local` ni LocalDB como fuente de datos |
| **Usuario maestro** | `felipe.e.salom@gmail.com` — preservado por `pnpm db:cleanup-content` |
| **Datos reales** | API NestJS + PostgreSQL; web con `ApiRepository` |

---

## Empezar aquí

| Guía | Para qué |
|------|----------|
| **[DEVELOPER_SCRIPTS_GUIDE.md](./DEVELOPER_SCRIPTS_GUIDE.md)** | Manual de comandos npm (desarrollo, DB, usuario, smokes) |
| **[SMOKE_TESTS_GUIDE.md](./SMOKE_TESTS_GUIDE.md)** | Smokes API, E2E Playwright, door-scan, variables `SMOKE_*` / `E2E_*` |
| **[DEMO_REMOVAL.md](./DEMO_REMOVAL.md)** | Qué se quitó de seeds demo y qué se mantiene |
| **[DEVELOPER_USERS.md](./DEVELOPER_USERS.md)** | Cuentas, roles, entorno local, herramientas de usuario |

---

## Flujos y producto

| Guía | Tema |
|------|------|
| [GUIA_PRUEBAS_FLUJOS_Y_API.md](./GUIA_PRUEBAS_FLUJOS_Y_API.md) | Flujos manuales contra la API |
| [DEMO_CURL_FLOW.md](./DEMO_CURL_FLOW.md) | Pago demo con curl |
| [REVISION_LOGIN_Y_CONECTIVIDAD.md](./REVISION_LOGIN_Y_CONECTIVIDAD.md) | Login NextAuth + API |
| [CONFIG_GOOGLE_RESEND.md](./CONFIG_GOOGLE_RESEND.md) | Google OAuth y Resend |
| [USER_PORTAL_NOTIFICATIONS.md](./USER_PORTAL_NOTIFICATIONS.md) | Notificaciones portal V2 |

---

## Roadmaps activos (no legacy)

| Guía | Tema |
|------|------|
| [ROADMAP_REGISTRO_AUTH_EMAIL.md](./ROADMAP_REGISTRO_AUTH_EMAIL.md) | Registro, auth social, emails |
| [ROADMAP_PENDIENTES_OPCIONALES.md](./ROADMAP_PENDIENTES_OPCIONALES.md) | Backlog opcional |

---

## Plantillas de código / IA

[templates/TEMPLATES_GUIDE_ES.md](./templates/TEMPLATES_GUIDE_ES.md) — plantillas para endpoints, servicios, componentes y prompts.

---

## Referencia técnica (IA / tabla rápida)

[docs/dev/SCRIPTS.md](../dev/SCRIPTS.md) — inventario compacto; la guía en español es [DEVELOPER_SCRIPTS_GUIDE.md](./DEVELOPER_SCRIPTS_GUIDE.md).

---

## Contexto para herramientas de IA

Leer primero: [docs/context/AI_ENTRYPOINT.md](../context/AI_ENTRYPOINT.md).
