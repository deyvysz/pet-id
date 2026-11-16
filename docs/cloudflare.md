# Ajustes de Cloudflare hechos a mano

Zona `petid.com.pe`. Lo que configura Ansible se repite solo; lo de esta tabla se hace en el panel y se anota aquí el mismo día, con su fecha.

| Ajuste | Dónde, en el panel | Valor | Desde |
|---|---|---|---|
| Cifrado | SSL/TLS, Información general | Completo (estricto) | pendiente |
| Usar siempre HTTPS | SSL/TLS, Certificados perimetrales | Activado | pendiente |
| TLS mínimo | SSL/TLS, Certificados perimetrales | 1.2 | pendiente |
| Certificado de origen | SSL/TLS, Servidor de origen | ECC, `*.petid.com.pe` y `petid.com.pe`, 15 años; va cifrado en SOPS | pendiente |
| Registro DNS | DNS | `piloto`, tipo A, 194.238.30.239, con proxy | 16/11/2026 |
| TTL de caché del navegador | Almacenamiento en caché, Configuración | Respetar encabezados existentes | pendiente |

## Servidores de nombres

La zona usa `holly.ns.cloudflare.com` y `lennon.ns.cloudflare.com`.

El dominio está registrado en Layer1 Host. Su panel (Servicios > Dominios > Nameservers) acepta el cambio y muestra "Los DNS han sido actualizados correctamente", pero al recargar vuelve a `ns0` y `ns1.e-digitalhosting.net`, y el registro `.pe` responde esos mismos valores (comprobado el 16/11/2026 con `dig NS petid.com.pe @PE1.DNSNODE.NET +norecurse`). Se pidió el cambio por soporte. Hasta que se aplique, el piloto no se puede publicar en `piloto.petid.com.pe`.

Comprobación:

```bash
dig NS petid.com.pe @PE1.DNSNODE.NET +norecurse +short
```

Después de un incidente en que el origen respondió errores, se purga la caché antes de dar el servicio por recuperado.
