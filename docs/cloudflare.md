# Ajustes de Cloudflare hechos a mano

Zona `petid.com.pe`. Lo que configura Ansible se repite solo; lo de esta tabla se hace en el panel y se anota aquí el mismo día, con su fecha.

| Ajuste | Dónde, en el panel | Valor | Desde |
|---|---|---|---|
| Cifrado | SSL/TLS, Información general | Completo, de forma temporal; debe volver a Completo (estricto) al instalar el certificado de origen | 16/11/2026 |
| Usar siempre HTTPS | SSL/TLS, Certificados perimetrales | Activado | pendiente |
| TLS mínimo | SSL/TLS, Certificados perimetrales | 1.2 | pendiente |
| Certificado de origen | SSL/TLS, Servidor de origen | ECC, `*.petid.com.pe` y `petid.com.pe`, 15 años; va cifrado en SOPS | pendiente: el panel responde "This zone is either not part of your account" aunque la zona está activa. Mientras tanto el servidor usa un certificado autofirmado y el modo es Completo |
| Registro DNS | DNS | `piloto`, tipo A, 194.238.30.239, con proxy | 16/11/2026 |
| TTL de caché del navegador | Almacenamiento en caché, Configuración | Respetar encabezados existentes | pendiente |

## Servidores de nombres

La zona usa `holly.ns.cloudflare.com` y `lennon.ns.cloudflare.com`.

El dominio está registrado en Layer1 Host. El cambio costó varios intentos en su panel (Servicios > Dominios > Nameservers), que confirmaba el guardado sin aplicarlo. Quedó aplicado el 16 de noviembre de 2026: `dig +short NS petid.com.pe @1.1.1.1` responde los de Cloudflare y `piloto.petid.com.pe` resuelve a direcciones de Cloudflare.

Comprobación:

```bash
dig NS petid.com.pe @PE1.DNSNODE.NET +norecurse +short
```

Después de un incidente en que el origen respondió errores, se purga la caché antes de dar el servicio por recuperado.
