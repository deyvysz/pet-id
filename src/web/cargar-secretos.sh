#!/bin/sh
# Pasa los secretos de Docker Swarm (/run/secrets/<nombre>) a variables de entorno
# en mayusculas: /run/secrets/database_url -> DATABASE_URL. "vacio" queda como cadena vacia.
if [ -d /run/secrets ]; then
  for f in /run/secrets/*; do
    [ -f "$f" ] || continue
    nombre=$(basename "$f" | tr '[:lower:]' '[:upper:]')
    valor=$(cat "$f")
    [ "$valor" = "vacio" ] && valor=""
    export "$nombre=$valor"
  done
fi
exec "$@"
