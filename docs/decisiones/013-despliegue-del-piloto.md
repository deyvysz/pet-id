# 013. Despliegue del piloto

Fecha: 15 de noviembre de 2026. Decidió: Deyvys.

El piloto es una presentación previa para personas invitadas; no va al público final.

1. Topología de un servidor (arquitectura de tres capas): Contabo Cloud VPS 4 (4 vCPU, 8 GB, 100 GB SSD), US Central, Ubuntu 24.04; elegido por Deyvys el 15 de noviembre de 2026. Los topes de memoria de los servicios se ajustaron a 8 GB y el servidor lleva 2 GB de intercambio. Si la medición del primer despliegue muestra que falta memoria, se sube de plan en Contabo. Corre Traefik, la web, el reconocimiento y el worker en Docker Swarm de un nodo.
2. Datos en Supabase Cloud (región East US: Ohio o Virginia, las más cercanas al servidor): base, Auth y Storage. Por eso el servidor no guarda datos y la regla "los datos nunca van con la entrada expuesta" se cumple.
3. Dominio `petid.com.pe` en Cloudflare. El piloto se publica en `piloto.petid.com.pe`, detrás de Cloudflare Access con lista de correos.
4. El 443 solo acepta rangos de Cloudflare; SSH solo por WireGuard con llave.
5. Imágenes en GHCR con etiqueta fija `sha-<commit>`, construidas por GitHub Actions. Secretos en SOPS con age.
6. Ansible en `infra/ansible/`: roles base, ssh, firewall, wireguard, docker, swarm, traefik y petid, según la arquitectura de referencia de tres capas. PET ID no comparte servidores, llaves, secretos ni dominio con ningún otro proyecto.

Fuera del piloto, para producción: monitoreo (Prometheus, Grafana, Loki), respaldo propio fuera de Supabase, proveedor de SMS y los requisitos de la Ley 29733.

No da alta disponibilidad: si el servidor cae, el piloto se detiene hasta que vuelva.
