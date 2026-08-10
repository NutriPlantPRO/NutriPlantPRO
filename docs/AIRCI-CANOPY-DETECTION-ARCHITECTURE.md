# AirCI — Arquitectura de detección de copas

**Estado:** CERRADA y detallada (lista para implementar).  
**Fecha:** 2026-08-07  

Docs relacionados: plan de producto · `AIRCI-STATUS.md` · README del worker.

---

# PARTE A — Yo soy AirCI: qué me hace falta para acertar

Piensa que **yo soy el motor** que mira el ortomosaico.  
No “veo árboles” como persona. Solo puedo acertar si me das **datos correctos** y un **patrón claro**.

## A1. Qué quiero lograr

Contarte, con poca mentira:

- **cuántas** plantas hay en el predio,  
- **dónde** está cada una (centro + perímetro de copa),  
- **cuál está chica / normal / grande** (semáforo).

## A2. Lo que NO puedo adivinar solo

Si solo me tiras la foto RGB:

| No sé solo | Por qué |
|------------|---------|
| Si el verde es **copa** o **pasto** | Los dos son verdes |
| Cuántas plantas “deberían” caber | Sin densidad invento de más o de menos |
| Hacia dónde van las **hileras** | Sin tus marcas no hay dirección |
| El tamaño real de una copa típica | Sin tus 10 no sé el Ø del cultivo |
| Dónde termina el predio útil | Sin geo/escala las distancias mienten |

Por eso **fallo** si me dejas solo con “busca lo verde”.

## A3. Lo que SÍ necesito de ti (checklist de oro)

### 1) Ortomosaico bueno (la foto del predio)

| Requisito | Detalle fino | Si falta… |
|-----------|--------------|-----------|
| GeoTIFF georreferenciado | Con CRS y transformación reales | No puedo medir metros ni espaciar |
| Escala (GSD) | cm/píxel o derivable del TIFF | Diámetros y densidad salen basura |
| Vista casi nadir | Drone arriba, no oblicua fuerte | Las copas se deforman y las sombras engañan |
| Resolución útil | Ideal ~2–10 cm/px en huerta | Muy burdo = no separo plantas; muy fino = lento/caro |
| Exposición decente | Ni quemado ni negro | Pierdo contraste copa/calle |
| Un solo vuelo / un orto | No mezclar dos fechas en un TIFF | Patrones incoherentes |

**Ideal:** orto WebODM (u otro) bien cerrado, mismo predio que vas a analizar.

### 2) Densidad real del predio (árboles/ha)

| Requisito | Detalle fino | Si falta… |
|-----------|--------------|-----------|
| Número creíble | Ej. 100–800/ha según cultivo; rango duro ~20–2500 | No sé cada cuántos metros poner un candidato |
| Del **mismo** diseño de plantación | No densidad de otro bloque | La rejilla no coincide con la realidad |
| Preferible exacta o de plano | Mejor que “más o menos” | Error de espaciado se multiplica en todo el predio |

**Para mí la densidad es la regla:**  
`espaciado_aprox_m ≈ sqrt(10000 / árboles_por_ha)`.

Ejemplo: 400/ha → ~5 m entre plantas (orden de magnitud).

### 3) Tus 10 árboles marcados a mano (la clase particular)

No son “para desbloquear el botón”. Son **mi maestro**.

| Qué me das en cada uno | Para qué lo uso |
|------------------------|-----------------|
| Clic en el **centro** real de la planta | Punto de verdad |
| **Perímetro** ajustado a la copa (no al pasto) | Forma y Ø típico |
| 10 plantas **representativas** | Variadas en tamaño, no las 10 más raras |
| En **varias zonas** del predio (no todas juntas) | Puedo estimar dirección de hilera |
| En la **misma** edad/marco que el resto | Si marcas solo renuevos, el patrón miente |

**Cómo las elijo (instrucción al humano):**

1. Elige 10 plantas que se vean **claras** en el orto.  
2. Repártelas: unas al norte, sur, centro (si se puede).  
3. Incluye 1–2 un poco chicas y 1–2 grandes, no solo “perfectas”.  
4. Ajusta el polígono **pegado a la hoja**, no al sombra larga ni al pasto.  
5. Confirma las 10 **antes** de Analizar.

### 4) Metadatos que me ayudan (no sustituyen lo de arriba)

| Campo | Para qué |
|-------|----------|
| Cultivo / variedad | Contexto (aguacate ≠ limón); no detecta solo |
| Edad | Expectativa de Ø; apoyo |
| Título / predio | Organización |

### 5) Lo que me pides después (opcional pero útil)

- Contar a mano una **parcela chica** (ej. 50–100 árboles) para validar.  
- Corregir errores con el editor (pero si hay muchos, **re-calibra y re-analiza**; no parches eternos).

## A4. Mi receta interna (cómo pienso el análisis)

```text
TÚ me das:  orto bueno + densidad + 10 copas bien dibujadas
        │
        ▼
YO aprendo el PATRÓN:
   - qué tan grande es una copa típica
   - cada cuántos metros va una planta en la hilera
   - hacia dónde apunta la hilera
   - cada cuántos metros está la siguiente hilera
        │
        ▼
YO dibujo una REJILLA de candidatos sobre todo el predio
   (posiciones “donde debería haber planta”)
        │
        ▼
EN CADA CANDIDATO miro la foto de cerca:
   - ¿hay algo que parezca copa? → marco perímetro
   - ¿no hay nada creíble? → “faltante” / hueco
        │
        ▼
SIEMPRE dejo tus 10 tal cual las dibujaste
   + las que confirmé en la rejilla
        │
        ▼
Calculo semáforo (chica / normal / grande) y guardo
```

**Frase clave:**  
La foto **confirma**.  
Tus 10 + la densidad **proponen dónde mirar**.

## A5. Señales de la foto que uso solo para confirmar (no para inventar el mapa)

En la ventanita alrededor de cada candidato:

| Señal | Me dice |
|-------|---------|
| Contraste vs calle | ¿Hay un “bulto” distinto al piso? |
| Textura | ¿Parece follaje o pasto liso? |
| Sombra al lado | ¿Hay objeto con altura? |
| Verdor relativo | Apoyo; **nunca** la única verdad |
| Tamaño vs Ø de tus 10 | ¿Es del tamaño de una planta de este predio? |
| Perfil visual de tus 10 | Brillo/textura/verdor dentro de tus polígonos; si el candidato no se parece → **faltante** |

Si el candidato cae en puro pasto uniforme → **faltante**, no invento un círculo.

**Implementado en `grid_v1.1`:** `appearance_from_calibration` lee el RGB dentro de las 10 marcas y `confirm_seed` rechaza candidatos fuera de ese perfil (pasto/sombra/suelo). El trazo no necesita ser perfecto.

## A6. Qué te devuelvo

- Mapa con cada planta (tus 10 con estilo distinto = “calibración”).  
- Conteo total vs conteo esperado (densidad × hectáreas del orto).  
- Lista / tabla con área, Ø, semáforo.  
- Posibilidad de editar a mano después.

---

# PARTE B — Contrato técnico (para implementar sin ambigüedad)

## B1. Reglas de oro

1. Las 10 del usuario **siempre** quedan en el resultado con su polígono (`is_manual = true`).  
2. La densidad manda el espaciado de la rejilla; si no hay, se estima con las 10 (peor).  
3. El RGB **no** inventa centros libres por todo el tile.  
4. Motor oficial de predio: **Cloud** (`detector.py`).  
5. Un solo resultado `current` por vuelo tras Analizar.  
6. Sin prueba contada (§B7), no se declara “listo”.

## B2. Entradas del job Professional

| Campo | Obligatorio | Regla |
|-------|-------------|--------|
| GeoTIFF en Storage + `flight_id` | Sí | Con geo + GSD usable |
| `calibration.samples[10]` | Sí | centro + polygon_json + diameter_m |
| `target_trees_per_ha` | Sí en UI (warning si vacío) | 20–2500 |
| `min/max canopy` | Derivado de las 10 | No hardcode genérico |

## B3. Pipeline cerrado (A → B → C → D)

### Etapa A — `pattern_from_calibration`

**Salida `PlantingPattern`:**

| Campo | Cálculo |
|-------|---------|
| `typical_diam_m` | Mediana Ø de las 10 |
| `spacing_in_row_m` | Si hay densidad: `sqrt(10000/dens)`; si no: mediana NN entre centros |
| `row_azimuth_deg` | Ángulo dominante de alineación de los 10 centros |
| `spacing_between_rows_m` | Derivado de densidad + paso en hilera, o 2.ª distancia típica ⊥ a la hilera |

Si el patrón es inestable → error `PATTERN_UNSTABLE` (no caer al detector viejo en silencio).

### Etapa B — `seed_grid`

Genera candidatos sobre el bbox del orto:

- paso en hilera ≈ `spacing_in_row_m`  
- paso entre hileras ≈ `spacing_between_rows_m`  
- cantidad de seeds del orden `densidad × ha`  

### Etapa C — `confirm_seed`

Por cada seed, ventana RGB ~ 1.2–1.5 × Ø típico:

- confirmado → polígono + confidence  
- faltante → sin copa creíble  
- el centro puede moverse ≤ 25 % del paso en hilera; si necesita más → faltante  

### Etapa D — `merge_and_score`

1. Meter las 10 intactas.  
2. Tirar seeds a < 0.45 × `spacing_in_row_m` de una ancla.  
3. Añadir confirmados.  
4. Semáforo por área vs media.  
5. Stats: `count`, `expectedTrees`, `calibrationAnchors`, `missingCount`, `plantingPattern`, `detectorVersion`.

## B4. Gate de calidad de las 10 (antes de Analizar)

| Check | Regla dura |
|-------|------------|
| Cantidad | = 10 |
| Polígono | ≥ 3 puntos, área > 0 |
| No pegadas | centros ≥ 0.35 × mediana Ø |
| No todas en un rincón | warning si bbox(10) ≪ bbox(orto) |
| Densidad | warning si vacía; error si fuera de 20–2500 |

## B5. Errores claros (ejemplos)

- `CALIBRATION_REQUIRED` — faltan las 10  
- `PATTERN_UNSTABLE` — no hay hilera clara  
- `NO_GSD` — orto sin escala  
- `TOO_MANY_SEEDS` — densidad/espaciado incoherente  
- `WORKER_TIMEOUT` — predio/presupuesto  

## B6. UI mínima

- Densidad visible y insistida antes de Analizar.  
- Anclas de calibración con **color/estilo distinto** en el resultado.  
- Stats: esperados vs detectados vs anclas.  
- Editor manual sigue; no reemplaza re-analizar si el patrón estaba mal.

## B7. Definición de “listo” (como NutriPlant)

1. Zona con N árboles contados a mano.  
2. Análisis con 10 + densidad.  
3. Error de conteo `|det − N|/N ≤ 10 %`.  
4. Las 10 anclas coinciden (centro ≤ 0.5 × Ø típico).  
5. Worker desplegado con ese `detectorVersion`.  
6. Este documento describe el código real.

## B8. Fuera de alcance ahora

Fenología automática · Color Score · entrenar red desde cero · generar el orto dentro de NutriPlant · usar el detector local como verdad del predio.

## B9. IDs entre vuelos (F2.1, después de B7)

Matching por proximidad de centro + espaciado; no bloquea el primer TO-BE.

## B10. Orden de implementación

1. `pattern_from_calibration` + tests  
2. `seed_grid` + tests  
3. `confirm_seed` + tests  
4. `merge_and_score`  
5. `analyze_geotiff` solo este pipeline (sin búsqueda libre default)  
6. UI anclas + stats + gates  
7. Prueba B7  
8. Deploy Cloud + Netlify  
9. Actualizar `AIRCI-STATUS.md`

## B11. Modos

| Modo | Oficial |
|------|---------|
| Professional Cloud (este diseño) | **Sí** |
| Local navegador | Experimental |
| IA visión por recortes | Auxiliar, no oficial |

---

# PARTE C — Escalas de predio: de &lt;1 ha hasta ~30 ha+

El **mismo cerebro** (patrón → rejilla → confirmar) sirve para todos.  
Lo que cambia es la **operación**: cuántas plantas espero, cómo repartir las 10, tiles, validación y costo.

## C0. Bandas de tamaño (cerradas)

| Banda | Superficie orto | Plantas tip. (ej. 400/ha) | Cómo trabajo |
|-------|-----------------|---------------------------|--------------|
| **S — Chico** | **≤ 1 ha** (también 0.2–0.5 ha) | ~80–400 | Mismo pipeline; tiles pocos; validación = casi todo el bloque |
| **M — Mediano** | &gt; 1 ha y ≤ 10 ha | ~400–4,000 | Rejilla completa; 10 bien repartidas en el bloque |
| **L — Grande** | &gt; 10 ha (ej. **30 ha**) | ~4,000–15,000+ | Tiles + viewport; 10 en zonas A/B/C; validar 0.5–1 ha primero |

**Reglas que NO cambian con el tamaño:**

1. Siempre **10 copas + densidad** (o warning fuerte sin densidad).  
2. Siempre **rejilla desde patrón**, no “verde libre”.  
3. Siempre tus 10 quedan ancladas.  
4. Si el orto es 0.3 ha, `expectedTrees ≈ densidad × 0.3` — no invento 30 ha.

**Si el análisis es solo 1 ha (o menos):**  
- El “predio AirCI” / vuelo puede ser **ese bloque**, no toda la finca.  
- Las 10 deben estar **dentro de ese orto** (repartidas en esa hectárea).  
- No pediré azimut de 30 ha si el TIFF es 1 ha.

---

## C1. Orden de magnitud — ejemplo grande (30 ha)

| Dato | Ejemplo 30 ha |
|------|----------------|
| Superficie | 30 ha = 300,000 m² |
| Si densidad = 400 árboles/ha | **~12,000 plantas** esperadas |
| Si densidad = 200/ha | ~6,000 plantas |
| Si densidad = 600/ha | ~18,000 plantas |
| Espaciado aprox. (400/ha) | √(10000/400) ≈ **5 m** entre plantas |

Yo no “miro 30 ha de un vistazo”.  
Pienso: **patrón local → rejilla en todo el bbox → confirmar seed por seed** (por tiles).

## C1b. Predio / análisis chico (≤ 1 ha) — también válido

Muchos usos reales: un sector, un ensayo, un cuarto de bloque, un vuelo de prueba.

| Tema | Cómo lo hago en ≤ 1 ha |
|------|-------------------------|
| Expected trees | `densidad × ha_orto` (ej. 0.5 ha × 400 = **200** plantas) |
| Las 10 | Siguen siendo 10, pero **repartidas en esa 1 ha** (esquinas + centro), no en otra parte de la finca que no está en el TIFF |
| Tiles | Pocos; a veces 1–4 tiles bastan |
| Validación | Contar a mano **todo** el bloque o la mitad; no hace falta “parcela test aparte” si N &lt; ~300 |
| Costo / tiempo | Bajo; ideal para probar el motor antes de un vuelo de 30 ha |
| Riesgo típico | Marcar las 10 fuera del orto chico o con densidad de toda la finca distinta al sector |

**Flujo recomendado NutriPlant:**  
1) Probar AirCI en **0.5–1 ha** hasta pasar error ≤ 10 %.  
2) Luego subir el orto grande (10–30 ha) con la misma densidad/marco y 10 nuevas repartidas a escala.

**UI / producto:** el usuario no elige “modo chico/grande”.  
AirCI calcula `ha` del orto y aplica la banda S/M/L solo para warnings y límites (ej. si ha &lt; 0.05 → “orto demasiado chico / sin área”).

## C2. Qué me tienes que entregar (ajusta mentalmente a S / M / L)

### C2.1 Orto

| Necesito | Por qué en 30 ha |
|----------|------------------|
| Un GeoTIFF del **predio completo** (o del bloque que vas a contar) | Si el TIFF es solo 2 ha, no cuento 30 |
| Geo + GSD fiables en **todo** el archivo | Un error de escala se multiplica en miles de plantas |
| Calles/hileras visibles a esa resolución | Si el GSD es 30 cm, muchas copas se funden |
| Ideal: orto continuo, sin huecos negros grandes | Los huecos = seeds “faltantes” o basura |

**Regla práctica GSD para huerta 30 ha:**  
- Preferible **3–8 cm/px**.  
- > 15 cm/px → aviso: “resolución baja, conteo menos fiable”.

### C2.2 Densidad

En 30 ha la densidad **no es opcional de adorno**:

- Es la que dice si debo esperar ~8 mil o ~15 mil candidatos.  
- Debe ser la del **mismo marco de plantación** del bloque del orto.  
- Si el predio tiene **dos marcos** (ej. 6×4 y 5×3), **no** uses un solo análisis:  
  o das densidad del bloque dominante, o divides en dos vuelos/sectores AirCI.

### C2.3 Las 10 marcas (cómo repartirlas según tamaño)

Marcar 10 juntas en una esquina = **me enseñas mal** (en 1 ha o en 30 ha).

**Si el orto es ≤ 1 ha (banda S):**

```text
1. Zoom out: ve toda la hectárea (o fracción) del TIFF.
2. Marca 10 plantas repartidas: esquinas + centro + 1–2 en hileras medias.
3. Misma plantación / mismo marco dentro de ese orto.
4. Un polígono = una planta. Confirma 10. Densidad del SECTOR (no de otra finca).
```

**Si el orto es mediano/grande (banda M/L, ej. 10–30 ha):**

```text
1. Abre el orto completo: mira hacia dónde van las hileras.
2. Marca así (aprox.):
   - 3 plantas en un extremo (zona A)
   - 3 en el centro (zona B)
   - 3 en el otro extremo (zona C)
   - 1 en un borde / cambio de calle (zona D)
3. Las 10 en el MISMO diseño de plantación. Si hay replante distinto, no las mezcles.
4. Un polígono = una planta. Confirma 10. Densidad de ESTE bloque.
```

| Mal | Bien |
|-----|------|
| 10 en el mismo surco, 20 m de largo | 10 repartidas en A/B/C del predio |
| 10 solo donde se ve “bonito” | Incluir 1–2 más difíciles pero reales |
| Polígono que tapa 2 árboles | Un polígono = una planta |
| Densidad de otro rancho | Densidad de ESTE bloque de 30 ha |

**Por qué me basta 10 y no 300:**  
Las 10 no son el inventario. Son el **patrón**.  
El inventario lo saco con la **rejilla × confirmación** en las ~12,000 posiciones.

## C3. Cómo extraigo la info (pasos mentales en 30 ha)

```text
PASO 1 — Medir el escenario
  - ha del orto (GSD × píxeles)
  - expectedTrees ≈ densidad × ha
  - Si expectedTrees > 50,000 → pedir confirmación / sectorizar
    (protección de costo y tiempo)

PASO 2 — Aprender patrón con tus 10
  - Ø típico (mediana)
  - dirección de hilera (ángulo)
  - paso en hilera y entre hileras
  - Validar: expected spacing vs NN de las 10 (si discrepan mucho → PATTERN_UNSTABLE o warning)

PASO 3 — Generar seeds en TODO el predio
  - Rejilla alineada al azimut de hilera
  - Cubrir bbox del orto (o máscara de predio si existiera)
  - Orden de magnitud ≈ expectedTrees (no 5× de más)

PASO 4 — Recorrer por TILES (memoria)
  - No cargo 30 ha enteras en RAM
  - Tile tip. 2048 px, overlap suficiente (> 1 × Ø en px)
  - Por cada seed cuyo centro cae en el tile → confirm_seed
  - Deduplicar seeds en overlap (mismo criterio NMS / grid id)

PASO 5 — Confirmar planta en cada seed
  - Recorte local ~ 1.2–1.5 × Ø
  - ¿Contraste + textura + tamaño creíble? → polígono
  - ¿Pasto / suelo / nada? → missing
  - ¿Dos copas en un seed? → quedarme con la del centro (no unir hilera)

PASO 6 — Fusionar
  - Tus 10 siempre
  - + confirmados
  - Stats: detectados / esperados / faltantes / anclas

PASO 7 — Entregar para revisión humana
  - Mapa con anclas distintas
  - Tabla paginada (miles de filas)
  - Editor solo para correcciones puntuales
```

## C4. Datos extra que me harían MÁS preciso en 30 ha (prioridad)

No todos son obligatorios día 1; están ordenados por impacto.

| Prioridad | Dato | Para qué |
|-----------|------|----------|
| P0 | Densidad exacta del bloque | Tamaño de la rejilla |
| P0 | 10 copas repartidas A/B/C | Ángulo y paso reales |
| P0 | Orto geo + GSD 3–8 cm | Metros y contornos |
| P1 | **Azimut de hilera** (si lo sabes, ej. 35°) | Si tus 10 están dudosas, me lo das tú |
| P1 | **Marco** texto (ej. 5 m × 6 m) | Validar vs densidad: 5×6 → 333/ha |
| P1 | Contorno del predio (polígono) | No poner seeds en monte/camino fuera de huerta |
| P2 | Zona de validación (1 ha contada a mano) | Probar error ≤ 10 % antes de confiar en 30 ha |
| P2 | Máscara “solo huerta” / excluir caseta, bordo | Menos falsos en infraestructura |
| P3 | Segundo set de 10 en zona distinta si hay 2 marcos | Dos patrones = dos análisis |
| P3 | Fecha de vuelo + tip fenológico | Contexto; no detecta solo |

**Marco vs densidad (chequeo cruzado):**  
Si me das marco 5×6 m → 10,000/(5×6) ≈ 333/ha.  
Si me das densidad 600/ha, **conflicto** → warning: “marco y densidad no cuadran; ¿cuál es el bueno?”

## C5. Límites operativos en 30 ha (para no romper Cloud)

| Tema | Regla |
|------|--------|
| Plants esperadas | Si > 40,000 → pedir sectorizar o subir `cost_cap` / tiempo a conciencia |
| Tiempo job | Presupuesto ~840 s; tiles + seeds deben entrar |
| Memoria | Solo un tile a la vez + índice de seeds |
| Guardado | Inserts por lotes (ej. 500) ya previsto en worker |
| UI | Nunca dibujar 12,000 polígonos densos a la vez: viewport + límite (ej. 1000) + tabla paginada |

## C6. Validación según tamaño

| Banda | Cómo valido |
|-------|-------------|
| **S (≤ 1 ha)** | Cuento a mano casi todo (o 100 %). Si `|det−N|/N ≤ 10 %` → OK para ese bloque. |
| **M (1–10 ha)** | Parcela test 0.5–1 ha contada a mano dentro del orto; luego reviso el resto. |
| **L (&gt; 10 ha, ej. 30)** | Igual: test 0.5–1 ha primero; **no** creer 12,000 plantas sin esa prueba. |

Si error > 10 % → corrijo 10 / densidad / marco; **no** “afino umbral verde”.

## C7. Fallas típicas en 30 ha (y qué hacer)

| Síntoma | Causa probable | Acción |
|---------|----------------|--------|
| Detecta 3× de más | Densidad baja o seeds en pasto sin confirm estricto | Subir densidad correcta; endurecer confirm_seed |
| Detecta 3× de menos | Densidad alta mal puesta o GSD mal | Revisar densidad/GSD; no bajar umbral a lo loco |
| Hileras torcidas en el mapa | Azimut mal estimado (10 mal repartidas) | Rehacer 10 en A/B/C; opcional azimut manual |
| Bien en una punta, mal en la otra | Dos marcos / dos edades en el mismo TIFF | Partir en 2 sitios AirCI |
| Miles en el camino/bordo | Sin polígono de predio | Añadir contorno predio (P1) |
| Job se cae a los 10 min | Orto enorme + seeds de más | Sectorizar o bajar overlap/tile con cuidado |

## C8. Mini-contrato “prompt” para el motor (30 ha)

Texto que cualquier implementador/IA debe respetar:

> Dado un GeoTIFF georreferenciado de un predio (~30 ha), una densidad árboles/ha del mismo marco, y exactamente 10 polígonos de copa repartidos en el predio: (1) estima patrón de plantación (Ø, azimut, paso en hilera y entre hileras); (2) genera una rejilla de candidatos sobre el bbox (o contorno) del predio con ese patrón; (3) confirma cada candidato con evidencia RGB local (contraste, textura, sombra, tamaño vs Ø); (4) conserva las 10 marcas intactas; (5) devuelve árboles + stats (esperados, detectados, faltantes). No uses umbral de vegetación global para inventar centros fuera de la rejilla.

---

# PARTE D — Resumen brutalmente claro

| Pregunta | Respuesta |
|----------|-----------|
| ¿Qué me hace falta para analizar bien? | Orto geo bueno + **densidad** + **10 copas bien hechas y repartidas** |
| ¿Sirve para 1 ha o menos? | **Sí** — misma lógica; menos plantas; 10 dentro de ese orto chico |
| ¿Y para 30 ha? | **Sí** — mismos pasos; más tiles; 10 en A/B/C; validar 0.5–1 ha primero |
| ¿Qué cambia con el tamaño? | expectedTrees, repartición de las 10, costo, rigor de validación — **no** el algoritmo |
| ¿Para qué las 10? | Enseñarme tamaño, distancia y dirección de hilera |
| ¿Para qué la densidad? | Cada cuántos metros y cuántas esperar (`dens × ha` del orto) |
| ¿Para qué la foto? | Confirmar cada hueco de la rejilla |
| ¿Qué más me gustaría? | Marco m×m, azimut, contorno del predio, parcela test |
| ¿Está esto en el código hoy? | **No** |
| ¿Qué sigue? | Implementar Parte B + checklist Pro (Parte E) |

---

# PARTE E — Nivel SUPER PRO (lo que yo sumaría sí o sí)

Esto es lo que separa un MVP frágil de algo **serio como el resto de NutriPlant**.

## E1. Contrato JSON (sin ambigüedad al codear)

### E1.1 `options` al hacer enqueue (Professional)

```json
{
  "detector_mode": "grid_v1",
  "target_trees_per_ha": 400,
  "planting_frame_m": { "in_row": 5.0, "between_rows": 6.0 },
  "row_azimuth_deg": null,
  "cost_cap_usd": 1.0,
  "calibration": {
    "version": 1,
    "samples": [
      {
        "sample_index": 1,
        "center_lat": 19.123456,
        "center_lng": -102.123456,
        "diameter_m": 3.2,
        "area_m2": 8.1,
        "polygon_json": [[19.12345, -102.12340], [19.12348, -102.12350]]
      }
    ]
  }
}
```

Notas:

- `samples.length` **debe ser 10**.  
- `planting_frame_m` y `row_azimuth_deg` opcionales pero **pro**.  
- `detector_mode: "grid_v1"` = este diseño (no el viejo “verde libre”).

### E1.2 `stats_json` de un resultado pro

```json
{
  "count": 11840,
  "expectedTrees": 12000,
  "missingCount": 210,
  "calibrationAnchors": 10,
  "coverPct": 34.2,
  "orthoAreaHa": 30.0,
  "targetTreesPerHa": 400,
  "expectedSpacingM": 5.0,
  "plantingPattern": {
    "typical_diam_m": 3.1,
    "spacing_in_row_m": 5.0,
    "spacing_between_rows_m": 6.0,
    "row_azimuth_deg": 42.5,
    "source": "density+calibration"
  },
  "detectorVersion": "airci-grid-v1.0.0",
  "validationStatus": "requires_review",
  "band": "L",
  "quality": {
    "pattern_confidence": 0.86,
    "frame_vs_density_ok": true,
    "gsd_cm": 4.2
  }
}
```

### E1.3 Árbol en `airci_canopy_trees` (metrics)

```json
{
  "source": "grid_confirmed",
  "from_calibration": false,
  "seed_id": "r12-c48",
  "shift_m": 0.35,
  "z": -0.2
}
```

Ancla manual: `"source": "calibration"`, `"from_calibration": true`.

## E2. Casos difíciles (reglas cerradas)

| Caso | Comportamiento PRO |
|------|---------------------|
| Dos copas pegadas / unidas en foto | Un seed → **una** planta (la del centro); no un polígono de toda la hilera |
| Planta faltante (hueco) | `missing` en stats; opcional fila `grid_missing` |
| Sombra larga que parece copa | Confirm exige textura/contraste en el **centro del seed**, no solo sombra |
| Calle con pasto más verde que la copa | La rejilla manda; RGB solo confirma; no inventar centros en la calle |
| Hileras curvas (contorno) | **v1 = hileras casi rectas**; curvas = F2.2 (documentado, no improvisar) |
| Dos marcos en un TIFF | Dos sitios/análisis AirCI; un solo patrón por job |
| Orto chico ≤ 1 ha | Banda S; mismas reglas; expectedTrees = dens × ha |
| GSD dudoso | Warning + `validationStatus` no pasa a “trusted” |

## E3. Calidad “pro” en producto (UX)

| Elemento | Comportamiento |
|----------|----------------|
| Anclas (las 10) | Color/estilo distinto + tooltip “Calibración” |
| Detectadas | Estilo normal + semáforo |
| Faltantes | Capa opcional o contador (no saturar el mapa) |
| Antes de Analizar | Checklist: orto OK · densidad · 10 confirmadas · (opcional marco) |
| Después | Banner: `detectados / esperados (dens×ha)` + % diferencia |
| Si \|det−esp\|/esp > 15 % | Warning rojo: “revisa densidad o las 10” |
| Re-analizar | Borra current anterior; no apilar capas fantasma |
| Export | GeoJSON / CSV de centros + áreas (fase pro cercana) |

## E4. Observabilidad (para depurar como adultos)

Cada job debe dejar en `stats_json` o logs:

- `detectorVersion`, duración s, tiles procesados  
- `seeds_total`, `confirmed`, `missing`, `anchors`  
- `pattern_confidence`  
- `band` (S/M/L)  
- error code si falla (`PATTERN_UNSTABLE`, etc.)

Sin eso, en 30 ha no sabes **por qué** falló.

## E5. Pruebas automáticas mínimas (CI / selftest)

1. Patrón: 10 centros en rejilla 5×6 → azimut y spacings correctos (±5 %).  
2. Seed grid: 1 ha a 400/ha → ~400 seeds (±10 %).  
3. confirm_seed: sintético copa oscura en pasto → confirm; solo pasto → missing.  
4. merge: ancla pisa seed → gana ancla.  
5. Banda S: 0.25 ha no explota ni pide protocolo de 30 ha.

## E6. Migración desde el detector viejo

| Situación | Acción pro |
|-----------|------------|
| Resultado `classical` / v1.2 verde-libre | Se puede ver; badge “motor anterior” |
| Nuevo Analizar | Solo `grid_v1` |
| No mezclar en el mismo mapa | Un `current` por flight |
| Edición manual de resultados viejos | Seguir permitiendo `tree_edit` |

## E7. Seguridad y confianza (nivel NutriPlant)

- Job solo del `owner_id` del JWT.  
- Worker valida job + flight del mismo dueño.  
- Ortos en bucket privado; URLs firmadas.  
- Nunca marcar `validationStatus: trusted` sin pasar §B7.  
- Copy de producto: “requiere revisión” hasta validar parcela.

## E8. Roadmap pro (orden, sin dispersarse)

| Fase | Entrega |
|------|---------|
| **Ahora (F2 detección)** | Pipeline grid_v1 + UI anclas/stats + selftests + deploy |
| **F2.0b** | Contorno predio + marco m×m + warning marco vs densidad |
| **F2.1** | IDs estables entre vuelos |
| **F2.2** | Hileras curvas / contorno |
| **F3** | Fenología / color (otro doc) |

## E9. Definition of Done — “AirCI detección PRO”

Solo se puede vender/usar en serio cuando:

- [ ] `detector_mode = grid_v1` en producción  
- [ ] Checklist pre-análisis en UI  
- [ ] Anclas visibles distintas  
- [ ] Stats esperados vs detectados  
- [ ] Selftests E5 en verde  
- [ ] Parcela real ≤ 1 ha con error ≤ 10 %  
- [ ] Un vuelo mediano/grande revisado sin capas fantasma  
- [ ] Docs STATUS actualizado: “detección grid_v1 OK”  

---

**Cierre:** con Partes A–E el papel ya es **super pro**.  
No hace falta más arquitectura: hace falta **código que cumpla E9**.
