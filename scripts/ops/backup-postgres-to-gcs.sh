#!/usr/bin/env bash
#
# backup-postgres-to-gcs.sh — PostgreSQL pg_dump → gzip → Google Cloud Storage
#
# Uso en VPS (Linux). No contiene secretos; leer config desde variables de entorno
# o archivo externo no versionado (ver docs/deploy/GCS_BACKUPS_RUNBOOK.md).
#
# Autenticación DB: archivo ~/.pgpass del usuario que ejecuta el script (permisos 600).
# Autenticación GCS: GOOGLE_APPLICATION_CREDENTIALS o gcloud auth activate-service-account.
#
set -euo pipefail

readonly SCRIPT_NAME="$(basename "$0")"

DRY_RUN=false
ENV_FILE="${BACKUP_ENV_FILE:-}"

log() {
  printf '[%s] %s\n' "$(date -Iseconds)" "$*"
}

die() {
  log "ERROR: $*"
  exit 1
}

usage() {
  cat <<EOF
${SCRIPT_NAME} — backup PostgreSQL hacia Google Cloud Storage

Uso:
  ${SCRIPT_NAME} [--env-file PATH] [--dry-run]
  ${SCRIPT_NAME} --help

Opciones:
  --env-file PATH   Archivo con variables BACKUP_* (no versionado en git)
  --dry-run         Muestra acciones sin ejecutar pg_dump ni subir a GCS
  --help            Muestra esta ayuda

Variables requeridas (entorno o --env-file):
  BACKUP_DB_NAME       Nombre de la base de datos
  BACKUP_DB_USER       Usuario PostgreSQL para pg_dump
  BACKUP_GCS_BUCKET    Bucket GCS (sin gs://)
  BACKUP_GCS_PREFIX    Prefijo dentro del bucket (ej. backups/postgres)

Variables opcionales:
  BACKUP_DB_HOST       Default: 127.0.0.1
  BACKUP_DB_PORT       Default: 5432
  BACKUP_LOCAL_DIR     Default: /var/backups/yoteinvito/postgres
  GOOGLE_APPLICATION_CREDENTIALS  Ruta al JSON de service account (solo en VPS)

Documentación: docs/deploy/GCS_BACKUPS_RUNBOOK.md
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --help | -h)
        usage
        exit 0
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --env-file)
        [[ $# -ge 2 ]] || die "--env-file requiere una ruta"
        ENV_FILE="$2"
        shift 2
        ;;
      *)
        die "Opción desconocida: $1 (use --help)"
        ;;
    esac
  done
}

load_env_file() {
  if [[ -z "${ENV_FILE}" ]]; then
    return 0
  fi
  [[ -f "${ENV_FILE}" ]] || die "Archivo de entorno no encontrado: ${ENV_FILE}"
  # shellcheck disable=SC1090
  set -a
  # shellcheck source=/dev/null
  source "${ENV_FILE}"
  set +a
  log "Configuración cargada desde ${ENV_FILE}"
}

require_command() {
  local cmd="$1"
  command -v "${cmd}" >/dev/null 2>&1 || die "Comando requerido no encontrado: ${cmd}"
}

detect_gcs_cli() {
  if command -v gsutil >/dev/null 2>&1; then
    GCS_CLI="gsutil"
    return 0
  fi
  if command -v gcloud >/dev/null 2>&1; then
    GCS_CLI="gcloud"
    return 0
  fi
  die "Se requiere gsutil o gcloud en PATH"
}

validate_dependencies() {
  require_command pg_dump
  require_command gzip
  require_command sha256sum
  detect_gcs_cli
  log "Dependencias OK (GCS via ${GCS_CLI})"
}

validate_config() {
  BACKUP_DB_HOST="${BACKUP_DB_HOST:-127.0.0.1}"
  BACKUP_DB_PORT="${BACKUP_DB_PORT:-5432}"
  BACKUP_LOCAL_DIR="${BACKUP_LOCAL_DIR:-/var/backups/yoteinvito/postgres}"

  local missing=()
  [[ -n "${BACKUP_DB_NAME:-}" ]] || missing+=("BACKUP_DB_NAME")
  [[ -n "${BACKUP_DB_USER:-}" ]] || missing+=("BACKUP_DB_USER")
  [[ -n "${BACKUP_GCS_BUCKET:-}" ]] || missing+=("BACKUP_GCS_BUCKET")
  [[ -n "${BACKUP_GCS_PREFIX:-}" ]] || missing+=("BACKUP_GCS_PREFIX")

  if [[ ${#missing[@]} -gt 0 ]]; then
    die "Variables requeridas faltantes: ${missing[*]}"
  fi

  # Normalizar prefijo (sin barras leading/trailing)
  BACKUP_GCS_PREFIX="${BACKUP_GCS_PREFIX#/}"
  BACKUP_GCS_PREFIX="${BACKUP_GCS_PREFIX%/}"

  if [[ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" && ! -f "${GOOGLE_APPLICATION_CREDENTIALS}" ]]; then
    die "GOOGLE_APPLICATION_CREDENTIALS apunta a un archivo inexistente"
  fi
}

upload_to_gcs() {
  local local_path="$1"
  local gcs_uri="$2"

  if [[ "${GCS_CLI}" == "gsutil" ]]; then
    gsutil -q cp "${local_path}" "${gcs_uri}"
  else
    gcloud storage cp "${local_path}" "${gcs_uri}" --quiet
  fi
}

main() {
  parse_args "$@"
  load_env_file
  validate_dependencies
  validate_config

  local stamp year month filename local_gz local_sha gcs_dir gcs_uri gcs_sha_uri

  stamp="$(date +%Y%m%d_%H%M%S)"
  year="$(date +%Y)"
  month="$(date +%m)"
  filename="yo_te_invito_${stamp}.sql.gz"
  local_gz="${BACKUP_LOCAL_DIR}/${filename}"
  local_sha="${local_gz}.sha256"
  gcs_dir="gs://${BACKUP_GCS_BUCKET}/${BACKUP_GCS_PREFIX}/${year}/${month}"
  gcs_uri="${gcs_dir}/${filename}"
  gcs_sha_uri="${gcs_uri}.sha256"

  log "Inicio backup PostgreSQL → GCS"
  log "  Base de datos: ${BACKUP_DB_USER}@${BACKUP_DB_HOST}:${BACKUP_DB_PORT}/${BACKUP_DB_NAME}"
  log "  Destino GCS:   ${gcs_uri}"
  log "  Directorio local temporal: ${BACKUP_LOCAL_DIR}"

  if [[ "${DRY_RUN}" == "true" ]]; then
    log "DRY RUN — no se ejecutará pg_dump ni subida"
    log "  1. mkdir -p ${BACKUP_LOCAL_DIR}"
    log "  2. pg_dump -h ${BACKUP_DB_HOST} -p ${BACKUP_DB_PORT} -U ${BACKUP_DB_USER} -d ${BACKUP_DB_NAME} --no-password | gzip > ${local_gz}"
    log "  3. (cd ${BACKUP_LOCAL_DIR} && sha256sum ${filename} > ${filename}.sha256)"
    log "  4. ${GCS_CLI} cp ${local_gz} ${gcs_uri}"
    log "  5. ${GCS_CLI} cp ${local_sha} ${gcs_sha_uri}"
    log "  6. rm -f ${local_gz} ${local_sha}"
    log "DRY RUN completado"
    exit 0
  fi

  mkdir -p "${BACKUP_LOCAL_DIR}"

  log "Ejecutando pg_dump (formato SQL plano, comprimido con gzip)..."
  pg_dump \
    -h "${BACKUP_DB_HOST}" \
    -p "${BACKUP_DB_PORT}" \
    -U "${BACKUP_DB_USER}" \
    -d "${BACKUP_DB_NAME}" \
    --no-password \
    | gzip > "${local_gz}"

  log "Calculando checksum sha256 (basename portable para sha256sum -c)..."
  (cd "${BACKUP_LOCAL_DIR}" && sha256sum "${filename}" > "${filename}.sha256")

  log "Subiendo backup a GCS..."
  upload_to_gcs "${local_gz}" "${gcs_uri}"

  log "Subiendo checksum a GCS..."
  upload_to_gcs "${local_sha}" "${gcs_sha_uri}"

  log "Eliminando archivos temporales locales..."
  rm -f "${local_gz}" "${local_sha}"

  log "Backup completado: ${gcs_uri}"
}

main "$@"
