# Plan Fino: Gráficas de Fertirriego con m3/ha, ppm y meq

## Objetivo
Extender la subpestaña `Gráficas` de Fertirriego para que el usuario pueda:

1. Capturar `m3/ha` por etapa (`Semana N` o `Mes N`, según unidad del programa).
2. Seleccionar una etapa y ver un resumen técnico en una tarjeta/tabla minimalista:
   - Aporte del programa en `kg/ha` por nutriente.
   - `m3/ha` de lámina para esa etapa.
   - Conversión a `ppm`.
   - Conversión a `meq/L` (macros iónicos).
   - `% aniones` y `% cationes` para validación de equilibrio.
3. Mostrar una leyenda de rangos ideales (como referencia visual).

## Criterios funcionales aprobados

- La captura de agua es por etapa y en `m3/ha`.
- Si se selecciona etapa sin `m3/ha`, mostrar mensaje guía (no calcular ppm/meq).
- En esta sección usar solo `SO4` para balance aniónico.
- Ocultar/retirar `S` elemental en UI de fertirriego para evitar confusión.

## Regla de cálculo base

Para cada nutriente en una etapa:

- `ppm = (kg/ha * 1000) / (m3/ha)`
- `meq/L = ppm / peso_equivalente` (solo macros iónicos del resumen)

Pesos equivalentes propuestos (alineados con módulo hidroponía):

- `N_NO3`: 14.0
- `P` (como P-H2PO4): 31.0
- `SO4` (expresado como S en equivalente iónico de sulfato): 16.03
- `K`: 39.1
- `Ca`: 20.04
- `Mg`: 12.15

> Nota: el resumen de equilibrio usa la lógica iónica de NutriPlant (aniones y cationes), no una mezcla con `S` elemental.

## Esquema de datos (nube/proyecto)

La sección fertirriego ya guarda en nube mediante:

- `saveFertirriegoProgram()` en `fertirriego-program-functions.js`
- `window.projectStorage.saveSection('fertirriego', mergedSection, pid)`

Se agregará al payload una estructura no disruptiva:

- `chartWaterByStageM3ha: number[]` (misma longitud/orden de `fertiWeeks`)
- `chartSelectedStageIndex: number` (opcional, solo preferencia UI)

Compatibilidad:

- Si no existe `chartWaterByStageM3ha`, iniciar con ceros.
- Si cambia número de etapas, ajustar array por índice sin romper datos existentes.

## Diseño UI propuesto (minimal PRO)

En subpestaña `Gráficas`:

1. Encima o junto a las gráficas:
   - Inputs compactos por etapa: `m3/ha` (Semana/Mes).
2. Debajo de las gráficas:
   - Selector: `Etapa a analizar` (Semana/Mes).
   - Tarjeta de resumen macro:
     - Tabla 1: `kg/ha` y `m3/ha`.
     - Tabla 2: `ppm` y `meq/L`.
     - Tabla 3: `% aniones` y `% cationes`.
   - Leyenda de rangos:
     - Aniones: NO3 20-80, H2PO4 1.25-10, SO4 10-70
     - Cationes: K 10-65, Ca 22.5-62.5, Mg 0.5-40
3. Tarjeta micro (debajo del gráfico micro):
   - `kg/ha` y `ppm` por etapa seleccionada.
   - (Sin meq para micros).

## Fases de implementación (anti-ruptura)

### Fase 1: Datos y guardado
- Agregar campos nuevos al payload fertirriego.
- Cargar defaults seguros en `loadFertirriegoProgram()`.
- Guardar con debounce existente (sin crear nuevo autosave paralelo).

### Fase 2: UI captura m3/ha por etapa
- Render inputs por etapa en `Gráficas`.
- Validaciones de entrada (>= 0).
- Mensaje cuando falta m3/ha.

### Fase 3: Motor de resumen etapa
- Calcular `kg/ha -> ppm -> meq`.
- Calcular `% aniones/cationes`.
- Pintar tarjeta macro + tarjeta micro.

### Fase 4: Consistencia SO4 (sin S)
- Ocultar `S` en vistas de fertirriego donde hoy aparece junto a SO4.
- Mantener `SO4` como referencia única en gráficas y resumen.

### Fase 5: QA y regresión
- Cambio de unidad Semana/Mes.
- Cambio de número de etapas.
- Recarga de proyecto (persistencia nube/local).
- Exportes/reportes (que no fallen si aún no hay m3/ha).

## Riesgos y mitigaciones

- Riesgo: desalineación entre índices de etapas y array `chartWaterByStageM3ha`.
  - Mitigación: normalizar longitud en cada carga/render.
- Riesgo: interpretación de S vs SO4.
  - Mitigación: bloquear `S` en UI de fertirriego y documentar fórmula del balance.
- Riesgo: sobrecargar render de gráficas.
  - Mitigación: usar update incremental (sin destroy/create) y debounce en inputs.

## Definición de listo (DoD)

- Usuario puede capturar m3/ha por etapa y esos datos persisten tras recarga.
- Al seleccionar etapa, ve resumen con kg/ha, ppm, meq y % iónicos.
- Si falta m3/ha, se muestra aviso claro y no hay cálculos inválidos.
- En fertirriego gráfico/resumen no aparece `S` elemental, solo `SO4`.
- No hay regresiones en guardado nube de sección `fertirriego`.

