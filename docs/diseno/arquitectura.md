# Arquitectura

Fecha: 12 de noviembre de 2026.

## Piezas

- Web (Next.js): registro, DNI, salud, reportes, búsqueda y panel de administración. Se despliega como una sola aplicación responsiva.
- Supabase: Auth (correo y OTP por SMS), Postgres con pgvector, Storage para fotos y PDF, colas (pgmq) para el procesamiento de imágenes.
- Servicio de reconocimiento (Python FastAPI): detecta la mascota, recorta rostro y cuerpo, genera vectores DINOv2 ViT-B/14 de 768 dimensiones.
- Correo transaccional (Resend o Postmark) y SMS para OTP y avisos.
- Generación de PDF y QR en el servidor web.

## Registro con fotos

1. El propietario sube las fotos guiadas: frente, perfil izquierdo, perfil derecho, cuerpo completo y una de marcas o manchas si las tiene. El navegador revisa tamaño, brillo y nitidez antes de subir.
2. Las fotos van a Storage; se encola un trabajo por foto.
3. El servicio de reconocimiento detecta la mascota, recorta, genera los vectores y los guarda en `vectores_foto`.
4. La ficha pasa a "lista para búsqueda" cuando tiene al menos un vector de rostro y uno de cuerpo.

## Búsqueda por foto del hallazgo

1. Quien encontró la mascota sube una foto y, si puede, especie, distrito y color.
2. Se generan los vectores de la foto.
3. Postgres busca por similitud coseno con índice HNSW, filtrando por especie y, si hay, por zona y por estado "Extraviada" primero.
4. Puntaje combinado: 60 % rostro y 40 % cuerpo; si no hay rostro, solo cuerpo.
5. Se muestran hasta 5 candidatos sobre el umbral calibrado. Nunca se muestran datos del propietario: el contacto pasa por el formulario de PET ID.

## Licencias de modelos

Ver `docs/decisiones/003-licencias-modelos.md`.
