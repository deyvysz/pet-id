# Despliegue del piloto

Fecha: 15 de noviembre de 2026. Decisión 013. Sigue el manual de la plataforma de tres capas, en su variante de un servidor. Cada paso tiene su verificación; no se pasa al siguiente sin ella. Los comandos de Ansible se corren primero con `--check --diff` y después sin eso.

## 0. Lo que hace falta

- VPS en Contabo: Cloud VPS 4 (4 vCPU, 8 GB, 100 GB SSD), US Central, Ubuntu 24.04, usuario `admin` con tu llave ed25519 (creada en WSL, nunca en una carpeta sincronizada).
- Proyecto en Supabase Cloud. El del piloto es `petid-piloto`, región East US (Ohio, us-east-2), referencia `qsjlnvhywowwwcpaxwbp`.
- Zona `petid.com.pe` en Cloudflare, con los DNS del registrador apuntando a Cloudflare.
- En WSL (`PetId`): `sudo apt install -y pipx age wireguard-tools && pipx install --include-deps ansible && pipx inject ansible docker` y SOPS (binario de github.com/getsops/sops/releases).

## 1. Supabase

1. Crear el proyecto. Anotar la URL, la clave `anon`, la clave `service_role` y la cadena del pooler en modo sesión (Connect > Session pooler).
2. Activar la cola: Integrations > Queues (extensión pgmq).
3. Aplicar las migraciones desde WSL, en `~/petid-infra/infra`:
   `npx supabase@2.48.3 link --project-ref <ref>` y luego `npx supabase@2.48.3 db push`.
4. Authentication > Sign In / Providers > Phone: activarlo. En "Test OTP" se registran solo dos números, los del seed, con código fijo `123456`: `51987654321` (Ana, propietaria) y `51900000000` (administrador). No se envían SMS ni hace falta un proveedor, y quien prueba el piloto entra con esos datos sin registrar su propio celular.
5. Authentication > URL Configuration: Site URL `https://piloto.petid.com.pe`.

Verificación: en Table Editor aparecen las tablas y `ubigeo` tiene 1,893 filas.

## 2. GitHub

1. Settings > Secrets and variables > Actions > Variables: `PILOTO_SUPABASE_URL`, `PILOTO_SUPABASE_ANON_KEY` y, si ya existe, `PILOTO_CORREO_CONTACTO`.
2. Actions > Imagenes > Run workflow. Publica `pet-id-web` y `pet-id-reconocimiento` en GHCR.
3. Crear un token (classic) con `read:packages` para que el servidor baje las imágenes.

Verificación: los dos paquetes aparecen en github.com/deyvysz?tab=packages con la etiqueta `sha-<commit>`.

## 3. Cloudflare

Hacer los ajustes de `docs/cloudflare.md` y anotar la fecha en cada fila. El certificado de origen se copia directo al archivo de secretos del paso 4; no se guarda en otro lugar.

## 4. Secretos

PET ID usa su propia llave age. Antes del primer `sops`, créala y pon su llave pública en `.sops.yaml`:

```bash
mkdir -p ~/.config/sops/age && age-keygen -o ~/.config/sops/age/petid.txt
echo 'export SOPS_AGE_KEY_FILE=~/.config/sops/age/petid.txt' >> ~/.bashrc && source ~/.bashrc
nano ~/petid-infra/.sops.yaml   # pegar la "Public key: age1..." que imprimió age-keygen
```

Guarda una copia de `petid.txt` en tu gestor de contraseñas: sin ella no se pueden descifrar los secretos.

Después, en `infra/ansible/inventory/piloto/group_vars/`:

```bash
cp all.sops.example.yaml all.sops.yaml
EDITOR=nano sops all.sops.yaml
```

Verificación: `head -5 all.sops.yaml` muestra valores `ENC[...]`.

## 5. Inventario

Completar en `inventory/piloto/hosts.yml` la `public_ip`, y en `group_vars/all.yml` la llave pública de tu cliente WireGuard y `supabase_url`. En `roles/petid/defaults/main.yml`, `petid_version: "sha-<commit>"`.

## 6. Servidor

Desde `~/petid-infra/infra/ansible`:

```bash
ansible-galaxy collection install -r requirements.yml -p ./collections
# Primera entrada, por la IP pública (todavía no hay VPN):
ansible-playbook playbooks/site.yml --tags base,ssh,wireguard -e ansible_host=<IP pública>
```

La salida muestra la llave pública del servidor. Con ella se arma el túnel `petid-piloto` en tu cliente WireGuard (dirección 10.10.0.2/32, par con `AllowedIPs = 10.10.0.0/24` y `Endpoint = <IP pública>:51820`).

Verificación: con el túnel activo, `ssh admin@10.10.0.1` entra.

```bash
# Desde aquí, todo por la VPN:
ansible-playbook playbooks/site.yml --tags firewall
ansible-playbook playbooks/site.yml --tags docker,swarm,traefik
ansible-playbook playbooks/site.yml --tags petid
```

El cortafuegos tiene retroceso automático: si la conexión nueva falla, a los 5 minutos borra sus reglas.

Verificación:
- Desde fuera de la VPN, `ssh admin@<IP pública>` no responde.
- `curl -k https://<IP pública>` desde tu casa no responde (el 443 solo acepta a Cloudflare).
- `docker service ls` en el servidor muestra `petid_web`, `petid_reconocimiento` y `petid_worker` en 1/1.
- `https://piloto.petid.com.pe` abre PET ID. Con el celular `987654321` y el código `123456` se entra como Ana y se ven Max y Luna.
- Segunda corrida completa de `site.yml`: `changed=0`.
- Memoria: `docker stats --no-stream` con el piloto en uso. El reconocimiento y el worker deben quedar bajo su tope de 2,500 MB y `free -h` debe mostrar memoria disponible sin usar el intercambio de forma sostenida.

## 7. Prueba del piloto

Registrar una mascota con fotos reales, reportarla, buscarla por foto desde otro navegador y revisar el panel de administración. El primer administrador se crea en Supabase: `update perfiles set rol = 'admin' where id = '<uuid>';` en el SQL Editor.

## Actualizar a una versión nueva

Cambiar `petid_version` al nuevo `sha-<commit>` y correr `--tags petid`. Si el servicio no pasa su revisión de salud, Swarm vuelve solo a la versión anterior.

## Errores conocidos

- El ensayo (`--check`) de `--tags docker` siempre falla con "No package matching 'docker-ce' is available": en modo ensayo el repositorio de Docker no se agrega de verdad, así que el paso de instalación no encuentra el paquete. Correr esa etiqueta directo, sin `--check`.
- Contabo entrega el servidor solo con `root` y contraseña, y su imagen de Ubuntu ya trae un grupo `admin` sin usuario. El usuario se crea con `adduser --disabled-password --gecos "" --ingroup admin admin`, se le da `sudo`, se le copia la llave con `ssh-copy-id` y al final se bloquea su contraseña (`sudo passwd -l admin`).

- La conexión directa a la base de Supabase es solo IPv6; se usa el pooler en modo sesión.
- Docker 29 exige Traefik 3.6.1 o superior.
- El worker tarda cerca de un minuto en cargar el modelo al arrancar.
