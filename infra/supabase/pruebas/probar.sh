#!/usr/bin/env bash
# Aplica el stub de Supabase, las migraciones y el seed en una base nueva, y corre las pruebas de acceso.
# Requiere Postgres 16 con pgvector. Uso: PGHOST=... PGPORT=... PGUSER=postgres ./probar.sh [base]
set -euo pipefail
cd "$(dirname "$0")/.."
BASE="${1:-petid_prueba}"

dropdb --if-exists "$BASE"
createdb "$BASE"
export PGDATABASE="$BASE"
P="psql -X -q -v ON_ERROR_STOP=1"

$P -f pruebas/00_stub_supabase.sql
for f in migrations/0*.sql; do
  echo "Aplicando $f"
  $P -f "$f"
done
echo "Aplicando seed.sql"
$P -f seed.sql
$P -f pruebas/10_rls.sql
