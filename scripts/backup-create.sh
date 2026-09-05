#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"
: "${STORAGE_LOCAL_ROOT:?STORAGE_LOCAL_ROOT must be set}"

command -v pg_dump >/dev/null || { echo 'pg_dump is required'; exit 1; }
command -v tar >/dev/null || { echo 'tar is required'; exit 1; }

backup_root="${BACKUP_ROOT:-./var/backups}"
mkdir -p "$backup_root"
backup_root="$(cd "$backup_root" && pwd -P)"
storage_root="$(cd "$STORAGE_LOCAL_ROOT" && pwd -P)"

if [[ "$backup_root" == "$storage_root" || "$backup_root" == "$storage_root"/* ]]; then
  echo 'BACKUP_ROOT must be outside STORAGE_LOCAL_ROOT'
  exit 1
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
work_dir="$(mktemp -d "$backup_root/.xinzhi-${timestamp}-XXXXXX")"
unique_suffix="${work_dir##*-}"
final_dir="$backup_root/xinzhi-${timestamp}-${unique_suffix}"

cleanup() {
  if [[ -d "$work_dir" ]]; then
    rm -rf -- "$work_dir"
  fi
}
trap cleanup EXIT

pg_dump --format=custom --no-owner --no-privileges --file "$work_dir/database.dump" "$DATABASE_URL"
tar -C "$storage_root" -czf "$work_dir/storage.tar.gz" .

if command -v sha256sum >/dev/null; then
  (cd "$work_dir" && sha256sum database.dump storage.tar.gz > checksums.sha256)
else
  (cd "$work_dir" && shasum -a 256 database.dump storage.tar.gz > checksums.sha256)
fi

{
  echo "created_at_utc=$timestamp"
  echo 'database_format=postgres-custom'
  echo 'storage_format=tar-gzip'
} > "$work_dir/manifest.txt"

mv "$work_dir" "$final_dir"
trap - EXIT
echo "Backup created: $final_dir"
