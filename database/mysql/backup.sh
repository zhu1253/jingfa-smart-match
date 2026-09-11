#!/bin/sh
set -eu

database_root="/opt/jingfa-smart-match/database"
backup_dir="${database_root}/backups"
retention_days="${JINGFA_BACKUP_RETENTION_DAYS:-14}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="${backup_dir}/jingfa_smartfit-${timestamp}.sql.gz"
temporary_file="${backup_file}.tmp"

umask 077
case "${retention_days}" in
  ''|*[!0-9]*) printf '%s\n' 'JINGFA_BACKUP_RETENTION_DAYS must be a non-negative integer.' >&2; exit 2 ;;
esac
mkdir -p "${backup_dir}"

cleanup() {
  rm -f "${temporary_file}"
}
trap cleanup EXIT INT TERM

docker exec jingfa-mysql sh -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump --single-transaction --quick --routines --triggers --events --set-gtid-purged=OFF -u root "$MYSQL_DATABASE"' \
  | gzip -9 > "${temporary_file}"

mv "${temporary_file}" "${backup_file}"
sha256sum "${backup_file}" > "${backup_file}.sha256"
find "${backup_dir}" -type f \( -name 'jingfa_smartfit-*.sql.gz' -o -name 'jingfa_smartfit-*.sql.gz.sha256' \) -mtime "+${retention_days}" -delete

printf '%s\n' "${backup_file}"
