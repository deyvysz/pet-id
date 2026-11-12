# Plan de construcción con agentes

Fecha: 12 de noviembre de 2026.

Cuatro frentes en paralelo, cada uno con un agente y revisión de Deyvys al cierre del día.

1. Base de datos y Auth: esquema, RLS, Storage, colas, OTP.
2. Reconocimiento: servicio FastAPI, detector, vectores, búsqueda HNSW, conjunto de evaluación y calibración del umbral.
3. Web del propietario: registro, fotos guiadas, DNI, certificado PDF, QR, salud.
4. Web pública y administración: perfil por QR, reporte de pérdida, hallazgo con foto, contacto, panel.

Día 1: contratos de `docs/diseno/contratos-api.md` y esquema congelados. Ningún frente empieza a codificar antes.
Último día: pruebas de punta a punta con los flujos del prototipo y medición Recall@1/5/10.
