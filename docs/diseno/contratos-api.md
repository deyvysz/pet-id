# Contratos de API

Fecha: 12 de noviembre de 2026. Se fijan el día 1 de construcción; después solo se cambian con una decisión anotada.

## Servicio de reconocimiento (interno)

`POST /embed`
Entrada: `{ "foto_id": "uuid", "url": "https://... (URL firmada)", "tipo": "frente|perfil_izq|perfil_der|cuerpo|marcas|hallazgo" }`
Salida: `{ "foto_id": "uuid", "detectado": true, "especie": "perro|gato", "calidad": 0.0-1.0, "vectores": { "rostro": [768], "cuerpo": [768] } }`
Si no detecta mascota: `detectado: false` y un motivo (`sin_mascota`, `borrosa`, `oscura`, `varias_mascotas`).

`POST /search`
Entrada: `{ "vectores": { "rostro": [768]|null, "cuerpo": [768] }, "filtros": { "especie": "perro", "distrito": "Miraflores", "solo_extraviadas": true }, "limite": 5 }`
Salida: `{ "candidatos": [ { "mascota_id": "uuid", "puntaje": 0.83, "foto_url": "..." } ] }`

`GET /health`

## API pública de la web (expuesta)

- `GET /api/v1/verificar/{codigo}`: valida un certificado (ej. `PID-7Q4K-92XM`). Devuelve nombre de la mascota, especie, PET ID, estado y fecha de emisión. Sin datos del propietario.
- `GET /api/v1/publico/{pet_id}`: perfil público que abre el QR. Si está "Extraviada", incluye el botón de contacto.
- `POST /api/v1/hallazgos`: foto y datos del hallazgo; devuelve candidatos.
- `POST /api/v1/contacto`: mensaje de quien encontró hacia el propietario; se reenvía por correo y SMS.

Para terceros (veterinarias, municipalidades) en fase 2: autenticación por clave de API y límite de peticiones.

## Estados de la mascota

`activa`, `extraviada`, `encontrada`, `fallecida`.
