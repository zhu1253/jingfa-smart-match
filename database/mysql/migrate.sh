#!/bin/sh
set -eu

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
migration_dir="${script_dir}/migrations"

if ! docker inspect jingfa-mysql >/dev/null 2>&1; then
  printf '%s\n' 'jingfa-mysql is not running.' >&2
  exit 1
fi

mysql_root() {
  docker exec jingfa-mysql sh -c \
    'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql --batch --skip-column-names -u root -e "$1"' sh "$1"
}

for migration_file in "${migration_dir}"/*.sql; do
  [ -f "${migration_file}" ] || continue
  migration_name="$(basename "${migration_file}")"
  version="${migration_name%%_*}"
  case "${version}" in
    ''|*[!0-9]*)
      printf 'Invalid migration filename: %s\n' "${migration_name}" >&2
      exit 1
      ;;
  esac

  table_exists="$(mysql_root "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='jingfa_smartfit' AND table_name='schema_migrations';")"
  applied=0
  if [ "${table_exists}" = "1" ]; then
    applied="$(mysql_root "SELECT COUNT(*) FROM jingfa_smartfit.schema_migrations WHERE version='${version}';")"
  fi

  if [ "${applied}" = "1" ]; then
    printf 'skip %s\n' "${migration_name}"
    continue
  fi

  printf 'apply %s\n' "${migration_name}"
  docker exec -i jingfa-mysql sh -c \
    'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root' < "${migration_file}"

  verified="$(mysql_root "SELECT COUNT(*) FROM jingfa_smartfit.schema_migrations WHERE version='${version}';")"
  if [ "${verified}" != "1" ]; then
    printf 'Migration did not record version %s.\n' "${version}" >&2
    exit 1
  fi
done

printf '%s\n' 'MIGRATIONS_CURRENT'
