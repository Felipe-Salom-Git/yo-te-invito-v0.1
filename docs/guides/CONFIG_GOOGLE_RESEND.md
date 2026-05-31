# Configuración externa — Google OAuth y Resend

Guía paso a paso para configurar Google Sign-In y el envío de emails.

---

## Google Cloud Console (OAuth)

> **Proyecto producción Yo Te Invito:** `yoteinvito-1721413433327` (nombre visible: Yoteinvito Maps). Maps, GCS y operación GCP: [`docs/deploy/GOOGLE_CLOUD_RUNBOOK.md`](../deploy/GOOGLE_CLOUD_RUNBOOK.md). OAuth puede usar el mismo proyecto o credenciales separadas según decisión.

### 1. Crear proyecto
1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Seleccionar proyecto **`yoteinvito-1721413433327`** o crear uno nuevo si aplica solo a OAuth legacy

### 2. Configurar OAuth consent screen
1. **APIs & Services** → **OAuth consent screen**
2. Tipo: **External** (o Internal si es Workspace)
3. Completar: App name, User support email, Developer contact

### 3. Crear credenciales OAuth
1. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**
2. Application type: **Web application**
3. Name: ej. "Yo Te Invito Web"
4. **Authorized JavaScript origins:**
   - `http://localhost:3000` (desarrollo)
   - `https://tudominio.com` (producción)
5. **Authorized redirect URIs:**
   - `http://localhost:3000/api/auth/callback/google` (desarrollo)
   - `https://tudominio.com/api/auth/callback/google` (producción)

### 4. Copiar credenciales
- **Client ID** → `GOOGLE_CLIENT_ID`
- **Client Secret** → `GOOGLE_CLIENT_SECRET`

### 5. Variables en el frontend (apps/web)
```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
NEXT_PUBLIC_GOOGLE_ENABLED=true
```

---

## Resend (emails)

### 1. Crear cuenta
1. Ir a [Resend](https://resend.com/) y registrarse
2. Verificar el dominio desde donde enviarás (o usar el dominio de prueba para desarrollo)

### 2. Obtener API Key
1. **API Keys** → **Create API Key**
2. Copiar la key (empieza con `re_`)

### 3. Dominio
- **Desarrollo:** Resend permite enviar a tu email verificado sin dominio propio
- **Producción:** Agregar y verificar tu dominio (DNS) para `noreply@tudominio.com`

### 4. Variables en la API (apps/api)
```env
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@onboarding.resend.dev
ADMIN_EMAIL=admin@tudominio.com
```

- `EMAIL_FROM`: remitente de los emails
- `ADMIN_EMAIL`: donde se envían notificaciones de admin (solicitudes de retiro, etc.)

### 5. URL de la app (para links en emails)
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
En producción: `https://tudominio.com`

---

## Redis (cola de emails)

Para enviar emails en background sin bloquear requests:

```env
REDIS_URL=redis://localhost:6379
```

Si no se define, los emails se envían de forma síncrona (puede tardar la respuesta).

---

## Resumen de variables

| Variable | App | Uso |
|----------|-----|-----|
| `GOOGLE_CLIENT_ID` | web | OAuth Google |
| `GOOGLE_CLIENT_SECRET` | web | OAuth Google |
| `NEXT_PUBLIC_GOOGLE_ENABLED` | web | Mostrar botón Google en login |
| `RESEND_API_KEY` | api | Envío de emails |
| `EMAIL_FROM` | api | Remitente |
| `ADMIN_EMAIL` | api | Notificaciones admin |
| `NEXT_PUBLIC_APP_URL` | api | Links en emails |
| `REDIS_URL` | api | Cola de emails (opcional) |
