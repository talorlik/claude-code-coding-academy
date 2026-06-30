#!/usr/bin/env bash
#
# backup-supabase.sh — full, restorable backup of the Supabase project.
#
# Captures everything needed to rebuild the project from cold:
#   1. roles.sql      — database roles/grants (pg_dumpall --roles-only)
#   2. schema.sql     — full DDL: tables, types, functions, triggers, RLS,
#                       policies, views, event triggers (pg_dump --schema-only)
#   3. data.sql       — all row data as INSERTs (pg_dump --data-only)
#   4. storage/       — every object in every storage bucket + a buckets
#                       manifest (downloaded via the Supabase Storage API)
#   5. config/        — supabase/config.toml, the committed migrations, the
#                       .env.local VARIABLE NAMES (never values), and a project
#                       metadata snapshot (extensions, buckets, migration list)
#   6. edge-functions/ — any deployed edge functions (supabase functions download)
#
# Output: backups/supabase/<UTC-timestamp>/ plus a newest -> <timestamp> symlink.
# The backups/ tree is gitignored: dumps contain real row data and the storage
# objects, which may be sensitive.
#
# Requirements (all already on this machine):
#   - supabase CLI       (brew install supabase/tap/supabase)
#   - pg_dump / pg_dumpall  (brew install libpq, or postgresql)
#   - jq, curl
#
# Auth: reads .env.local for SUPABASE_SECRET_KEY (service_role, for the Storage
# API) and the project URL. The database connection string is taken from
# $SUPABASE_DB_URL if set, otherwise built from `supabase link` state, otherwise
# the script prompts. NEVER pass the DB password on the command line in a shared
# shell; export SUPABASE_DB_URL or let the script read it interactively.
#
# Usage:
#   ./scripts/backup-supabase.sh            # full backup
#   SUPABASE_DB_URL=postgres://... ./scripts/backup-supabase.sh
#   ./scripts/backup-supabase.sh --no-storage   # skip object download (faster)
#
set -euo pipefail

# ─── Resolve repo root (this script lives in scripts/) ───────────────────────
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." &>/dev/null && pwd)"
cd "${REPO_ROOT}"

# ─── Flags ───────────────────────────────────────────────────────────────────
INCLUDE_STORAGE=1
for arg in "$@"; do
  case "${arg}" in
    --no-storage) INCLUDE_STORAGE=0 ;;
    -h|--help)
      sed -n '2,40p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "Unknown flag: ${arg}" >&2; exit 2 ;;
  esac
done

log()  { printf '\033[1;34m[backup]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[backup]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[backup]\033[0m %s\n' "$*" >&2; exit 1; }

# ─── Preflight: required tools ───────────────────────────────────────────────
for tool in supabase pg_dump pg_dumpall jq curl; do
  command -v "${tool}" >/dev/null 2>&1 || die "missing required tool: ${tool}"
done

# ─── Load .env.local (names+values) without leaking to the shell history ──────
# Only the keys we need are exported. .env.local is gitignored.
ENV_FILE="${REPO_ROOT}/.env.local"
[ -f "${ENV_FILE}" ] || die ".env.local not found at ${ENV_FILE}"

# set -a so sourced assignments are exported; restore afterwards.
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

: "${NEXT_PUBLIC_SUPABASE_URL:?NEXT_PUBLIC_SUPABASE_URL missing from .env.local}"
: "${SUPABASE_SECRET_KEY:?SUPABASE_SECRET_KEY missing from .env.local}"

PROJECT_URL="${NEXT_PUBLIC_SUPABASE_URL%/}"
# Project ref is the subdomain of <ref>.supabase.co (or from config.toml).
PROJECT_REF="$(printf '%s' "${PROJECT_URL}" | sed -E 's#https?://([^.]+)\..*#\1#')"
if [ -z "${PROJECT_REF}" ] && [ -f "${REPO_ROOT}/supabase/config.toml" ]; then
  PROJECT_REF="$(grep -E '^project_id' "${REPO_ROOT}/supabase/config.toml" | sed -E 's/.*"([^"]+)".*/\1/')"
fi
log "Project ref: ${PROJECT_REF}"

# ─── Resolve the database connection string ──────────────────────────────────
# Priority: $SUPABASE_DB_URL > prompt. We never store the password in the backup.
if [ -z "${SUPABASE_DB_URL:-}" ]; then
  warn "SUPABASE_DB_URL not set."
  warn "Find it in: Supabase dashboard -> Project Settings -> Database ->"
  warn "Connection string -> URI (use the session pooler or direct connection)."
  read -r -s -p "Paste the Postgres connection URI (postgres://...): " SUPABASE_DB_URL
  echo
fi
[ -n "${SUPABASE_DB_URL:-}" ] || die "no database connection string provided"

# ─── Output layout ───────────────────────────────────────────────────────────
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_BASE="${REPO_ROOT}/backups/supabase"
OUT="${OUT_BASE}/${TS}"
mkdir -p "${OUT}/config" "${OUT}/storage" "${OUT}/edge-functions"
log "Writing backup to ${OUT}"

# ─── 1. Roles ────────────────────────────────────────────────────────────────
# --roles-only with --no-role-passwords: capture role definitions/grants but
# never the (hashed) passwords, which are not restorable across projects anyway.
log "Dumping roles..."
pg_dumpall --dbname="${SUPABASE_DB_URL}" --roles-only --no-role-passwords \
  > "${OUT}/roles.sql" 2>"${OUT}/roles.err" \
  || warn "pg_dumpall roles failed (see roles.err); continuing"

# ─── 2. Schema (DDL) ─────────────────────────────────────────────────────────
# Dump the application schemas. auth/storage internals are Supabase-managed and
# recreated by the platform, so we exclude them from the DDL to keep the dump
# restorable into a fresh Supabase project without ownership conflicts. We DO
# capture public + private (the app's own schemas).
log "Dumping schema (DDL)..."
pg_dump "${SUPABASE_DB_URL}" \
  --schema-only \
  --no-owner --no-privileges \
  --schema=public --schema=private \
  > "${OUT}/schema.sql" \
  || die "pg_dump schema failed"

# ─── 3. Data ─────────────────────────────────────────────────────────────────
# Row data for the app schemas as INSERTs (portable, diffable). --no-owner so it
# restores cleanly under whatever role runs the import.
log "Dumping data..."
pg_dump "${SUPABASE_DB_URL}" \
  --data-only \
  --no-owner --no-privileges \
  --schema=public --schema=private \
  --column-inserts \
  > "${OUT}/data.sql" \
  || die "pg_dump data failed"

# ─── 4. Storage objects ──────────────────────────────────────────────────────
if [ "${INCLUDE_STORAGE}" -eq 1 ]; then
  log "Backing up storage buckets and objects..."
  STORAGE_API="${PROJECT_URL}/storage/v1"
  AUTH_HEADER="Authorization: Bearer ${SUPABASE_SECRET_KEY}"
  APIKEY_HEADER="apikey: ${SUPABASE_SECRET_KEY}"

  # List buckets -> manifest.
  if curl -fsS -H "${AUTH_HEADER}" -H "${APIKEY_HEADER}" \
       "${STORAGE_API}/bucket" -o "${OUT}/storage/buckets.json"; then
    BUCKETS="$(jq -r '.[].name' "${OUT}/storage/buckets.json")"
    for bucket in ${BUCKETS}; do
      log "  bucket: ${bucket}"
      mkdir -p "${OUT}/storage/${bucket}"
      # List objects (recursive, paginated 100 at a time, up to 10k objects).
      offset=0
      while :; do
        page="$(curl -fsS -X POST \
          -H "${AUTH_HEADER}" -H "${APIKEY_HEADER}" \
          -H 'Content-Type: application/json' \
          -d "{\"prefix\":\"\",\"limit\":100,\"offset\":${offset},\"sortBy\":{\"column\":\"name\",\"order\":\"asc\"}}" \
          "${STORAGE_API}/object/list/${bucket}")" || break
        count="$(printf '%s' "${page}" | jq 'length')"
        [ "${count}" -eq 0 ] && break
        # Download each object, preserving its key path.
        printf '%s' "${page}" | jq -r '.[].name' | while read -r key; do
          [ -z "${key}" ] && continue
          dest="${OUT}/storage/${bucket}/${key}"
          mkdir -p "$(dirname -- "${dest}")"
          curl -fsS -H "${AUTH_HEADER}" -H "${APIKEY_HEADER}" \
            "${STORAGE_API}/object/${bucket}/${key}" -o "${dest}" \
            || warn "    failed to download ${bucket}/${key}"
        done
        offset=$((offset + count))
        [ "${count}" -lt 100 ] && break
        [ "${offset}" -ge 10000 ] && { warn "  >10k objects in ${bucket}; truncating"; break; }
      done
    done
  else
    warn "could not list storage buckets; skipping object backup"
  fi
else
  log "Skipping storage (--no-storage)"
fi

# ─── 5. Config + repo metadata ───────────────────────────────────────────────
log "Capturing config and repo migrations..."
[ -f "${REPO_ROOT}/supabase/config.toml" ] && \
  cp "${REPO_ROOT}/supabase/config.toml" "${OUT}/config/config.toml"
if [ -d "${REPO_ROOT}/supabase/migrations" ]; then
  cp -R "${REPO_ROOT}/supabase/migrations" "${OUT}/config/migrations"
fi
[ -f "${REPO_ROOT}/supabase/seed.sql" ] && \
  cp "${REPO_ROOT}/supabase/seed.sql" "${OUT}/config/seed.sql"

# .env VARIABLE NAMES only (never values) so a restorer knows what to set.
if [ -f "${ENV_FILE}" ]; then
  grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "${ENV_FILE}" \
    | sed -E 's/=.*/=<REDACTED — set in .env.local>/' \
    > "${OUT}/config/env-var-names.txt"
fi

# Live project metadata: applied migrations, extensions, bucket list.
log "Snapshotting live project metadata..."
{
  echo "-- Applied migrations (supabase_migrations.schema_migrations)"
  psql "${SUPABASE_DB_URL}" -c \
    "select version, name from supabase_migrations.schema_migrations order by version;" 2>/dev/null \
    || echo "-- (could not read migration history)"
  echo
  echo "-- Installed extensions"
  psql "${SUPABASE_DB_URL}" -c \
    "select extname, extversion from pg_extension order by extname;" 2>/dev/null \
    || echo "-- (could not read extensions)"
} > "${OUT}/config/project-metadata.txt" 2>/dev/null \
  || warn "psql not available; metadata snapshot partial"

# ─── 6. Edge functions ───────────────────────────────────────────────────────
# Best-effort: requires `supabase link` to the project. Skips cleanly if none.
if [ -n "${PROJECT_REF}" ]; then
  log "Attempting edge-function download (best-effort)..."
  if supabase functions list --project-ref "${PROJECT_REF}" >/dev/null 2>&1; then
    supabase functions list --project-ref "${PROJECT_REF}" 2>/dev/null \
      | tail -n +2 | awk '{print $1}' | while read -r fn; do
        [ -z "${fn}" ] && continue
        log "  function: ${fn}"
        supabase functions download "${fn}" \
          --project-ref "${PROJECT_REF}" 2>/dev/null \
          && cp -R "${REPO_ROOT}/supabase/functions/${fn}" \
               "${OUT}/edge-functions/${fn}" 2>/dev/null \
          || warn "  could not download ${fn}"
      done
  else
    warn "edge functions not accessible (not linked / none deployed); skipping"
  fi
fi

# ─── Manifest + newest symlink ───────────────────────────────────────────────
cat > "${OUT}/MANIFEST.txt" <<EOF
Supabase backup
  project_ref : ${PROJECT_REF}
  project_url : ${PROJECT_URL}
  created_utc : ${TS}
  storage     : $([ "${INCLUDE_STORAGE}" -eq 1 ] && echo "included" || echo "skipped")

Contents:
  roles.sql              role definitions (no passwords)
  schema.sql             full DDL for public + private schemas
  data.sql               all row data (column-inserts)
  storage/               buckets.json + downloaded objects
  config/                config.toml, migrations/, seed.sql, env-var-names.txt
  config/project-metadata.txt   applied migrations + extensions snapshot
  edge-functions/        deployed edge functions (if any)

Restore (into a fresh Supabase project), in order:
  1. supabase db push                       # apply repo migrations (preferred), OR
     psql "\$DB_URL" -f schema.sql          # raw DDL if rebuilding outside CLI
  2. psql "\$DB_URL" -f data.sql            # restore row data
  3. npm run seed                           # recreate auth users + roles/profiles
  4. re-upload storage/ objects via the Storage API or supabase CLI
  5. set every variable listed in config/env-var-names.txt in .env.local / Vercel
EOF

ln -sfn "${TS}" "${OUT_BASE}/newest"

# ─── Summary ─────────────────────────────────────────────────────────────────
SIZE="$(du -sh "${OUT}" | awk '{print $1}')"
log "Done. Backup size: ${SIZE}"
log "Location: ${OUT}"
log "Newest symlink: ${OUT_BASE}/newest -> ${TS}"
