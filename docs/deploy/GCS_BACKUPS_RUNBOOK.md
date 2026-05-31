# Runbook — Backups PostgreSQL → Google Cloud Storage

**Estado:** **operativo en VPS** (cerrado 2026-05-31). Lifecycle `backups/postgres/` configurado (delete 30 días).

> **Regla:** no commitear JSON de service account, passwords de BD ni dumps. Solo nombres, IDs y rutas documentales.

**Producción:** VPS DonWeb · `/opt/yoteinvito` · usuario `deploy` · BD `yo_te_invito` · bucket privado `gs://yti-prod-storage` · prefijo `backups/postgres` · SA `yti-backend-storage@yoteinvito-1721413433327.iam.gserviceaccount.com`

---

## 0. Ejecución real en VPS (2026-05-31)

| Ítem | Estado |
|------|--------|
| Google Cloud CLI en VPS | OK |
| Key JSON SA | `/opt/yoteinvito/secrets/gcp-yti-backend-storage.json` (`600`, `deploy:deploy`) |
| `.pgpass` | `/home/deploy/.pgpass` (`600`) |
| Env backup | `/opt/yoteinvito/.ops/backup-gcs.env` (`600`) |
| Conexión PostgreSQL `yti_app` | OK |
| Primer backup manual | OK → `gs://yti-prod-storage/backups/postgres/2026/05/yo_te_invito_20260531_082114.sql.gz` + `.sha256` |
| Checksum manual | Validado |
| systemd service | `/etc/systemd/system/yti-postgres-backup.service` |
| systemd timer | `/etc/systemd/system/yti-postgres-backup.timer` — **diario 03:30** |
| Backup vía systemd (manual + timer) | OK → `yo_te_invito_20260531_082817.sql.gz` + `.sha256` |
| Restore drill | OK — DB temporal `yo_te_invito_restore_test`; `"User"`: 2, `"Tenant"`: 1, `"Event"`: 0; DB eliminada al finalizar |

**Nota checksum:** backups del 2026-05-31 pueden tener `.sha256` con ruta absoluta local. Tras actualizar el script en VPS (`git pull`), los nuevos backups generan `.sha256` con **basename** portable (`sha256sum -c archivo.sql.gz.sha256` funciona en cualquier carpeta de descarga).

**Lifecycle (GCP):** regla `Delete` · `age: 30` · `matchesPrefix: backups/postgres/` — aplicada en consola.

**Upload de imágenes:** fuera de alcance — ver [`GCS_STORAGE_STRATEGY.md`](./GCS_STORAGE_STRATEGY.md). No mezclar assets públicos en este bucket.

---

## 1. Objetivo

Automatizar copias de seguridad de PostgreSQL desde el VPS productivo hacia Google Cloud Storage, con checksum verificable y procedimiento de restore drill en base de datos **temporal** (nunca sobre `yo_te_invito` en caliente).

| Componente | Ubicación |
|------------|-----------|
| Script | `scripts/ops/backup-postgres-to-gcs.sh` |
| Config VPS (no versionada) | `/opt/yoteinvito/.ops/backup-gcs.env` |
| Credencial GCP (no versionada) | `/opt/yoteinvito/secrets/gcp-yti-backend-storage.json` |
| Destino GCS | `gs://yti-prod-storage/backups/postgres/YYYY/MM/yo_te_invito_YYYYmmdd_HHMMSS.sql.gz` |

---

## 2. Prerrequisitos en VPS

Ejecutar como usuario **`deploy`** salvo donde se indique `sudo`.

| Requisito | Comando / nota |
|-----------|----------------|
| PostgreSQL client (`pg_dump`) | `sudo apt install postgresql-client` |
| `gzip`, `sha256sum` | Paquete `coreutils` (Ubuntu base) |
| Google Cloud SDK | `gsutil` o `gcloud storage` — [instalación SDK](https://cloud.google.com/sdk/docs/install) |
| Repo desplegado | `/opt/yoteinvito` con script ejecutable |
| Service Account GCP | `yti-backend-storage@yoteinvito-1721413433327.iam.gserviceaccount.com` |
| Bucket | `yti-prod-storage` (`southamerica-east1`, privado) |

---

## 3. Credencial GCP (fuera del repo)

1. En consola GCP → IAM → Service Accounts → `yti-backend-storage` → **Keys** → Create key (JSON).
2. Copiar el JSON al VPS **por canal seguro** (SCP, no pegar en chat ni commit).

```bash
sudo mkdir -p /opt/yoteinvito/secrets
sudo install -m 600 -o deploy -g deploy /ruta/local/gcp-yti-backend-storage.json \
  /opt/yoteinvito/secrets/gcp-yti-backend-storage.json
```

Activar la cuenta de servicio:

```bash
gcloud auth activate-service-account \
  yti-backend-storage@yoteinvito-1721413433327.iam.gserviceaccount.com \
  --key-file=/opt/yoteinvito/secrets/gcp-yti-backend-storage.json
```

Verificar acceso de lectura/escritura (objeto de prueba, borrar después):

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/opt/yoteinvito/secrets/gcp-yti-backend-storage.json
echo "yti-backup-test" | gsutil cp - gs://yti-prod-storage/backups/postgres/_connectivity_test.txt
gsutil rm gs://yti-prod-storage/backups/postgres/_connectivity_test.txt
```

---

## 4. Autenticación PostgreSQL (`.pgpass`)

**Recomendado:** archivo `.pgpass` del usuario `deploy`, permisos `600`.  
**No** usar `PGPASSWORD` en cron, systemd ni scripts versionados.

```bash
# ~/.pgpass — formato: host:port:database:user:password
# Ejemplo documental (reemplazar <DB_PASSWORD> por el valor real en VPS):
echo '127.0.0.1:5432:yo_te_invito:yti_app:<DB_PASSWORD>' >> ~/.pgpass
chmod 600 ~/.pgpass
```

Probar sin imprimir password:

```bash
pg_dump -h 127.0.0.1 -p 5432 -U yti_app -d yo_te_invito --no-password --schema-only | head
```

---

## 5. Archivo de entorno del backup (no versionado)

Crear en VPS:

```bash
sudo mkdir -p /opt/yoteinvito/.ops
sudo nano /opt/yoteinvito/.ops/backup-gcs.env
sudo chmod 600 /opt/yoteinvito/.ops/backup-gcs.env
sudo chown deploy:deploy /opt/yoteinvito/.ops/backup-gcs.env
```

Contenido de ejemplo (**sin secretos reales**):

```env
BACKUP_DB_HOST=127.0.0.1
BACKUP_DB_PORT=5432
BACKUP_DB_NAME=yo_te_invito
BACKUP_DB_USER=yti_app
BACKUP_GCS_BUCKET=yti-prod-storage
BACKUP_GCS_PREFIX=backups/postgres
BACKUP_LOCAL_DIR=/var/backups/yoteinvito/postgres
GOOGLE_APPLICATION_CREDENTIALS=/opt/yoteinvito/secrets/gcp-yti-backend-storage.json
```

Directorio local de trabajo:

```bash
sudo mkdir -p /var/backups/yoteinvito/postgres
sudo chown deploy:deploy /var/backups/yoteinvito/postgres
sudo chmod 700 /var/backups/yoteinvito/postgres
```

---

## 6. Script en repo

Hacer ejecutable tras `git pull`:

```bash
chmod +x /opt/yoteinvito/scripts/ops/backup-postgres-to-gcs.sh
```

### 6.1 Dry-run (sin pg_dump ni subida)

```bash
/opt/yoteinvito/scripts/ops/backup-postgres-to-gcs.sh \
  --env-file /opt/yoteinvito/.ops/backup-gcs.env \
  --dry-run
```

### 6.2 Primer backup manual

```bash
/opt/yoteinvito/scripts/ops/backup-postgres-to-gcs.sh \
  --env-file /opt/yoteinvito/.ops/backup-gcs.env
```

Listar objetos subidos:

```bash
gsutil ls "gs://yti-prod-storage/backups/postgres/$(date +%Y)/$(date +%m)/"
```

Salida esperada por backup:

- `yo_te_invito_YYYYmmdd_HHMMSS.sql.gz`
- `yo_te_invito_YYYYmmdd_HHMMSS.sql.gz.sha256` — formato portable: `<hash>  <basename>` (verificable con `sha256sum -c` en la carpeta de descarga)

---

## 7. Programación automática

### Opción A — systemd timer (recomendado si el VPS ya usa systemd)

**Service** `/etc/systemd/system/yti-postgres-backup.service`:

```ini
[Unit]
Description=Yo Te Invito — backup PostgreSQL a GCS
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=oneshot
User=deploy
Group=deploy
EnvironmentFile=/opt/yoteinvito/.ops/backup-gcs.env
ExecStart=/opt/yoteinvito/scripts/ops/backup-postgres-to-gcs.sh --env-file /opt/yoteinvito/.ops/backup-gcs.env
Nice=10
IOSchedulingClass=best-effort
StandardOutput=journal
StandardError=journal
```

**Timer** `/etc/systemd/system/yti-postgres-backup.timer`:

```ini
[Unit]
Description=Timer diario backup PostgreSQL Yo Te Invito

[Timer]
OnCalendar=*-*-* 03:30:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

Activar (requiere `sudo`):

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now yti-postgres-backup.timer
systemctl list-timers | grep yti-postgres-backup
```

Logs:

```bash
journalctl -u yti-postgres-backup.service -n 50
```

### Opción B — cron simple

```cron
30 3 * * * /opt/yoteinvito/scripts/ops/backup-postgres-to-gcs.sh --env-file /opt/yoteinvito/.ops/backup-gcs.env >> /var/log/yoteinvito-backup.log 2>&1
```

Asegurar que el cron corre como **`deploy`** y que `~/.pgpass` existe para ese usuario.

---

## 8. Restore drill

> **Ejecutado en prod (2026-05-31):** backup `yo_te_invito_20260531_082114.sql.gz` restaurado en `yo_te_invito_restore_test`; conteos `"User"`: 2, `"Tenant"`: 1, `"Event"`: 0; DB temporal eliminada. Repetir periódicamente o tras cambios mayores en el script.

> **Advertencias**
>
> - **NO** restaurar sobre `yo_te_invito` en producción sin ventana de mantenimiento y backup previo adicional.
> - **NO** ejecutar restore destructivo en horario pico.
> - Usar siempre una base **temporal** para validar integridad.

### 8.1 Descargar y verificar checksum

```bash
export RESTORE_DIR=/var/backups/yoteinvito/restore-drill
mkdir -p "$RESTORE_DIR"
cd "$RESTORE_DIR"

# Sustituir YYYY, MM y nombre de archivo por el backup a probar
export BACKUP_GZ=yo_te_invito_20260531_033000.sql.gz
export GCS_PREFIX=gs://yti-prod-storage/backups/postgres/YYYY/MM

gsutil cp "${GCS_PREFIX}/${BACKUP_GZ}" .
gsutil cp "${GCS_PREFIX}/${BACKUP_GZ}.sha256" .

sha256sum -c "${BACKUP_GZ}.sha256"
```

### 8.2 Crear base temporal y restaurar

```bash
export TEST_DB=yo_te_invito_restore_test

sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${TEST_DB};"
sudo -u postgres psql -c "CREATE DATABASE ${TEST_DB} OWNER yti_app;"

gunzip -c "${BACKUP_GZ}" | sudo -u postgres psql -d "${TEST_DB}"
```

### 8.3 Validación básica

```bash
sudo -u postgres psql -d "${TEST_DB}" -c "\dt"
sudo -u postgres psql -d "${TEST_DB}" -c "SELECT COUNT(*) FROM \"User\";"
sudo -u postgres psql -d "${TEST_DB}" -c "SELECT COUNT(*) FROM \"Event\";"
sudo -u postgres psql -d "${TEST_DB}" -c "SELECT id, email FROM \"User\" LIMIT 3;"
```

Ajustar nombres de tablas si Prisma usa otro casing (comillas dobles en PostgreSQL).

### 8.4 Limpieza

```bash
sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${TEST_DB};"
rm -f "${RESTORE_DIR}/${BACKUP_GZ}" "${RESTORE_DIR}/${BACKUP_GZ}.sha256"
```

Documentar fecha del drill, tamaño del `.sql.gz` y duración de restore.

---

## 9. Retención

Lifecycle en bucket privado `yti-prod-storage`:

| Regla | Valor |
|-------|--------|
| Acción | `Delete` |
| Edad | 30 días |
| Prefijo | `backups/postgres/` |

Soft delete del bucket (7 días) ofrece margen ante borrado accidental reciente.

Retención mensual/archivado off-site: opcional futuro (export manual o segundo prefijo con regla distinta).

---

## 10. Troubleshooting

| Síntoma | Causa probable | Acción |
|---------|----------------|--------|
| `pg_dump: password authentication failed` | `.pgpass` ausente o permisos ≠ 600 | Revisar `~/.pgpass` del usuario que ejecuta |
| `AccessDeniedException` en GCS | SA sin permiso o key incorrecta | Verificar rol Storage Object Admin sobre bucket |
| `gsutil: command not found` | SDK no instalado | Instalar Google Cloud SDK |
| Backup local crece en disco | Falló subida antes del `rm` | Revisar logs; limpiar `/var/backups/yoteinvito/postgres` manualmente |
| Restore muy lento | data-URL en BD infla dumps | Planificar migración a GCS para media (Etapa B storage) |

---

## 11. Checklist operador

**Cerrado (2026-05-31):**

- [x] JSON SA instalado en `/opt/yoteinvito/secrets/` (`chmod 600`)
- [x] `gcloud auth activate-service-account` OK
- [x] `.pgpass` para `yti_app` (`chmod 600`)
- [x] `/opt/yoteinvito/.ops/backup-gcs.env` creado (`chmod 600`)
- [x] `--dry-run` revisado
- [x] Primer backup manual OK en GCS
- [x] Timer systemd activo (`yti-postgres-backup.timer`, 03:30)
- [x] Restore drill documentado (2026-05-31)

**Pendiente:**

- [x] Política de retención / lifecycle en bucket — delete 30d en `backups/postgres/`

---

## Referencias

| Documento | Uso |
|-----------|-----|
| [`GOOGLE_CLOUD_RUNBOOK.md`](./GOOGLE_CLOUD_RUNBOOK.md) | Proyecto GCP, bucket, SA |
| [`DONWEB_PRODUCTION_RUNBOOK.md`](./DONWEB_PRODUCTION_RUNBOOK.md) | VPS, §25.4 backups |
| [`CONTEXT_PENDIENTES.md`](../context/CONTEXT_PENDIENTES.md) | Backlog infra |
| [`Yo_Te_Invito_Checklist_V2_Produccion.md`](../dev/Yo_Te_Invito_Checklist_V2_Produccion.md) | Checklist producción |
| [`GCS_STORAGE_STRATEGY.md`](./GCS_STORAGE_STRATEGY.md) | Upload imágenes (bucket público separado) |
