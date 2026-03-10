# Roadmap — Registro, Auth Social y Emails

**Fecha:** 2025-03-06  
**Objetivo:** Formularios de registro (usuarios, productoras, gastro), login con Google, y servicio de emails para la aplicación.

---

## Fases

| Fase | Descripción | Estado |
|------|-------------|--------|
| **F1** | Registro de usuarios normales (USER) | Pendiente |
| **F2** | Registro / solicitud productoras y gastro | Pendiente |
| **F3** | Login con Google (OAuth) | Pendiente |
| **F4** | Infraestructura de emails | Pendiente |
| **F5** | Emails en flujos (registro, pago, payout) | Pendiente |

---

## F1 — Registro de usuarios normales

**Objetivo:** Cualquier visitante puede registrarse como USER (comprador) con email + contraseña.

### Slice 1.1 — API: POST /auth/register

- **Backend:** `AuthController.register`, `AuthService.register`
- Body: `{ email, password, firstName, lastName, tenantId? }`
- Validación: email único por tenant, password mínimo 6 caracteres
- Hash con scrypt (reutilizar lógica de demo-seed)
- Crear User con role USER, status ACTIVE
- **Shared:** `authRegisterRequestSchema`, `authRegisterResponseSchema`

### Slice 1.2 — Frontend: /register

- Página `app/(auth)/register/page.tsx`
- Formulario: email, contraseña, confirmar contraseña, nombre, apellido
- Validación con Zod, mensajes en español
- Con USE_API: POST a `/auth/register`
- Con LocalStorage: crear en dynamic-users (o LocalDB si aplica)
- Redirección a login con mensaje "Cuenta creada. Iniciá sesión."

### Slice 1.3 — Links y flujo

- En `/login`: link "Crear cuenta"
- En `/home` (navbar): si no hay sesión, mostrar "Registrarse" además de "Iniciar sesión"

---

## F2 — Registro / solicitud productoras y gastro

**Objetivo:** Usuarios pueden solicitar ser PRODUCER_OWNER o GASTRO_OWNER. Admin aprueba.

### Slice 2.1 — Modelo de solicitud (Prisma)

- `ProducerApplication` o `RoleApplication`: id, userId, email, firstName, lastName, phone?, businessName?, role (PRODUCER_OWNER | GASTRO_OWNER), status (PENDING | APPROVED | REJECTED), createdAt
- Migración
- Alternativa más simple: usuario se registra como USER, luego admin cambia rol en /admin/usuarios (ya existe). En ese caso, F2 sería solo "formulario de solicitud" que crea User con status PENDING y rol solicitado, y admin aprueba cambiando status.

### Slice 2.2 — API: solicitud de alta

- `POST /auth/apply-producer` o `POST /auth/apply-role`
- Body: `{ email, password, firstName, lastName, phone?, businessName?, role: 'PRODUCER_OWNER' | 'GASTRO_OWNER' }`
- Crea User con status PENDING (o enum APPLICATION_PENDING)
- Requiere: nuevo enum o campo `applicationStatus`

### Slice 2.3 — Frontend: /register/producer, /register/gastro

- Formularios específicos con campos extra (razón social, teléfono)
- Mensaje: "Tu solicitud fue enviada. Te avisaremos cuando sea aprobada."
- Admin: listado de solicitudes pendientes, aprobar/rechazar

**Nota:** Si se prefiere simplificar, F2 puede reducirse a "registro como USER + admin asigna rol manualmente". El roadmap deja ambas opciones documentadas.

---

## F3 — Login con Google (OAuth)

**Objetivo:** Opción de iniciar sesión o registrarse con cuenta de Google.

### Slice 3.1 — NextAuth: Google Provider

- Añadir `GoogleProvider` en `authOptions`
- Variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Crear proyecto en Google Cloud Console, OAuth 2.0, redirect URIs para dev y prod

### Slice 3.2 — Callback: crear usuario si no existe

- En callback `signIn` o `jwt`: si el usuario de Google no existe en DB, crearlo (USER) con emailVerified
- Requiere: `User` con `passwordHash` nullable (ya existe) y `emailVerified` (ya existe)
- Para API: `AuthService.findOrCreateFromGoogle(profile)` — buscar por email, si no existe crear

### Slice 3.3 — UI login

- En `/login`: botón "Continuar con Google"
- Mantener formulario email/password para credenciales

### Slice 3.4 — TenantId para OAuth

- Usuarios de Google: asignar `tenantId` por defecto (tenant-demo o configurable)
- Productores/gastro por Google: flujo igual que F2 (solicitud, admin aprueba)

---

## F4 — Infraestructura de emails

**Objetivo:** Servicio de envío de emails configurado y listo para usar.

### Slice 4.1 — Proveedor de email

- **Opciones:** Resend, SendGrid, Nodemailer (SMTP)
- **Recomendación:** Resend (API simple, tier gratuito generoso) o Nodemailer si ya hay SMTP
- Módulo `EmailModule` en API: `EmailService.send({ to, subject, html, text? })`
- Variable: `RESEND_API_KEY` o `SMTP_*`

### Slice 4.2 — Plantillas base

- Layout HTML: logo, footer, estilos mínimos
- Función `renderWelcomeEmail(name)`, `renderOrderConfirmation(orderId, eventTitle)`, etc.
- Ubicación: `apps/api/src/email/templates/` o similar

### Slice 4.3 — Queue (opcional)

- Para no bloquear requests: Bull/BullMQ con Redis, o enviar en background sin cola (más simple)
- Fase inicial: envío síncrono; luego migrar a cola si hace falta

---

## F5 — Emails en flujos

**Objetivo:** Enviar emails en los momentos clave.

### Slice 5.1 — Email al registrarse

- Tras crear usuario en `POST /auth/register`: enviar "Bienvenido a Yo Te Invito"
- Incluir: nombre, link a /home, soporte (contact de platformConfig)

### Slice 5.2 — Email al confirmar orden/pago

- Tras `confirmDemoPayment` o pago real: enviar "Tu compra fue confirmada"
- Incluir: resumen de orden, tickets, link a /me/tickets

### Slice 5.3 — Email al solicitar payout

- Tras crear PayoutRequest: email a admin o a plataforma
- Opcional: email al productor "Recibimos tu solicitud de retiro"

### Slice 5.4 — Email de verificación (opcional)

- Si se exige email verificado: enviar link con token al registrarse
- Cambiar `emailVerified` al hacer click
- Puede dejarse para fase posterior

---

## Dependencias entre fases

```
F1 (registro USER) ──────────────────────────┐
                                             ├──> F4 (emails) ──> F5 (emails en flujos)
F2 (productoras/gastro) ─────────────────────┘
F3 (Google) ─────────────────────────────────┘
```

F4 y F5 pueden empezar en paralelo a F1–F3 una vez definido el proveedor de email.

---

## Variables de entorno

| Variable | Uso |
|----------|-----|
| `GOOGLE_CLIENT_ID` | OAuth Google |
| `GOOGLE_CLIENT_SECRET` | OAuth Google |
| `RESEND_API_KEY` o `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Emails |
| `NEXT_PUBLIC_APP_URL` | Links en emails (base URL) |
| `EMAIL_FROM` | Remitente (ej. noreply@yoteinvito.com) |

---

## Referencias

- NextAuth: https://next-auth.js.org/providers/google
- Resend: https://resend.com/docs
- `ROLES_OBJECTIVES_SPEC.md`
- `lib/auth/config.ts`, `auth.service.ts`
