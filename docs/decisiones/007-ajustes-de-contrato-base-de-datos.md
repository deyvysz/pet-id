# 007. Ajustes de contrato tras la base de datos

Fecha: 12 de noviembre de 2026. Decidió: Deyvys (coordinación de Claude), a partir del informe del agente 1.

1. Mensaje de la cola `fotos_por_procesar`: `{"foto_id","mascota_id","tipo","ruta_storage"}`. No lleva URL firmada porque SQL no puede generarla; el worker de reconocimiento la firma. Solo se encolan fotos de mascota en estado `pendiente`; las fotos de hallazgo van a `/embed` de forma síncrona.
2. El certificado PDF se guarda en `documentos/{mascota_id}/certificados/`. Lo escribe el servidor con la clave de servicio; el propietario solo lo lee.
3. El estado de la mascota sigue al reporte de pérdida mediante trigger (migración 0005): reporte activo → `extraviada`; reporte cerrado → `encontrada`.
4. El perfil público se sirve en `/api/v1/publico/{pet_id}` para no chocar con `/api/v1/mascotas/{id}/...` del propietario.

Pendiente de decidir: el anónimo puede listar la vista `mascotas_publico` completa y el `pet_id` es secuencial. Si se quiere evitar que alguien recorra los números, se reemplaza la lectura directa por una función que reciba un `pet_id` y se revoca el `select` de la vista.
