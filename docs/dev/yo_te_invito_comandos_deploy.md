# Yo Te Invito — Comandos básicos y guía rápida de deploy

> Documento de bolsillo para operar el VPS DonWeb de **Yo Te Invito**.
>
> **Importante:** no guardar contraseñas, tokens, `.env`, `JWT_SECRET`, `NEXTAUTH_SECRET`, claves VAPID ni credenciales de DB en este archivo.

---

## 1. Datos base del servidor

```txt
Servidor: VPS DonWeb / Dattaweb
Host: vps-6014705-x.dattaweb.com
IP: 179.43.124.145
Puerto SSH: 5230
Dominio web: https://yoteinvito.club
API: https://api.yoteinvito.club
Scanner: https://scanner.yoteinvito.club
Ruta del proyecto: /opt/yoteinvito
Usuario app/deploy: deploy
```

---

## 2. Conectarse al servidor

### Entrar como root

Usar solo para tareas administrativas del sistema:

```bash
ssh -p 5230 root@179.43.124.145
```

### Entrar como deploy

Usar para tareas del proyecto:

```bash
ssh -p 5230 deploy@179.43.124.145
```

### Cambiar de root a deploy

```bash
su - deploy
```

### Volver de deploy a root

```bash
exit
```

> Si estás en una sesión SSH y ejecutás `exit` dos veces, se cierra la conexión.

---

## 3. Rutas importantes

```bash
cd /opt/yoteinvito
cd /opt/yoteinvito/apps/api
cd /opt/yoteinvito/apps/web
cd /opt/yoteinvito/apps/scanner
```

Archivos `.env` productivos:

```txt
/opt/yoteinvito/apps/api/.env
/opt/yoteinvito/apps/web/.env.production
/opt/yoteinvito/apps/scanner/.env.production
```

Ver permisos:

```bash
ls -l /opt/yoteinvito/apps/api/.env
ls -l /opt/yoteinvito/apps/web/.env.production
ls -l /opt/yoteinvito/apps/scanner/.env.production
```

---

## 4. Estado de servicios

Servicios productivos:

```txt
yti-api
yti-web
yti-scanner
nginx
postgresql
redis-server
```

### Ver estado

```bash
sudo systemctl status yti-api --no-pager
sudo systemctl status yti-web --no-pager
sudo systemctl status yti-scanner --no-pager
sudo systemctl status nginx --no-pager
sudo systemctl status postgresql --no-pager
sudo systemctl status redis-server --no-pager
```

### Reiniciar servicios

```bash
sudo systemctl restart yti-api
sudo systemctl restart yti-web
sudo systemctl restart yti-scanner
```

### Reiniciar todo lo de la app

```bash
sudo systemctl restart yti-api yti-web yti-scanner
```

### Recargar Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 5. Logs útiles

### API

```bash
sudo journalctl -u yti-api -n 100 --no-pager
sudo journalctl -u yti-api -f
```

### Web

```bash
sudo journalctl -u yti-web -n 100 --no-pager
sudo journalctl -u yti-web -f
```

### Scanner

```bash
sudo journalctl -u yti-scanner -n 100 --no-pager
sudo journalctl -u yti-scanner -f
```

### Nginx

```bash
sudo tail -n 100 /var/log/nginx/access.log
sudo tail -n 100 /var/log/nginx/error.log
sudo tail -f /var/log/nginx/error.log
```

---

## 6. Verificar que todo responde

### Desde el VPS

```bash
curl http://localhost:3001/health
curl -I http://localhost:3000
curl -I http://localhost:3002
```

### Desde dominio real

```bash
curl -I https://yoteinvito.club
curl -I https://api.yoteinvito.club/health
curl -I https://scanner.yoteinvito.club
```

Esperado:

```txt
HTTP/2 200
```

Para API health:

```json
{"status":"ok"}
```

---

## 7. Deploy cuando hay cambios en `main`

> Usar este flujo cada vez que ya hiciste push a `main` desde GitHub.

### 7.1 Entrar al servidor

```bash
ssh -p 5230 deploy@179.43.124.145
cd /opt/yoteinvito
```

### 7.2 Ver estado antes de tocar

```bash
git status --short
git branch --show-current
git log --oneline -5
```

Si aparecen cambios locales inesperados en código, detenerse y revisar antes de hacer pull.

Es normal que puedan aparecer archivos `.env.production` como no trackeados si no están ignorados, pero **no deben commitearse**.

### 7.3 Traer cambios de `main`

```bash
git pull origin main
```

### 7.4 Instalar dependencias si cambió lockfile/package.json

Se puede ejecutar siempre para seguridad:

```bash
pnpm install --frozen-lockfile
```

### 7.5 Generar Prisma Client

```bash
cd /opt/yoteinvito/apps/api
npx prisma generate
cd /opt/yoteinvito
```

### 7.6 Build completo

```bash
pnpm build
```

Debe pasar:

```txt
shared ✅
api ✅
web ✅
scanner ✅
```

### 7.7 Ejecutar migraciones si hubo cambios Prisma

Solo si hubo nuevas migraciones o cambios de DB:

```bash
cd /opt/yoteinvito/apps/api
npx prisma migrate deploy
cd /opt/yoteinvito
```

Nunca usar en producción:

```bash
pnpm db:migrate
pnpm db:reset-dangerous
pnpm db:cleanup-content
```

### 7.8 Reiniciar servicios

```bash
sudo systemctl restart yti-api yti-web yti-scanner
```

### 7.9 Verificar servicios

```bash
sudo systemctl status yti-api --no-pager
sudo systemctl status yti-web --no-pager
sudo systemctl status yti-scanner --no-pager
```

### 7.10 Smoke rápido post-deploy

```bash
curl -I https://yoteinvito.club
curl -I https://api.yoteinvito.club/health
curl -I https://scanner.yoteinvito.club
```

También probar manualmente en navegador:

```txt
https://yoteinvito.club
https://api.yoteinvito.club/health
https://scanner.yoteinvito.club
```

---

## 8. Deploy rápido — versión compacta

```bash
ssh -p 5230 deploy@179.43.124.145
cd /opt/yoteinvito
git status --short
git pull origin main
pnpm install --frozen-lockfile
cd apps/api
npx prisma generate
npx prisma migrate deploy
cd /opt/yoteinvito
pnpm build
sudo systemctl restart yti-api yti-web yti-scanner
curl -I https://yoteinvito.club
curl -I https://api.yoteinvito.club/health
curl -I https://scanner.yoteinvito.club
```

> Usar la versión compacta solo cuando ya sepas que el cambio es seguro. Para cambios grandes, usar la guía paso a paso.

---

## 9. Comandos Prisma y seeds

### Generate

```bash
cd /opt/yoteinvito/apps/api
npx prisma generate
```

### Migraciones producción

```bash
cd /opt/yoteinvito/apps/api
npx prisma migrate deploy
```

### Seeds seguros iniciales

```bash
cd /opt/yoteinvito
pnpm --filter api run seed:subcategories
pnpm --filter api run seed:legal-documents
```

### Legal content

Usar solo si se quiere cargar borradores legales desde docs:

```bash
pnpm --filter api run seed:legal-content
```

No publicar legales finales sin revisión.

---

## 10. Usuario maestro/admin

### Inspeccionar usuario

```bash
cd /opt/yoteinvito
pnpm --filter api run user:inspect -- --email felipe.e.salom@gmail.com
```

### Restaurar/promover usuario maestro

```bash
cd /opt/yoteinvito
pnpm --filter api run user:restore-master
```

### Resetear contraseña

```bash
cd /opt/yoteinvito
pnpm --filter api run user:reset-password -- --email felipe.e.salom@gmail.com
```

### Verificar email si hace falta

```bash
cd /opt/yoteinvito
pnpm --filter api run user:verify-email -- --email felipe.e.salom@gmail.com
```

---

## 11. PostgreSQL

### Entrar como postgres

```bash
sudo -u postgres psql
```

### Entrar a la DB

```bash
sudo -u postgres psql -d yo_te_invito
```

### Ver tablas

```sql
\dt
```

### Ver tenants

```bash
sudo -u postgres psql -d yo_te_invito -c 'SELECT id, name, "isActive" FROM "Tenant";'
```

### Ver migraciones recientes

```bash
sudo -u postgres psql -d yo_te_invito -c 'SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 20;'
```

### Probar usuario app

```bash
PGPASSWORD='<DB_PASSWORD>' psql -h 127.0.0.1 -U yti_app -d yo_te_invito -c "select current_user, current_database();"
```

No pegar la password real en chats ni documentación.

---

## 12. Redis

### Ping

```bash
redis-cli ping
```

Esperado:

```txt
PONG
```

### Estado

```bash
sudo systemctl status redis-server --no-pager
```

---

## 13. Nginx

### Archivo de config

```bash
sudo nano /etc/nginx/sites-available/yoteinvito
```

### Validar config

```bash
sudo nginx -t
```

### Recargar

```bash
sudo systemctl reload nginx
```

### Reiniciar

```bash
sudo systemctl restart nginx
```

---

## 14. SSL / Certbot

### Ver certificados

```bash
sudo certbot certificates
```

### Probar renovación

```bash
sudo certbot renew --dry-run
```

### Renovar manualmente

```bash
sudo certbot renew
```

---

## 15. Firewall UFW

### Ver estado

```bash
sudo ufw status verbose
```

Puertos esperados abiertos:

```txt
5230/tcp
80/tcp
443/tcp
```

No abrir públicamente:

```txt
3000
3001
3002
5432
6379
```

---

## 16. Disco y memoria

```bash
df -h
free -h
htop
```

---

## 17. Comandos peligrosos — evitar en producción

No ejecutar salvo emergencia documentada:

```bash
pnpm db:reset-dangerous
pnpm db:cleanup-content
pnpm db:migrate
```

En producción se usa:

```bash
cd /opt/yoteinvito/apps/api
npx prisma migrate deploy
```

---

## 18. Pendientes importantes post-deploy

- Rotar contraseña root del VPS.
- Rotar password DB temporal.
- Rotar `JWT_SECRET`.
- Rotar `NEXTAUTH_SECRET`.
- Configurar SSH por key.
- Deshabilitar login root por password.
- Configurar backups automáticos `pg_dump`.
- Probar restore.
- Configurar rate limiting.
- Configurar monitoreo/logs.
- Reemplazar legales bootstrap por legales reales aprobados.
- Resolver storage de imágenes, evitando data-URL en PostgreSQL.
