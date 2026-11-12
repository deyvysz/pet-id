# Entorno local en WSL (distribución PetId)

Fecha: 12 de noviembre de 2026.

Levanta todo PET ID en la máquina de desarrollo: Supabase local (base de datos, Auth, Storage y cola en Docker), la web Next.js y el servicio de reconocimiento. No se necesita ninguna cuenta en la nube.

## 1. Requisitos en Windows

- WSL 2 con la distribución `PetId`. Si aún no existe, en PowerShell: `wsl --install Ubuntu-24.04 --name PetId`.
- Docker Desktop, con Settings > Resources > WSL integration activado para `PetId`. Otra opción es instalar Docker Engine dentro de la distribución.
- Unos 10 GB libres: las imágenes de Supabase ocupan entre 4 y 5 GB, y el modelo real otros 3 GB si se instala.

## 2. Preparar la distribución (una sola vez)

Dentro de `PetId` (`wsl -d PetId`):

```bash
sudo apt update && sudo apt install -y git python3 python3-venv python3-pip curl
# Node 22 con nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc && nvm install 22
# GitHub CLI para clonar el repositorio privado
sudo apt install -y gh && gh auth login
```

Clonar dentro del sistema de archivos de Linux (no en `/mnt/c`, que es varias veces más lento):

```bash
cd ~ && gh repo clone deyvysz/pet-id && cd pet-id
```

## 3. Levantar

```bash
scripts/local.sh preparar     # la primera vez tarda unos minutos
scripts/local.sh iniciar
```

Luego, desde el navegador de Windows:

- Web: http://localhost:3000
- Panel de Supabase (tablas, usuarios, Storage): http://127.0.0.1:54323
- Correos de prueba (lo que enviaría Resend no sale; Auth deja aquí los suyos): http://127.0.0.1:54324
- Reconocimiento: http://127.0.0.1:8000/health

Usuarios de demo. En local no se envían SMS: estos celulares reciben siempre el código `123456`.

- Propietaria Ana (tiene a Max y a Luna): 987654321
- Administrador: 900000000
- Para probar un registro nuevo: 911111111

## 4. Reconocimiento con el modelo real

Por defecto el servicio usa un modelo simulado, que responde rápido pero no reconoce nada. Para usar OWL-ViT y DINOv2:

```bash
scripts/local.sh detener
scripts/local.sh preparar --modelo-real   # instala torch y transformers; la primera foto descarga los pesos
scripts/local.sh iniciar
```

Corre en CPU. Cada foto tarda unos segundos.

## 5. Otros comandos

- `scripts/local.sh detener`: apaga la web, el reconocimiento, el worker y Supabase.
- `scripts/local.sh reiniciar-bd`: borra la base local y vuelve a aplicar las migraciones y el seed.
- Registros de cada proceso: `.local-logs/`.

## Diferencias con producción

- Los SMS de Auth no se envían; en producción se configura un proveedor (Twilio u otro) en el panel de Supabase.
- Sin `RESEND_API_KEY`, el aviso al propietario se guarda en `mensajes_contacto` y no sale por correo.
- Los datos de demo no tienen fotos en Storage, así que las fotos de Max y Luna aparecen vacías hasta que se suban desde la web.
