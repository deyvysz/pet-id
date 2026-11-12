# Conjunto de evaluación del reconocimiento

Sirve para medir Recall@1/5/10 y calibrar el umbral antes de mostrar candidatos a usuarios. Mientras no haya medición con este conjunto, no se promete ningún porcentaje de acierto.

## Cómo armarlo

Mínimo 50 mascotas con 3 fotos o más cada una. Con menos, el script corre pero avisa, y los resultados varían mucho de una ronda a otra.

Estructura:

```
dataset/
  luna-0001/
    1.jpg
    2.jpg
    3.jpg
  rocky-0002/
    a.jpg
    b.jpg
    c.jpg
    d.jpg
```

Cada carpeta es una mascota; el nombre de la carpeta es su identificador y no se usa para otra cosa. Extensiones aceptadas: jpg, jpeg, png, webp. La carpeta `dataset/` está en `.gitignore`: las fotos no se suben al repositorio.

Criterios para las fotos:

- Fotos tomadas en días o lugares distintos. Tres fotos de la misma ráfaga dan un Recall inflado.
- Al menos una foto parecida a la de un hallazgo real: tomada con celular, de pie, a distancia, con la mascota de lado o de espaldas.
- Perros y gatos en proporción parecida a la esperada en la plataforma. Incluir mestizos y razas de pelaje uniforme (labrador negro, gato atigrado), que son los casos difíciles.
- Varias mascotas parecidas entre sí (misma raza y color) para que el umbral no quede optimista.
- Una mascota por foto. Si hay dos, el servicio la rechaza con `varias_mascotas`.

Fuentes posibles: fotos de mascotas del equipo y conocidos con su permiso, y fotos de refugios con autorización escrita. Las primeras mascotas registradas en la plataforma servirán para ampliar el conjunto si los términos de uso lo permiten.

## Cómo correrlo

Desde `src/reconocimiento`, con los modelos reales instalados (o dentro de la imagen Docker):

```
MODELO=real python eval/evaluar.py dataset/ --rondas 5
```

Opciones:

- `--rondas N`: repite la división con N fotos de consulta distintas y junta los resultados.
- `--tipo`: tipo de foto con que se procesa todo. Por defecto `hallazgo`, que no usa el rostro aproximado (solo el rostro detectado por OWL-ViT).
- `--sin-calidad`: no rechaza fotos por tamaño, brillo o nitidez.
- `--por-especie`: filtra candidatos por la especie detectada en la consulta, como hace la búsqueda real con la especie que indica quien encontró la mascota.

## Qué mide

Por cada mascota se aparta una foto como consulta y el resto queda en la galería. Se buscan todas las consultas contra la galería con el mismo puntaje de producción (60 % rostro y 40 % cuerpo; sin rostro, solo cuerpo).

- Recall@K: proporción de consultas en que la mascota correcta aparece entre los K primeros.
- Azar: Recall@K esperado si se eligieran K candidatos al azar. Si el modelo no supera esta columna con holgura, no funciona.
- Umbral que maximiza F1: compara el puntaje de la mascota correcta contra el de todas las demás.
- Umbral con falsos positivos < 5 %: el menor puntaje en que menos del 5 % de las mascotas incorrectas lo superan. Es el candidato a umbral de producción para mostrar hasta 5 candidatos.

Las fotos rechazadas (sin mascota, borrosa, oscura, varias) no cuentan en el Recall; se informa cuántas fueron y por qué.
