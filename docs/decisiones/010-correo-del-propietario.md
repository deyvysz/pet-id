# 010. Correo del propietario para avisos

Fecha: 12 de noviembre de 2026. Decidió: Deyvys.

El ingreso sigue siendo con celular y código SMS (decisión 009), pero el registro pide además un correo obligatorio. Cuando alguien encuentra la mascota y escribe desde su página, el aviso se envía a ese correo con Resend.

Por qué: con ingreso solo por celular, el propietario no tenía correo y los mensajes de quien encontraba la mascota se guardaban sin notificar. El SMS saliente necesitaría un proveedor de pago; Resend tiene plan gratuito.

Cambios: migración 0009 (columna `perfiles.correo` con validación de formato, editable por el propietario), campo de correo en crear cuenta y en mi perfil, y la ruta `/api/v1/contacto` lee el correo desde `perfiles`. El correo no aparece en ninguna página pública.
