#!/usr/bin/env bash
# Levanta PET ID en local (WSL o Linux): Supabase local con Docker, web Next.js y servicio de reconocimiento.
# Uso:
#   scripts/local.sh preparar        instala dependencias, arranca Supabase, aplica migraciones y seed, escribe los .env
#   scripts/local.sh preparar --modelo-real   igual, pero instala torch y transformers para OWL-ViT y DINOv2 (descarga grande)
#   scripts/local.sh iniciar         arranca web (3000), reconocimiento (8000) y worker de fotos
#   scripts/local.sh detener         detiene los procesos y Supabase
#   scripts/local.sh reiniciar-bd    borra la base local y vuelve a aplicar migraciones y seed
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
SUPA="npx -y supabase@2.48.3"
LOGS="$RAIZ/.local-logs"
mkdir -p "$LOGS"

requisito() { command -v "$1" >/dev/null 2>&1 || { echo "Falta $1. $2"; exit 1; }; }

comprobar() {
  requisito docker "Instala Docker Desktop con integración WSL activada para esta distribución, o Docker Engine dentro de WSL."
  docker info >/dev/null 2>&1 || { echo "Docker no responde. Abre Docker Desktop (o: sudo service docker start)."; exit 1; }
  requisito node "Instala Node.js 22 (por ejemplo con nvm)."
  requisito python3 "Instala Python 3.12 o superior: sudo apt install python3 python3-venv python3-pip"
  local v; v=$(node -p 'process.versions.node.split(".")[0]')
  [ "$v" -ge 20 ] || { echo "Node $v es antiguo; usa Node 22."; exit 1; }
}

escribir_env() {
  cd "$RAIZ/infra"
  eval "$($SUPA status -o env 2>/dev/null | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY|DB_URL)=')"
  : "${API_URL:?No se pudo leer el estado de Supabase}"
  cat > "$RAIZ/src/web/.env.local" <<ENV
# Generado por scripts/local.sh (Supabase local). No se versiona.
NEXT_PUBLIC_SUPABASE_URL=$API_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
RECONOCIMIENTO_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
RESEND_API_KEY=
RESEND_FROM=
NEXT_PUBLIC_CORREO_CONTACTO=
NEXT_PUBLIC_DEMO=
ENV
  local modelo=falso
  [ -f "$RAIZ/src/reconocimiento/.modelo-real" ] && modelo=real
  cat > "$RAIZ/src/reconocimiento/.env" <<ENV
# Generado por scripts/local.sh. No se versiona.
MODELO=$modelo
DATABASE_URL=$DB_URL
SUPABASE_URL=$API_URL
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
URL_HOSTS_PERMITIDOS=127.0.0.1,localhost
ENV
  echo "Variables escritas en src/web/.env.local y src/reconocimiento/.env (modelo: $modelo)."
}

preparar() {
  comprobar
  echo "1/4 Supabase local (la primera vez descarga imágenes de Docker; tarda unos minutos)"
  cd "$RAIZ/infra" && { $SUPA start || { echo "Supabase no arrancó; reintento una vez limpiando contenedores."; $SUPA stop --no-backup >/dev/null 2>&1 || true; $SUPA start; }; }
  echo "2/4 Dependencias de la web"
  cd "$RAIZ/src/web" && npm ci
  echo "3/4 Servicio de reconocimiento"
  cd "$RAIZ/src/reconocimiento"
  python3 -m venv .venv
  .venv/bin/pip install -q --upgrade pip
  if [ "${1:-}" = "--modelo-real" ]; then
    .venv/bin/pip install -q -r requirements.txt && touch .modelo-real
  else
    .venv/bin/pip install -q -r requirements-pruebas.txt && rm -f .modelo-real
  fi
  echo "4/4 Variables de entorno"
  escribir_env
  echo
  echo "Listo. Siguiente: scripts/local.sh iniciar"
}

iniciar() {
  comprobar
  cd "$RAIZ/infra" && ($SUPA status >/dev/null 2>&1 || $SUPA start)
  escribir_env
  cd "$RAIZ/src/reconocimiento"
  set -a; . ./.env; set +a
  nohup .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 > "$LOGS/reconocimiento.log" 2>&1 & echo $! > "$LOGS/reconocimiento.pid"
  nohup .venv/bin/python -m app.cola > "$LOGS/worker.log" 2>&1 & echo $! > "$LOGS/worker.pid"
  cd "$RAIZ/src/web"
  nohup npm run dev > "$LOGS/web.log" 2>&1 & echo $! > "$LOGS/web.pid"
  sleep 3
  cat <<TXT

PET ID en local:
  Web ................ http://localhost:3000
  Reconocimiento ..... http://127.0.0.1:8000/health
  Panel de Supabase .. http://127.0.0.1:54323
  Correos de prueba .. http://127.0.0.1:54324

Usuarios de demo (código SMS siempre 123456, no se envía SMS):
  Propietaria Ana .... celular 987654321
  Administrador ...... celular 900000000
  Registro nuevo ..... celular 911111111

Registros en .local-logs/. Para detener: scripts/local.sh detener
TXT
}

detener() {
  for p in web worker reconocimiento; do
    [ -f "$LOGS/$p.pid" ] && kill "$(cat "$LOGS/$p.pid")" 2>/dev/null || true
    rm -f "$LOGS/$p.pid"
  done
  pkill -f "next dev" 2>/dev/null || true
  cd "$RAIZ/infra" && $SUPA stop
}

case "${1:-}" in
  preparar) preparar "${2:-}" ;;
  iniciar) iniciar ;;
  detener) detener ;;
  reiniciar-bd) cd "$RAIZ/infra" && $SUPA db reset ;;
  *) sed -n 2,8p "$0"; exit 1 ;;
esac
