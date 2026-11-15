# Ajustes de Cloudflare hechos a mano

Zona `petid.com.pe`. Lo que configura Ansible se repite solo; lo de esta tabla se hace en el panel y se anota aquí el mismo día, con su fecha.

| Ajuste | Dónde, en el panel | Valor | Desde |
|---|---|---|---|
| Cifrado | SSL/TLS, Información general | Completo (estricto) | pendiente |
| Usar siempre HTTPS | SSL/TLS, Certificados perimetrales | Activado | pendiente |
| TLS mínimo | SSL/TLS, Certificados perimetrales | 1.2 | pendiente |
| Certificado de origen | SSL/TLS, Servidor de origen | ECC, `*.petid.com.pe` y `petid.com.pe`, 15 años; va cifrado en SOPS | pendiente |
| Registro DNS | DNS | `piloto`, tipo A, IP pública del servidor, con proxy | pendiente |
| Access | Zero Trust, Acceso, Aplicaciones | Aplicación `piloto.petid.com.pe`, política "Invitados del piloto" con la lista de correos, código por correo | pendiente |
| TTL de caché del navegador | Almacenamiento en caché, Configuración | Respetar encabezados existentes | pendiente |

Después de un incidente en que el origen respondió errores, se purga la caché antes de dar el servicio por recuperado.
