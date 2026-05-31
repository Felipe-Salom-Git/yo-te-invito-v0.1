# Runbook Producción técnica — DonWeb / Yo Te Invito

**Versión:** 1.1 (Slice Infra 2B — ejecución real Mayo 2026)  
**Estado:** Runbook operativo + registro de **deploy ejecutado** en VPS DonWeb. **No incluye secretos.**  
**Referencias:** [`docs/audits/PREPRODUCTION_DEPLOY_AUDIT.md`](../audits/PREPRODUCTION_DEPLOY_AUDIT.md), [`docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md`](../dev/Yo_Te_Invito_Checklist_V2_Produccion.md) § Producción técnica.

> La auditoría original asumía dominio `yoteinvito.com`; **producción actual** usa **`yoteinvito.club`**. Sustituir hosts al seguir pasos genéricos del runbook.

---

## 1. Objetivo

Proveer una guía paso a paso para aprovisionar **producción técnica** de Yo Te Invito en un **VPS DonWeb**: instalar dependencias desde cero, configurar DNS, PostgreSQL, Redis (recomendado), Nginx, TLS, variables de entorno, build de las tres apps, migraciones Prisma, seeds iniciales, usuario admin, backups, logs, smoke tests y rollback básico.

**Fuera de alcance de este runbook:**

- Pagos reales (Getnet) — mantener **provider `DEMO`** y `POST /public/payments/:id/demo-confirm`.
- Google Cloud Storage / migración de data-URL.
- Rate limiting en NestJS (slice posterior).
- Automatización CI/CD (opcional futuro).

---

## 2. Alcance

| Incluye | No incluye |
|---------|------------|
| VPS DonWeb (Ubuntu recomendado) | Contratación/pago del plan (acción cliente) |
| `apps/web`, `apps/api`, `apps/scanner` | Staging separado (misma guía, otros dominios/env) |
| PostgreSQL 16+ en el VPS o managed externo | Modificar código del monorepo |
| Redis 7+ (recomendado) | `demo:seed`, LocalDB, `@demo.local` |
| Nginx + Let's Encrypt | `pnpm db:migrate` en producción |
| Seeds: subcategorías + catálogo legal | `db:reset-dangerous` / `db:cleanup-content` en prod |
| `user:restore-master` para admin | Publicar legales sin revisión |

---

## 3. Arquitectura final esperada

### 3.1 Dominios

| Host público | Aplicación | Notas |
|--------------|------------|--------|
| `https://yoteinvito.com` | Web (Next.js) | Apex; `www` redirige a apex o sirve igual |
| `https://www.yoteinvito.com` | Web | Opcional: redirect 301 → apex |
| `https://api.yoteinvito.com` | API (NestJS) | `NEXT_PUBLIC_API_BASE_URL` |
| `https://scanner.yoteinvito.com` | Scanner PWA | HTTPS obligatorio para cámara/QR |

### 3.2 Puertos internos

| Proceso | Puerto localhost | Expuesto a internet |
|---------|------------------|---------------------|
| Web | `3000` | **No** (solo Nginx) |
| API | `3001` | **No** |
| Scanner | `3002` | **No** |
| PostgreSQL | `5432` | **No** |
| Redis | `6379` | **No** |
| Nginx | `80`, `443` | **Sí** |

> **Importante:** En producción fijar `PORT=3001` en API (el default de `main.ts` es 3001; `.env.example` documenta 4000 — **no usar 4000** salvo decisión explícita y coherente en Nginx).

### 3.3 Servicios

```text
Internet → Nginx (TLS) → web:3000 | api:3001 | scanner:3002
                              ↓
                         PostgreSQL
                              ↓
                         Redis (opcional, cola email)
                              ↓
                         Resend / VAPID (externos)
```

**Flujo de datos:** Browser → Next.js → `ApiRepository` → NestJS → Prisma → PostgreSQL.

### 3.4 Producción actual (`yoteinvito.club` — Mayo 2026)

| Dato | Valor aplicado |
|------|----------------|
| Dominio | `yoteinvito.club` |
| IP VPS | `179.43.124.145` |
| SO | Ubuntu 24.04 LTS |
| Ruta repo | `/opt/yoteinvito` |
| SSH | Puerto **5230** (UFW); no usar solo puerto 22 si se cambió |
| PostgreSQL | Local — DB `yo_te_invito`, usuario `yti_app` |
| Redis | Local |
| Tenant | `tenant-demo` — nombre «Yo Te Invito» |
| systemd | `yti-api`, `yti-web`, `yti-scanner` |
| HTTPS | Certbot / Let's Encrypt activo |

**Hosts públicos:**

| Host | Upstream |
|------|----------|
| `https://yoteinvito.club` | `127.0.0.1:3000` |
| `https://www.yoteinvito.club` | `127.0.0.1:3000` |
| `https://api.yoteinvito.club` | `127.0.0.1:3001` |
| `https://scanner.yoteinvito.club` | `127.0.0.1:3002` |

**Correo:** registros MX/SPF/DKIM/DMARC en DonWeb **no eliminados**; `autoconfig` / `autodiscover` orientados a `mail.yoteinvito.club`.

---

## 4. Pre-requisitos antes de tocar el servidor

Completar en local o con el cliente **sin SSH al VPS aún**:

- [ ] VPS DonWeb contratado (mínimo sugerido: **2 vCPU, 4 GB RAM**, 40+ GB SSD).
- [ ] Dominio `yoteinvito.com` con acceso al panel DNS DonWeb.
- [ ] Repositorio clonable en el servidor (GitHub/GitLab + deploy key o token de solo lectura).
- [ ] Secretos generados **offline** (ver §11): `JWT_SECRET`, `NEXTAUTH_SECRET` (`openssl rand -base64 32`).
- [ ] Cuenta [Resend](https://resend.com) + dominio/remitente acordado para `EMAIL_FROM`.
- [ ] Par VAPID generado (`npx web-push generate-vapid-keys`) si push en go-live.
- [ ] Decisión documentada en §5: Postgres local vs managed, Redis sí/no, email admin operativo.
- [ ] Backup de `.env` plantilla en gestor de secretos (1Password, Bitwarden, etc.) — **nunca en git**.
- [ ] Ventana de mantenimiento acordada (primera migración en BD vacía o con plan de backup).
- [ ] Leer [`PREPRODUCTION_DEPLOY_AUDIT.md`](../audits/PREPRODUCTION_DEPLOY_AUDIT.md) §14 (riesgos) y §13 (scripts prohibidos).

---

## 5. Datos que deben estar definidos

Completar esta tabla **antes** del día de deploy. No commitear valores secretos al repo.

| Dato | Valor esperado | Responsable | Estado |
|------|----------------|-------------|--------|
| Dominio principal | `yoteinvito.com` | Cliente / producto | ☐ |
| Subdominio API | `api.yoteinvito.com` | Cliente / producto | ☐ |
| Subdominio Scanner | `scanner.yoteinvito.com` | Cliente / producto | ☐ |
| IP pública del VPS | `___.___.___.___` (DonWeb panel) | Cliente / infra | ☐ |
| Usuario SSH deploy | ej. `deploy` (no root diario) | Infra | ☐ |
| Puerto SSH | `22` (o custom documentado) | Infra | ☐ |
| Sistema operativo | Ubuntu 22.04 LTS o 24.04 LTS | DonWeb al crear VPS | ☐ |
| Ruta instalación app | ej. `/var/www/yo-te-invito` | Infra | ☐ |
| Email admin / maestro | `felipe.e.salom@gmail.com` (o acordado) | Producto | ☐ |
| Email soporte (footer/VAPID) | ej. `soporte@yoteinvito.com` | Producto | ☐ |
| `EMAIL_FROM` Resend | ej. `noreply@yoteinvito.com` | Producto | ☐ |
| `ADMIN_EMAIL` alertas | email operaciones | Producto | ☐ |
| Decisión **Redis** | Sí (recomendado) / No (día 1) | Infra | ☐ |
| Decisión **PostgreSQL** | Local en VPS / Managed DonWeb u otro | Infra | ☐ |
| Decisión **storage imágenes** | Pendiente data-URL (V2 GCS) | Producto | ☐ |
| Tenant producción | `tenant-demo` (V2 actual) | Producto | ☐ |
| Rama git a desplegar | ej. `main` | Dev | ☐ |
| Pago checkout | **DEMO** (no Getnet prod) | Producto | ☐ |

---

## 6. DNS en DonWeb

En el panel DNS del dominio (DonWeb → Dominios → DNS / Zona DNS), crear o verificar:

| Tipo | Host / Nombre | Valor | TTL | Uso |
|------|---------------|-------|-----|-----|
| A | `@` | `<IP_VPS>` | 300–3600 | Apex → web vía Nginx |
| A | `www` | `<IP_VPS>` | 300–3600 | Web alternativo (o CNAME a `@`) |
| A | `api` | `<IP_VPS>` | 300–3600 | API NestJS |
| A | `scanner` | `<IP_VPS>` | 300–3600 | Scanner PWA |

**Opcional (recomendado):**

| Tipo | Host | Valor | Uso |
|------|------|-------|-----|
| CNAME | `www` | `yoteinvito.com` | Si el panel permite CNAME en www |
| AAAA | `@`, `api`, `scanner` | IPv6 del VPS | Solo si DonWeb asigna IPv6 estable |

**Verificación (desde tu PC, tras propagación):**

```bash
dig +short yoteinvito.com
dig +short api.yoteinvito.com
dig +short scanner.yoteinvito.com
```

Los tres deben resolver a la IP del VPS antes de certbot.

---

## 7. Seguridad inicial del VPS

Ejecutar como `root` o usuario con sudo en la **primera** sesión SSH. **No pegar claves privadas en tickets ni en git.**

### 7.1 Usuario deploy

```bash
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
# Pegar clave pública LOCAL en:
# /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

### 7.2 SSH key (en tu máquina local)

```bash
ssh-keygen -t ed25519 -C "deploy-yoteinvito" -f ~/.ssh/yoteinvito_deploy
ssh-copy-id -i ~/.ssh/yoteinvito_deploy.pub deploy@<IP_VPS>
```

### 7.3 Hardening SSH (posterior, tras confirmar login con deploy)

Editar `/etc/ssh/sshd_config` (conceptual):

- `PermitRootLogin no`
- `PasswordAuthentication no`
- `PubkeyAuthentication yes`

```bash
sudo systemctl reload sshd
```

> Probar **otra terminal** con `ssh deploy@<IP>` antes de cerrar la sesión root.

### 7.4 Firewall (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

**No abrir:** 3000, 3001, 3002, 5432, 6379.

### 7.5 Actualizaciones del sistema

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl git build-essential ca-certificates gnupg
```

Opcional: `unattended-upgrades` para parches de seguridad.

---

## 8. Instalación base del servidor

Asumir **Ubuntu 22.04/24.04** limpio (sin Node/Postgres preinstalados). Ejecutar como `deploy` con `sudo` donde indique.

### 8.1 Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x
npm -v
```

### 8.2 pnpm (alineado al monorepo: 9.14.x)

```bash
sudo corepack enable
corepack prepare pnpm@9.14.2 --activate
pnpm -v
```

### 8.3 Git

```bash
sudo apt install -y git
```

### 8.4 Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 8.5 PostgreSQL 16+

```bash
sudo apt install -y postgresql postgresql-contrib
psql --version   # 16+
sudo systemctl enable postgresql
```

### 8.6 Redis 7+

```bash
sudo apt install -y redis-server
redis-server --version
sudo systemctl enable redis-server
```

Configurar `bind 127.0.0.1` y `requirepass` en `/etc/redis/redis.conf` (ver §10).

### 8.7 Herramientas útiles

```bash
sudo apt install -y htop jq unzip logrotate certbot python3-certbot-nginx
```

### 8.8 Process manager: systemd vs PM2

| Criterio | **systemd (recomendado)** | PM2 |
|----------|---------------------------|-----|
| Integración OS | Nativa, arranque al boot con `enable` | Requiere `pm2 startup` |
| Logs | `journalctl -u yti-api` | `pm2 logs` |
| Dependencias extra | Ninguna | Paquete global `pm2` |
| Tres apps | Tres units: `yti-web`, `yti-api`, `yti-scanner` | Un `ecosystem.config.cjs` |
| Reinicio | `Restart=on-failure` por unit | Políticas PM2 |

**Recomendación para DonWeb:** usar **systemd** con tres servicios independientes. Facilita permisos, auditoría y no añade un supervisor Node sobre Node.

**Alternativa válida:** PM2 si el equipo de operaciones ya lo usa en otros proyectos DonWeb; documentar `ecosystem.config.cjs` en el servidor (no commitear secretos).

---

## 9. PostgreSQL producción

### 9.1 Creación de base y usuario (como postgres)

```bash
sudo -u postgres psql
```

```sql
CREATE USER yti_app WITH PASSWORD 'REEMPLAZAR_CON_PASSWORD_FUERTE';
CREATE DATABASE yo_te_invito OWNER yti_app;
GRANT CONNECT ON DATABASE yo_te_invito TO yti_app;
\c yo_te_invito
GRANT USAGE ON SCHEMA public TO yti_app;
GRANT CREATE ON SCHEMA public TO yti_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO yti_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO yti_app;
\q
```

> Ajustar permisos según política de seguridad; el usuario **no** debe ser superuser.

### 9.2 `DATABASE_URL` esperado (solo en `apps/api/.env` del servidor)

```text
DATABASE_URL="postgresql://yti_app:REEMPLAZAR_PASSWORD@127.0.0.1:5432/yo_te_invito?schema=public"
```

Si Postgres managed externo: host/puerto/SSL según proveedor (`?sslmode=require`).

### 9.3 Comandos seguros (desde el clone del repo)

```bash
cd /var/www/yo-te-invito/apps/api
npx prisma generate
npx prisma migrate deploy
```

### 9.4 Comandos prohibidos en producción

| Comando | Motivo |
|---------|--------|
| `pnpm db:migrate` | Ejecuta `prisma migrate dev` — solo desarrollo |
| `pnpm db:reset-dangerous` | Borra toda la BD |
| `pnpm db:cleanup-content` | Borra contenido masivo |
| `npx prisma migrate dev` | Crea migraciones interactivas |
| `npx prisma db push` | Sin historial de migraciones |
| `pnpm db:studio` expuesto | Riesgo de acceso a datos |

**Emergencia:** `db:cleanup-content` / `db:reset-dangerous` solo con aprobación escrita y flags `ALLOW_PRODUCTION_*` — ver auditoría; **no** forma parte del deploy normal.

### 9.5 Backup previo a primera migración

Antes de `migrate deploy` en BD que ya tenga datos:

```bash
sudo -u postgres pg_dump -Fc yo_te_invito > /var/backups/yo_te_invito_pre_migrate_$(date +%F).dump
```

---

## 10. Redis producción

### 10.1 Instalación local (VPS)

Editar `/etc/redis/redis.conf`:

```text
bind 127.0.0.1 ::1
requirepass REEMPLAZAR_REDIS_PASSWORD
maxmemory 256mb
maxmemory-policy allkeys-lru
```

```bash
sudo systemctl restart redis-server
```

### 10.2 `REDIS_URL` esperado (`apps/api/.env`)

```text
REDIS_URL=redis://:REEMPLAZAR_REDIS_PASSWORD@127.0.0.1:6379/0
```

### 10.3 Managed (alternativa)

Upstash, Redis Cloud, etc.: usar URL TLS que provea el servicio; firewall del VPS sin puerto 6379 público.

### 10.4 Cuándo puede omitirse

- **Día 1 aceptable:** API arranca sin `REDIS_URL`; emails se envían en proceso (fire-and-forget).
- **Recomendado activar antes de tráfico real:** notificaciones, registro, transferencias generan email.
- **No afecta:** login, checkout demo, listados públicos.

### 10.5 Firewall

Redis **solo** `127.0.0.1`. Verificar: `ss -tlnp | grep 6379` → `127.0.0.1:6379`.

---

## 11. Variables de entorno por app

Archivos sugeridos en servidor (permisos `600`, propietario `deploy`):

| App | Ruta |
|-----|------|
| API | `/var/www/yo-te-invito/apps/api/.env` |
| Web | `/var/www/yo-te-invito/apps/web/.env` |
| Scanner | `/var/www/yo-te-invito/apps/scanner/.env` |

Plantillas locales de referencia: `apps/*/.env.example` (sin copiar secretos al repo).

### 11.1 API

| Variable | Obligatoria | Ejemplo sin secreto | Notas |
|----------|-------------|---------------------|--------|
| `NODE_ENV` | Sí | `production` | |
| `PORT` | Sí | `3001` | Coherente con Nginx upstream |
| `DATABASE_URL` | Sí | `postgresql://yti_app:***@127.0.0.1:5432/yo_te_invito?schema=public` | |
| `JWT_SECRET` | Sí | `<openssl rand -base64 32>` | Nunca el default dev |
| `CORS_ORIGIN` | Sí | `https://yoteinvito.com,https://www.yoteinvito.com,https://scanner.yoteinvito.com` | Sin espacios |
| `DEV_AUTH_ENABLED` | Sí | `false` | **Crítico en prod** |
| `REDIS_URL` | Recomendada | `redis://:***@127.0.0.1:6379/0` | Omitir = email síncrono |
| `RESEND_API_KEY` | Recomendada | `re_***` | |
| `EMAIL_FROM` | Recomendada | `noreply@yoteinvito.com` | Dominio verificado Resend |
| `ADMIN_EMAIL` | Recomendada | `ops@yoteinvito.com` | |
| `APP_URL` | Recomendada | `https://yoteinvito.com` | Links en emails |
| `WEB_BASE_URL` | No | `https://yoteinvito.com` | QR gastro |
| `WEB_APP_URL` | No | `https://yoteinvito.com` | Referidos |
| `WEB_PUSH_VAPID_PUBLIC_KEY` | Si push | `BEl...` | Par con private |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | Si push | `(secreto)` | Solo API |
| `WEB_PUSH_CONTACT_EMAIL` | Si push | `mailto:soporte@yoteinvito.com` | |
| `NOTIFICATIONS_CRON_ENABLED` | No | `true` | `false` desactiva cron |
| `TICKET_TRANSFER_CRON_ENABLED` | No | `true` | |
| `LOG_LEVEL` | No | `info` | |
| `PUBLIC_EVENTS_TIMEZONE` | No | `America/Argentina/Buenos_Aires` | |
| `GETNET_*` | No (slice pagos) | — | **No configurar** en prod técnica demo |

### 11.2 Web

| Variable | Obligatoria | Ejemplo sin secreto | Notas |
|----------|-------------|---------------------|--------|
| `NODE_ENV` | Sí | `production` | |
| `NEXT_PUBLIC_API_BASE_URL` | Sí | `https://api.yoteinvito.com` | Sin barra final |
| `NEXTAUTH_URL` | Sí | `https://yoteinvito.com` | Debe coincidir con dominio real |
| `NEXTAUTH_SECRET` | Sí | `<openssl rand -base64 32>` | |
| `NEXT_PUBLIC_APP_URL` | Recomendada | `https://yoteinvito.com` | `metadataBase` |
| `NEXT_PUBLIC_SCANNER_APP_URL` | Recomendada | `https://scanner.yoteinvito.com/door` | Enlaces gastro |
| `NEXT_PUBLIC_DEFAULT_TENANT_ID` | No | `tenant-demo` | Legales públicos |
| `NEXT_PUBLIC_PAYMENT_PROVIDER_DEFAULT` | No | `DEMO` | **Mantener DEMO** |
| `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` | Si push | Misma pública que API | |
| `GOOGLE_CLIENT_ID` | No | `***.apps.googleusercontent.com` | OAuth opcional |
| `GOOGLE_CLIENT_SECRET` | No | `(secreto)` | |
| `NEXT_PUBLIC_GOOGLE_ENABLED` | No | `true` | Solo si OAuth activo |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | No | `AIza***` | Restringir por referrer |

### 11.3 Scanner

| Variable | Obligatoria | Ejemplo sin secreto | Notas |
|----------|-------------|---------------------|--------|
| `NODE_ENV` | Sí | `production` | |
| `NEXT_PUBLIC_API_BASE_URL` | Sí | `https://api.yoteinvito.com` | **No** usar puerto 4000 |
| `NEXT_PUBLIC_SCANNER_MODE_DEFAULT` | No | `door` | |

---

## 12. Build y start de apps

### 12.1 Clonar y dependencias

```bash
sudo mkdir -p /var/www
sudo chown deploy:deploy /var/www
cd /var/www
git clone <URL_REPO> yo-te-invito
cd yo-te-invito
git checkout <rama-produccion>
pnpm install --frozen-lockfile
```

### 12.2 Crear archivos `.env`

Copiar desde plantillas §11 en cada app; completar secretos offline.

### 12.3 Build monorepo

```bash
cd /var/www/yo-te-invito
pnpm build
```

Esto ejecuta build de `shared`, `api`, `web`, `scanner` (Nx).

### 12.4 API — start producción

```bash
cd /var/www/yo-te-invito/apps/api
npx prisma generate
# migrate deploy: ver §15 (después de backup si aplica)
node dist/main.js
```

Comando desarrollo del package: `nest start` tras `nest build`.

### 12.5 Web — start producción

```bash
cd /var/www/yo-te-invito/apps/web
pnpm exec next start -p 3000
```

### 12.6 Scanner — start producción

```bash
cd /var/www/yo-te-invito/apps/scanner
pnpm exec next start -p 3002
```

### 12.7 systemd (ejemplo conceptual)

Archivo `/etc/systemd/system/yti-api.service`:

```ini
[Unit]
Description=Yo Te Invito API
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/yo-te-invito/apps/api
EnvironmentFile=/var/www/yo-te-invito/apps/api/.env
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Análogo:

- `yti-web.service` → `WorkingDirectory=.../apps/web`, `ExecStart=/usr/bin/pnpm exec next start -p 3000`
- `yti-scanner.service` → `.../apps/scanner`, puerto `3002`

```bash
sudo systemctl daemon-reload
sudo systemctl enable yti-api yti-web yti-scanner
sudo systemctl start yti-api yti-web yti-scanner
sudo systemctl status yti-api
```

### 12.8 Logs (process manager)

```bash
journalctl -u yti-api -f
journalctl -u yti-web -f
journalctl -u yti-scanner -f
```

---

## 13. Nginx reverse proxy

Crear tres server blocks (conceptual). Rutas sugeridas: `/etc/nginx/sites-available/` + symlink en `sites-enabled`.

### 13.1 Web — `yoteinvito.com`

```nginx
server {
    listen 80;
    server_name yoteinvito.com www.yoteinvito.com;
    return 301 https://yoteinvito.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yoteinvito.com;

    # ssl_certificate /etc/letsencrypt/live/yoteinvito.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yoteinvito.com/privkey.pem;

    client_max_body_size 12m;

    access_log /var/log/nginx/yoteinvito-web.access.log;
    error_log  /var/log/nginx/yoteinvito-web.error.log;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Redirect `www` → apex en bloque separado o con `if`/`return` según preferencia.

### 13.2 API — `api.yoteinvito.com`

```nginx
server {
    listen 80;
    server_name api.yoteinvito.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yoteinvito.com;

    client_max_body_size 12m;

    access_log /var/log/nginx/yoteinvito-api.access.log;
    error_log  /var/log/nginx/yoteinvito-api.error.log;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

### 13.3 Scanner — `scanner.yoteinvito.com`

```nginx
server {
    listen 80;
    server_name scanner.yoteinvito.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name scanner.yoteinvito.com;

    client_max_body_size 12m;

    access_log /var/log/nginx/yoteinvito-scanner.access.log;
    error_log  /var/log/nginx/yoteinvito-scanner.error.log;

    gzip on;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

> `client_max_body_size 12m` alinea con body parser API **10mb** (data-URL temporal).

---

## 14. SSL / TLS

### 14.1 Certbot (Let's Encrypt)

Con Nginx escuchando en `:80` y DNS propagado:

```bash
sudo certbot --nginx -d yoteinvito.com -d www.yoteinvito.com
sudo certbot --nginx -d api.yoteinvito.com
sudo certbot --nginx -d scanner.yoteinvito.com
```

O un certificado SAN múltiple si certbot lo agrupa en una sola ejecución.

### 14.2 Renovación

```bash
sudo certbot renew --dry-run
```

Timer systemd de certbot suele instalarse automáticamente. Verificar:

```bash
systemctl list-timers | grep certbot
```

### 14.3 HSTS (posterior / controlado)

Añadir solo cuando se valide HTTPS estable en los tres hosts:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

Probar primero en staging o con `max-age=300` corto.

---

## 15. Migraciones Prisma

**Orden:** backup BD (si hay datos) → `generate` → `migrate deploy`.

### Correcto (producción)

```bash
cd /var/www/yo-te-invito/apps/api
npx prisma generate
npx prisma migrate deploy
```

### Incorrecto en producción

```bash
# NO EJECUTAR:
pnpm db:migrate
npx prisma migrate dev
npx prisma db push
pnpm db:reset-dangerous -- --confirm
pnpm db:cleanup-content -- --confirm
```

`pnpm db:migrate` en la raíz del monorepo invoca `prisma migrate dev` — solo para desarrollo local.

---

## 16. Seeds iniciales

Ejecutar **después** de `migrate deploy` exitoso.

### 16.1 Subcategorías (obligatorio en go-live técnico)

```bash
cd /var/www/yo-te-invito
pnpm --filter api run seed:subcategories
```

Idempotente; tenant `tenant-demo`; no crea usuarios ni eventos.

### 16.2 Catálogo legal (keys, sin publicar)

```bash
pnpm --filter api run seed:legal-documents
```

### 16.3 Contenido legal Markdown (opcional)

```bash
pnpm --filter api run seed:legal-content
# Opcional: --dry-run primero
# NO usar --publish sin revisión legal
```

**No publicar** documentos automáticamente en producción sin aprobación en `/admin/legales`.

### 16.4 No ejecutar en prod

```bash
# NO (salvo decisión explícita con env):
pnpm db:seed
# Requiere SEED_DEFAULT_TENANT=true — crea admin genérico, no es el flujo maestro
```

---

## 17. Usuario admin real

### 17.1 Flujo recomendado

1. Abrir `https://yoteinvito.com/register` y registrar la cuenta operativa (ej. `felipe.e.salom@gmail.com`) **o** confirmar que ya existe en BD.
2. En el servidor (con `DATABASE_URL` de prod en el entorno):

```bash
cd /var/www/yo-te-invito
pnpm --filter api run user:restore-master
```

Variables opcionales:

```bash
TEST_USER_EMAIL=felipe.e.salom@gmail.com TENANT_ID=tenant-demo pnpm --filter api run user:restore-master
```

3. **Cerrar sesión** en el navegador y volver a **iniciar sesión** (JWT debe incluir `role: ADMIN`).
4. Validar `https://yoteinvito.com/admin` (solo rol ADMIN).
5. Verificar accesos a portales desde `/profiles` si aplica usuario maestro.

`user:restore-master` **no crea** el usuario si no existe — falla con mensaje claro.

### 17.2 Prohibido

- Borrar o alterar `felipe.e.salom@gmail.com` en scripts de limpieza.
- Usar `db:cleanup-content` en producción para “resetear”.

---

## 18. Backups automáticos

> **Producción off-site (recomendado):** script `scripts/ops/backup-postgres-to-gcs.sh` + runbook [`GCS_BACKUPS_RUNBOOK.md`](./GCS_BACKUPS_RUNBOOK.md). La subsección §18.1 describe backup **local** histórico (`pg_dump -Fc` en disco) como referencia complementaria.

### 18.1 Estrategia `pg_dump` (local en disco — referencia)

Script diario (ej. `/usr/local/bin/yti-pg-backup.sh`):

```bash
#!/bin/bash
set -euo pipefail
BACKUP_DIR=/var/backups/yo-te-invito
mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d_%H%M%S)
sudo -u postgres pg_dump -Fc yo_te_invito > "$BACKUP_DIR/yo_te_invito_${STAMP}.dump"
find "$BACKUP_DIR" -name '*.dump' -mtime +14 -delete
```

```bash
sudo chmod 700 /var/backups/yo-te-invito
```

### 18.2 Retención sugerida

| Ventana | Retención |
|---------|-----------|
| Diarios | 14 días en disco |
| Semanal | 4 copias (copiar manual o segundo cron) |
| Mensual | 3 meses off-site (S3, otro VPS, DonWeb backup si existe) |

### 18.3 Cifrado y ubicación

- Comprimir/cifrar dumps antes de subir off-site (`gpg -c` o herramienta del proveedor).
- **No** commitear dumps al repositorio git.

### 18.4 Prueba de restore (obligatoria)

En entorno aislado o antes de go-live:

```bash
createdb yo_te_invito_restore_test
pg_restore -d yo_te_invito_restore_test /var/backups/yo-te-invito/yo_te_invito_YYYYMMDD.dump
```

Documentar tiempo de restore y tamaño (data-URL infla dumps).

---

## 19. Logs y monitoreo

| Fuente | Ubicación / comando |
|--------|---------------------|
| API | `journalctl -u yti-api -f` |
| Web | `journalctl -u yti-web -f` |
| Scanner | `journalctl -u yti-scanner -f` |
| Nginx | `/var/log/nginx/yoteinvito-*.access.log` |
| PostgreSQL | `/var/log/postgresql/` |
| Redis | `/var/log/redis/` |

### 19.1 Health check

```bash
curl -sS https://api.yoteinvito.com/health
# Esperado: {"status":"ok"}
```

> No valida conexión a BD; suficiente para uptime básico.

### 19.2 Uptime web

```bash
curl -sS -o /dev/null -w "%{http_code}" https://yoteinvito.com/
```

### 19.3 Alertas mínimas (manual o herramienta externa)

- Disco > 80 % (`df -h`).
- Certificado TLS < 14 días (`certbot certificates`).
- Servicio caído (`systemctl is-active yti-api`).
- 5xx en logs Nginx (grep periódico o Uptime Kuma / Better Stack).

---

## 20. Hardening mínimo

| Control | Acción |
|---------|--------|
| Firewall | UFW: solo 22, 80, 443 |
| CORS | `CORS_ORIGIN` solo dominios reales |
| Dev auth | `DEV_AUTH_ENABLED=false` |
| Secretos | `JWT_SECRET`, `NEXTAUTH_SECRET` únicos y fuertes |
| DB/Redis | Solo localhost |
| SSH | Claves, sin password root |
| Rate limit Nginx | Ver §20.1 |
| Rate limit Nest | Pendiente slice código |
| Pago | Mantener **DEMO**; no habilitar Getnet prod |
| Headers | `X-Frame-Options`, `X-Content-Type-Options` en Nginx (opcional) |

### 20.1 Rate limiting Nginx (básico)

Dentro del `http` block o por `location` en API:

```nginx
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;

location /auth/login {
    limit_req zone=auth_limit burst=10 nodelay;
    proxy_pass http://127.0.0.1:3001;
    # ... headers proxy ...
}
```

Ajustar límites según tráfico esperado.

---

## 21. Smoke test post-deploy

Ejecutar **después** de TLS y servicios activos. **No** ejecutar smokes destructivos en producción.

### 21.1 API health

```bash
curl -sS https://api.yoteinvito.com/health
```

### 21.2 Web y scanner

- Abrir `https://yoteinvito.com` — home o gateway carga.
- Abrir `https://scanner.yoteinvito.com` — UI scanner carga (login si aplica).

### 21.3 CORS / login manual

1. `https://yoteinvito.com/login` — credenciales cuenta admin.
2. Consola del navegador: sin errores CORS hacia `api.yoteinvito.com`.
3. Tras login: acceso a `/me` o `/profiles`.

### 21.4 Admin

- `https://yoteinvito.com/admin` — dashboard admin visible.
- `https://yoteinvito.com/admin/categorias` — subcategorías presentes (post `seed:subcategories`).

### 21.5 Checkout demo (sin pago real)

- Flujo checkout con provider **DEMO** — confirmar que `demo-confirm` sigue operativo (no eliminar).

### 21.6 Smoke read-only (desde operador, opcional)

Con API en prod y credenciales **reales** (no `@smoke.yo-te-invito.test`):

```bash
API_BASE_URL=https://api.yoteinvito.com \
SMOKE_USER_EMAIL=<email-real> \
SMOKE_USER_PASSWORD=<password> \
pnpm --filter api run smoke:api
```

**No ejecutar en prod:**

- `smoke:user-portal` (crea artefactos)
- `smoke:cleanup` sin política clara
- `SMOKE_ALLOW_DESTRUCTIVE=1`

### 21.7 Scanner físico (recomendado)

Dispositivo móvil en `https://scanner.yoteinvito.com` — probar lectura QR ticket `yti:v1:` en puerta (staging o evento de prueba).

---

## 22. Rollback básico

### 22.1 Antes de cada deploy con migración

```bash
sudo -u postgres pg_dump -Fc yo_te_invito > /var/backups/pre_deploy_$(date +%F_%H%M).dump
```

### 22.2 Revertir aplicación (sin migración hacia adelante)

1. `git checkout <commit-anterior>` en `/var/www/yo-te-invito`.
2. `pnpm install && pnpm build`.
3. Restaurar copias de `.env` guardadas (`api.env.bak`, etc.).
4. `sudo systemctl restart yti-api yti-web yti-scanner`.

### 22.3 Revertir Nginx

```bash
sudo cp /etc/nginx/sites-available/<backup> /etc/nginx/sites-available/yti.conf
sudo nginx -t && sudo systemctl reload nginx
```

### 22.4 Revertir migración Prisma

Prisma **no** tiene rollback automático. Opciones:

- Restaurar dump `pg_restore` a BD nueva y cambiar `DATABASE_URL` (ventana mantenimiento).
- Aplicar migración correctiva forward (desarrollo en local, luego `migrate deploy`).

**Por eso el backup previo a `migrate deploy` es obligatorio.**

### 22.5 Conservar builds

Mantener al menos un directorio `releases/YYYYMMDD-HHMM` o tag git desplegado documentado en runbook interno.

---

## 23. Checklist operativo final

Marcar en el día del deploy (no commitear estados al repo).

### Fase A — Cliente / DNS

- [ ] VPS DonWeb activo con IP anotada en §5
- [ ] Registros DNS `@`, `www`, `api`, `scanner` → IP VPS
- [ ] `dig` confirma propagación

### Fase B — Servidor base

- [ ] SSH con usuario `deploy` y clave
- [ ] `apt update && upgrade`
- [ ] UFW configurado
- [ ] Node 20 + pnpm 9.14 instalados
- [ ] Nginx, PostgreSQL 16+, Redis instalados

### Fase C — Datos

- [ ] BD `yo_te_invito` + usuario `yti_app`
- [ ] Redis con password y bind local
- [ ] `.env` API / web / scanner creados (permisos 600)
- [ ] Backup vacío o pre-migrate guardado

### Fase D — Aplicación

- [ ] Repo clonado en `/var/www/yo-te-invito`
- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm build`
- [ ] `npx prisma generate && npx prisma migrate deploy` en `apps/api`
- [ ] `seed:subcategories` + `seed:legal-documents`
- [ ] systemd units habilitadas y servicios en verde

### Fase E — Edge

- [ ] Nginx server blocks para web, api, scanner
- [ ] Certbot TLS en los tres hosts
- [ ] `curl` health API OK

### Fase F — Operación

- [ ] Usuario registrado + `user:restore-master`
- [ ] Logout/login + `/admin` OK
- [ ] Cron backup `pg_dump` programado
- [ ] Prueba restore documentada
- [ ] Smoke §21 completado
- [ ] Checklist V2 § Producción técnica — marcar ítems solo cuando cada paso esté **realmente** hecho

---

## 24. Ejecución real — Mayo 2026 (Infra 2B)

Registro de lo ejecutado en VPS DonWeb. Sin passwords ni tokens.

### 24.1 Infraestructura completada

- VPS DonWeb operativo; Ubuntu 24.04 LTS; IP `179.43.124.145`.
- DNS en DonWeb: `yoteinvito.club`, `www`, `api`, `scanner` → IP del VPS.
- Stack: Node 20, npm, pnpm 9.14.2, Nginx, PostgreSQL 16, Redis, UFW.
- Puertos públicos: SSH **5230**, HTTP 80, HTTPS 443.
- Puertos **no** expuestos: 3000, 3001, 3002, 5432, 6379.

### 24.2 Base de datos y migraciones

```bash
cd /opt/yoteinvito/apps/api
npx prisma generate
npx prisma migrate deploy
```

- **No** se usó `pnpm db:migrate` en producción.
- Tras fix en repo (`NotificationKind` creado antes de `ALTER TYPE`), deploy desde DB vacía aplicó **69 migraciones**.

### 24.3 Seeds y legales bootstrap

```bash
cd /opt/yoteinvito
pnpm --filter api run seed:subcategories
pnpm --filter api run seed:legal-documents
```

- Registro admin bloqueado por legales obligatorios sin versión publicada → se publicó **contenido legal bootstrap temporal** (no es redacción final aprobada).
- Reemplazar desde `/admin/legales` antes de considerar producción cerrada.

### 24.4 Build y servicios

```bash
cd /opt/yoteinvito
pnpm build   # shared, api, web, scanner — OK
```

- systemd: `yti-api` (:3001), `yti-web` (:3000), `yti-scanner` (:3002) — activos.
- Verificación local: `curl http://localhost:3001/health`, `curl -I` web/scanner.

### 24.5 Nginx y TLS

- Reverse proxy según §3.4; Certbot; HTTPS operativo en los cuatro hosts.

### 24.6 Admin maestro

- Usuario: `felipe.e.salom@gmail.com` — operativo tras registro + `user:restore-master` + re-login.
- Acceso `/admin` verificado.

### 24.7 Incidentes resueltos durante el deploy (repo)

| Tema | Resolución |
|------|------------|
| Prisma Client | `npx prisma generate` antes de build/API |
| Scanner `ScanHistoryItem` | Tipado explícito en `door/page.tsx` |
| Web métricas referidos | Imports desde `@yo-te-invito/shared` |
| Migración `NotificationKind` | Enum idempotente antes de `ALTER TYPE` |
| Registro bloqueado | Legal bootstrap temporal publicado |

### 24.8 Pendientes post-deploy (actualizado tras hardening Mayo 2026)

| Prioridad | Pendiente | Estado |
|-----------|-----------|--------|
| ~~Crítica~~ | Rotar password root VPS, DB `yti_app`, `JWT_SECRET`, `NEXTAUTH_SECRET` | **Cerrado** §25.2 |
| ~~Crítica~~ | SSH por clave; deshabilitar root/password | **Cerrado** §25.1 |
| ~~Alta~~ | `.env` 600, `DEV_AUTH_ENABLED=false`, UFW base | **Cerrado** §25.3 |
| Alta | Backups → GCS | **Cerrado** 2026-05-31 — ver §25.4 |
| Alta | Legales reales en admin (sustituir bootstrap) | Pendiente |
| Alta | Smoke E2E dominio real (checkout **DEMO**, scanner QR) | Pendiente |
| Media | Rate limiting Nginx + Nest; monitoreo/alertas | Pendiente |
| Media | Bind apps `3000`/`3001`/`3002` a `127.0.0.1`; revisar postfix `:25`, snmpd `:161` | Pendiente |
| Media | `certbot renew --dry-run`; health DB/Redis | Pendiente |
| Baja | Resend producción; VAPID push; GCS imágenes; Getnet | Pendiente |

**Pagos:** provider **`DEMO`** mantenido; Getnet no activado.

---

## 25. Seguridad post-deploy — cerrado (Mayo 2026)

Registro del cierre operativo de hardening en VPS DonWeb. Sin passwords ni tokens. Detalle: [`PRODUCTION_SECURITY_HARDENING_AUDIT.md`](../audits/PRODUCTION_SECURITY_HARDENING_AUDIT.md).

### 25.1 SSH hardening — cerrado

- Acceso operativo: `ssh yoteinvito` (alias/config local del operador).
- Usuario: `deploy`.
- Puerto: `5230`.
- Autenticación solo por clave (`PubkeyAuthentication yes`).
- Login root por SSH deshabilitado (`PermitRootLogin no`).
- Login por password deshabilitado (`PasswordAuthentication no`, `KbdInteractiveAuthentication no`).
- `ssh.socket` deshabilitado; `ssh.service` habilitado y activo.
- SSH escucha solo en `5230` (IPv4/IPv6); puerto `22` ya no escucha.

### 25.2 Rotación de secretos — cerrado

- Password root VPS rotada.
- Password DB `yti_app` rotada.
- `JWT_SECRET` rotado.
- `NEXTAUTH_SECRET` rotado.
- Validado: `GET /health`, web/scanner `200`, login admin OK.
- Sesiones emitidas antes de la rotación pueden requerir re-login.

### 25.3 Env / UFW hardening — cerrado

| Archivo | Owner | Permisos |
|---------|-------|------------|
| `/opt/yoteinvito/apps/api/.env` | `deploy:deploy` | `600` |
| `/opt/yoteinvito/apps/web/.env.production` | `deploy:deploy` | `600` |
| `/opt/yoteinvito/apps/scanner/.env.production` | `deploy:deploy` | `600` |

- API: `NODE_ENV=production`, `DEV_AUTH_ENABLED=false` (explícito).
- UFW activo: `deny incoming`, `allow outgoing`; permite `5230/tcp`, `80/tcp`, `443/tcp` (+ IPv6).
- Regla global `ufw allow from 200.58.112.191` eliminada (DonWeb confirmó que no era su IP).
- Puertos internos no expuestos por UFW: `3000`, `3001`, `3002`, `5432`, `6379`.

**Observaciones (slice posterior):** `yti-api` / `yti-web` / `yti-scanner` siguen escuchando en `*:3001` / `*:3000` / `*:3002`; ideal bind `127.0.0.1`. Revisar `postfix` (`25`) y `snmpd` (`161`).

### 25.4 Backups PostgreSQL → GCS — operativo (2026-05-31)

**Infra GCS:** bucket privado `yti-prod-storage`, SA `yti-backend-storage` — [`GOOGLE_CLOUD_RUNBOOK.md`](./GOOGLE_CLOUD_RUNBOOK.md).

| Artefacto | Ubicación |
|-----------|-----------|
| Script | `scripts/ops/backup-postgres-to-gcs.sh` |
| Runbook | [`GCS_BACKUPS_RUNBOOK.md`](./GCS_BACKUPS_RUNBOOK.md) |
| Credencial SA (VPS) | `/opt/yoteinvito/secrets/gcp-yti-backend-storage.json` (`600`) |
| Env backup | `/opt/yoteinvito/.ops/backup-gcs.env` (`600`) |
| `.pgpass` | `/home/deploy/.pgpass` (`600`) |
| Timer systemd | `yti-postgres-backup.timer` — **diario 03:30** |
| Destino GCS | `gs://yti-prod-storage/backups/postgres/YYYY/MM/` |

**Ejecución confirmada (2026-05-31):**

- Backup manual: `yo_te_invito_20260531_082114.sql.gz` (+ `.sha256`)
- Backup vía systemd: `yo_te_invito_20260531_082817.sql.gz` (+ `.sha256`)
- Restore drill OK en `yo_te_invito_restore_test` (`User`: 2, `Tenant`: 1, `Event`: 0)

**Pendiente:** lifecycle / retención automática en bucket (`backups/postgres/`).

> §18 describe backup local histórico (`pg_dump -Fc` en disco). Producción off-site usa el script GCS anterior.

### 25.5 Hotfix migración `UserPushSubscription`

Durante rotación de secretos se detectó drift: modelo en `schema.prisma`, API esperaba tabla, prod sin tabla y sin migración previa.

- Migración repo: `apps/api/prisma/migrations/20260531072000_restore_user_push_subscription/migration.sql`
- Idempotente (`CREATE TABLE IF NOT EXISTS`, FKs con manejo `duplicate_object`).
- Producción: aplicada con `npx prisma migrate deploy`; `GET /health` OK.

---

## Referencias cruzadas

| Documento | Uso |
|-----------|-----|
| [`PREPRODUCTION_DEPLOY_AUDIT.md`](../audits/PREPRODUCTION_DEPLOY_AUDIT.md) | Variables, riesgos, arquitectura |
| [`PRODUCTION_SECURITY_HARDENING_AUDIT.md`](../audits/PRODUCTION_SECURITY_HARDENING_AUDIT.md) | SSH, secretos, UFW, hotfix `UserPushSubscription` |
| [`GOOGLE_CLOUD_RUNBOOK.md`](./GOOGLE_CLOUD_RUNBOOK.md) | Proyecto GCP, GCS, Maps key, GSC, slices Etapa B |
| [`GCS_BACKUPS_RUNBOOK.md`](./GCS_BACKUPS_RUNBOOK.md) | Backups PostgreSQL → GCS (instalación VPS, timer, restore drill) |
| [`DEVELOPER_SCRIPTS_GUIDE.md`](../guides/DEVELOPER_SCRIPTS_GUIDE.md) | Comandos npm detallados |
| [`SMOKE_TESTS_GUIDE.md`](../guides/SMOKE_TESTS_GUIDE.md) | Variables `SMOKE_*` |
| [`SCRIPTS.md`](../dev/SCRIPTS.md) | Tabla riesgo scripts |
| [`CONFIG_GOOGLE_RESEND.md`](../guides/CONFIG_GOOGLE_RESEND.md) | Resend + OAuth |
| [`CONTEXT_PENDIENTES.md`](../context/CONTEXT_PENDIENTES.md) | Backlog infra |

---

**Siguiente bloque recomendado:** upload storage real + Maps en web + SEO/GSC ([`GOOGLE_CLOUD_RUNBOOK.md`](./GOOGLE_CLOUD_RUNBOOK.md) §6); lifecycle backups GCS; hardening fino VPS, rate limiting, monitoreo, legales reales.
