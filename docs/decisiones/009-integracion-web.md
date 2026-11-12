# 009. Integración de la web

Fecha: 12 de noviembre de 2026. Decidió: Deyvys (coordinación de Claude), a partir de los informes de los agentes 3 y 4.

1. El propietario ingresa con celular y código SMS (Supabase Auth, proveedor SMS). No hay correo ni contraseña en la fase 1.
2. `perfiles.celular_verificado` lo marca un trigger sobre `auth.users.phone_confirmed_at` (migración 0007).
3. El QR apunta a `/m/{pet_id}`. Las rutas `/api/v1/mascotas/{id}/qr` y `/api/v1/mascotas/{id}/certificado` aceptan uuid o PET ID.
4. El certificado y el DNI en PDF se generan en el servidor con pdf-lib; la primera descarga crea la fila en `certificados` y guarda la copia en `documentos/{mascota_id}/certificados/`.
5. Dependencias agregadas: qrcode 1.5.4, pdf-lib 1.17.1.
6. Las familias tipográficas se declaran en `body`, donde next/font define sus variables.

Pendiente de definir por Deyvys: precio de Premium (la portada muestra S/ 9.90 como referencial), correo de contacto del pie y textos legales (términos, privacidad, libro de reclamaciones).
