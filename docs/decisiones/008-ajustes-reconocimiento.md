# 008. Ajustes tras el servicio de reconocimiento

Fecha: 12 de noviembre de 2026. Decidió: Deyvys (coordinación de Claude), a partir del informe del agente 2.

1. Motivos de rechazo nuevos: `pequena` (lado menor bajo 400 px) y `error_proceso` (el worker agotó reintentos).
2. `/search` devuelve `foto_id` por candidato, no `foto_url`; la web firma la URL. Se corrigió `contratos-api.md`.
3. El rostro aproximado (mitad superior de la caja) solo se calcula en fotos `frente`, `perfil_izq` y `perfil_der`. En `cuerpo`, `marcas` y `hallazgo` va `rostro: null` y la búsqueda usa solo cuerpo.
4. `lista_para_busqueda` la mantiene solo el trigger de la migración 0004; el worker no la recalcula.
5. Migración 0006: `buscar_similares` ya no repite mascotas con dos reportes activos y el filtro de distrito ya no deja pasar mascotas sin reporte.
6. El worker y la API de hallazgos se conectan con el rol de servicio (saltan RLS).

Pendiente: probar con los pesos reales de OWL-ViT y DINOv2 fuera de este entorno, y armar el conjunto de evaluación.
