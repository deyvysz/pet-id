# Servicio de reconocimiento

Servicio interno en Python FastAPI. Recibe una foto, detecta la mascota, recorta cuerpo y rostro y devuelve dos vectores de 768 dimensiones; también busca mascotas parecidas en Postgres. Los contratos están en `app/contratos.py` (congelados el 12 de noviembre de 2026; ver `docs/decisiones/006-contratos-dia-1.md`).

## Modelos

- Detección: OWL-ViT (`google/owlvit-base-patch32`, Apache 2.0) con las consultas "dog", "cat", "dog's face" y "cat's face".
- Vectores: DINOv2 ViT-B/14 (`facebook/dinov2-base`, Apache 2.0). Token CLS normalizado L2, 768 dimensiones.

No se usan Ultralytics YOLO ni MegaDescriptor por sus licencias (`docs/decisiones/003-licencias-modelos.md`). Ambos modelos se pueden cambiar con `MODELO_DETECTOR` y `MODELO_VECTORES`, siempre que el de vectores dé 768 dimensiones (el servicio se niega a arrancar si no).

## Rutas

- `GET /health`: estado y qué implementaciones están cargadas.
- `POST /embed`: `{foto_id, url, tipo}` → `{foto_id, detectado, motivo, especie, calidad, vectores}`. Si la URL no se puede descargar o no es una imagen, responde 422.
- `POST /search`: `{vectores, filtros, limite}` → `{candidatos: [{mascota_id, puntaje, foto_id}]}`. Con `DATABASE_URL` llama a la función SQL `buscar_similares`; sin ella usa un índice en memoria vacío (solo para pruebas). `limite` se acota entre 1 y 50.

## Flujo de /embed

1. Se corrige la orientación EXIF y se reduce a 1600 px de lado mayor.
2. Tamaño y brillo sobre la foto completa: lado menor bajo 400 px → `pequena`; luminancia media bajo 40 → `oscura`.
3. Detección. Ninguna mascota → `sin_mascota` (o `borrosa` si la foto entera está desenfocada). Dos o más → `varias_mascotas`. Una cabeza detectada dentro del cuerpo no cuenta como segunda mascota, ni un animal lejano con menos del 25 % del área de la principal.
4. Nitidez (varianza del Laplaciano) sobre el recorte del cuerpo, no sobre la foto entera, para no rechazar fotos con fondo desenfocado. Bajo 60 → `borrosa`.
5. Vectores de cuerpo y de rostro en un solo lote. El rostro sale de la detección "dog face"/"cat face"; si OWL-ViT no lo encuentra, se aproxima con la mitad superior del cuerpo, pero solo en fotos `frente`, `perfil_izq` y `perfil_der`. En `cuerpo`, `marcas` y `hallazgo` el animal puede estar de lado y esa aproximación daría un vector de rostro malo con 60 % del peso; ahí se devuelve `rostro: null` y la búsqueda usa solo el cuerpo.
6. En `marcas`, si no se detecta animal (primer plano del pelaje), se usa la foto entera como cuerpo.

`calidad` (0 a 1) promedia brillo y nitidez; es informativa. Los umbrales se cambian con `CALIDAD_LADO_MIN`, `CALIDAD_BRILLO_MIN` y `CALIDAD_NITIDEZ_MIN`, y conviene recalibrarlos con fotos reales.

## Worker de la cola

`python -m app.cola` lee `fotos_por_procesar` (pgmq) con mensajes `{"foto_id", "mascota_id", "tipo", "ruta_storage"}` (decisión 007). Solo llegan fotos de mascota; las de hallazgo van por /embed síncrono. Por cada mensaje: marca la foto `procesando`, lee el objeto del bucket `fotos` con la clave de servicio (`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`), aplica el flujo de /embed, reemplaza sus filas en `vectores_foto`, deja la foto `lista` o `rechazada` con su motivo y calidad y borra el mensaje, todo en una transacción. `mascotas.lista_para_busqueda` la mantiene un trigger de la migración 0004. La especie que se guarda es la declarada en `mascotas`; la detectada se usa solo si no hay otra.

Si algo falla, el mensaje vuelve a la cola cuando vence su visibilidad (120 s). Tras 5 intentos se archiva y la foto queda `rechazada` con motivo `error_proceso`.

## Variables de entorno

| Variable | Uso | Valor por defecto |
|---|---|---|
| `MODELO` | `real` o `falso` | `real` |
| `DATABASE_URL` | Postgres para /search y el worker | vacío (índice en memoria) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | lectura de Storage en el worker | vacío |
| `URL_HOSTS_PERMITIDOS` | hosts de descarga permitidos, separados por coma | vacío (cualquiera) |
| `DESCARGA_MAX_BYTES`, `DESCARGA_TIMEOUT` | límites de descarga | 15 MB, 15 s |
| `COLA`, `COLA_VISIBILIDAD_S`, `COLA_MAX_INTENTOS` | worker | `fotos_por_procesar`, 120, 5 |

En producción conviene fijar `URL_HOSTS_PERMITIDOS` al dominio del proyecto Supabase para que el servicio no descargue de cualquier URL.

## Desarrollo y pruebas

```
cd src/reconocimiento
pip install -r requirements-pruebas.txt
pytest
```

Las pruebas usan `FalsaDetector` y `ExtractorFalso`, que no necesitan torch ni transformers. `FalsaDetector` decide por el color de la esquina superior izquierda (8x8 px) de la imagen: rojo, sin mascota; azul, dos mascotas; verde, gato; amarillo, perro sin rostro detectado; cualquier otro, perro con rostro. `ExtractorFalso` convierte el hash de los píxeles en un vector normalizado.

Servicio local con falsos: `MODELO=falso uvicorn app.main:app --reload`.

## Docker

```
docker build -t pet-id-reconocimiento src/reconocimiento
docker run -p 8000:8000 -e DATABASE_URL=... pet-id-reconocimiento
docker run -e DATABASE_URL=... -e SUPABASE_URL=... -e SUPABASE_SERVICE_ROLE_KEY=... pet-id-reconocimiento python -m app.cola
```

La imagen instala torch para CPU y descarga los pesos de ambos modelos en el build; al arrancar no sale a Hugging Face.

## Evaluación

`eval/evaluar.py` calcula Recall@1/5/10, la línea base aleatoria y propone un umbral. Cómo armar el conjunto: `eval/README.md`.
