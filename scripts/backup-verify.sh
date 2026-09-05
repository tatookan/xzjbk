#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo 'Usage: npm run backup:verify -- /absolute/path/to/backup'
  exit 1
fi

command -v pg_restore >/dev/null || { echo 'pg_restore is required'; exit 1; }
command -v tar >/dev/null || { echo 'tar is required'; exit 1; }

backup_dir="$(cd "$1" && pwd -P)"
for file in database.dump storage.tar.gz checksums.sha256 manifest.txt; do
  [[ -f "$backup_dir/$file" ]] || { echo "Missing backup file: $file"; exit 1; }
done

if command -v sha256sum >/dev/null; then
  (cd "$backup_dir" && sha256sum --check checksums.sha256)
else
  (cd "$backup_dir" && shasum -a 256 --check checksums.sha256)
fi

pg_restore --list "$backup_dir/database.dump" >/dev/null
tar -tzf "$backup_dir/storage.tar.gz" >/dev/null
echo "Backup verified: $backup_dir"
