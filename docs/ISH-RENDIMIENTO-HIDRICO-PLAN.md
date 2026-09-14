# ISH — Índice de Satisfacción Hídrica / Rendimiento hídrico

## Estado del documento

- Tipo: definición de producto + spec técnico inicial (antes de implementar).
- Estado: **v1 implementada** (core + gratis + pestaña Clima PRO + PDF/Admin básico).
- Fecha: 14 de septiembre de 2026.
- Origen: diapositiva GEOSMET (balance hídrico → ISH → curva de rendimiento relativo).

---

## 1. Visión

Traducir lluvia + ET₀ (satélite Open-Meteo) + Kc + riego opcional en un **índice de satisfacción hídrica (ISH)** y una **gráfica de rendimiento relativo** a lo largo del ciclo.

No sustituye la calculadora de lámina/balance (¿cuántos m³ aplicar?).  
Responde: **¿qué % del techo de rendimiento está sosteniendo el agua?**

---

## 2. Ecuación (v1)

\[
ISH = 100 \left[ 1 - \frac{\sum_i (D_i + F_p \cdot E_i)}{\sum_i ETc_i} \right]
\]

| Símbolo | Significado v1 |
|--------|----------------|
| \(ETc_i\) | Demanda del cultivo en la semana \(i\): \(ET0_i \times Kc\) |
| \(D_i\) | Déficit: \(\max(0,\ ETc_i - (lluvia_i + riego_i))\) |
| \(E_i\) | Exceso: \(\max(0,\ (lluvia_i + riego_i) - ETc_i)\) |
| \(F_p\) | **Factor de ponderación del exceso** (ver caja abajo) |
| \(ISH\) | 0–100 %. 100 = el agua no limitó el techo relativo |

#### ¿Qué es \(F_p\)?

En la diapositiva GEOSMET, el déficit (\(D\)) entra **completo** al castigo; el exceso (\(E\)) entra **multiplicado por \(F_p\)**.

- **Déficit** (falta agua) suele dañar más el rendimiento → peso 1.
- **Exceso** (encharque, anoxia, lixiviación) también daña, pero no siempre 1:1 → se atenúa con \(F_p\) (ej. 0,25 = el exceso “cuenta” al 25 % frente al déficit).
- Si \(F_p = 0\): ISH solo mira déficit (alineado con WRSI/ISHi clásicos y FAO Ky).
- Si \(F_p = 1\): exceso castiga igual que déficit.

**Default v1:** `0,25`, editable 0–1. Si el usuario **no lo mueve**, ese 0,25 es el valor operativo del cálculo (válido como default de ingeniería, no como constante universal publicada — ver §8.2).

**UI (una sola línea de ayuda, no más):**  
«\(F_p\) pondera el exceso de agua frente al déficit (default 0,25). 0 = solo sequía; 1 = exceso igual que déficit.»

**Periodo de agregación (cerrado):** **semana** (gratis y PRO), tope **52 semanas** (~1 año).  
No pasar a quincenas (15 d / 26 periodos) solo por “saturación”: Open-Meteo se pide **una vez** (diario del ciclo) y el cliente agrega; 52 filas son manejables. Quincena tapa más los escalones de la gráfica.  
Día = ruido; mes tapa golpes. El fertirriego puede seguir en día/semana/mes; ISH **no** hereda esa unidad.

**No es (v1):** Ky FAO por cultivo, modelo de cultivar, rendición de cosecha real.  
Disclaimer estándar NutriPlant: estimaciones satelitales de referencia; pueden diferir del microclima/campo.

---

## 3. Dos superficies (misma física)

| | **Herramienta gratuita** | **Clima PRO — pestaña nueva** |
|--|--------------------------|-------------------------------|
| Nombre UI | Índice de Satisfacción Hídrica / Rendimiento hídrico | Igual |
| Dónde | Login + icono dashboard (patrón VPD / lámina) | Clima → pestaña **después de Lluvia/Riego** |
| Ubicación | Mapa Leaflet + clic + lat/lng + GPS (como `vpd-free` / `lamina-riego-free`) | Centro del **polígono del proyecto** (igual que VPD / Lluvia / Tiempo actual) |
| Periodo | Fecha inicio → fin/hoy, **semanas** (máx. 52) | Igual |
| Lluvia | Satélite **o manual** por semana (pluviómetro de campo) | Igual |
| ET₀ | Satélite **o manual** por semana (si mide en campo) | Igual |
| Kc | Campo + **tabla FAO-56** (`NpIrrBalance.renderFaoKcTable`) | Precarga de `irrigationQuickCalc.kc` **o** editable + misma tabla FAO |
| Riego | Manual **por semana** (opcional; vacío = temporal) | Solo prefill si Lluvia/Riego está en **7 días**; si no → manual |
| Persistencia | `localStorage` (`nutriplant_free_ish_v1` tentativo) | Nube en `projects.data.climateAnalysis.ish` (tentativo) |
| Extra PRO | — | Sync Kc; **PDF sección Clima**; **panel Admin** ve el mismo bloque |

**Principio:** gratis = completa para calcular bien (no versión “corta” de 1–7 días).  
PRO = mismo cálculo **dentro del predio** (polígono, Kc compartido, guardado).

---

## 4. Decisiones confirmadas

1. Herramienta **gratuita** + pestaña en **Clima PRO**.
2. Agregación **semanal** en ambos; tope **52 semanas**.
3. Ubicación gratis = patrón VPD (mapa / coords / GPS).
4. Ubicación PRO = polígono del proyecto (sin segundo mapa).
5. Ciclo completo (no solo 1/7 días): ISH mal con periodo corto.
6. **Lluvia y ET₀:** satélite (botón obtener) **o manual** por semana (pluviómetro / medición de campo). Mismo espíritu que balance en Lluvia/Riego.
7. Kc con **tabla FAO** en gratis y PRO.
8. Kc **único del proyecto**: si cambia en ISH → actualiza Lluvia/Riego y Lectura satelital (y al revés). Enganchar al sync existente (`np:kc-changed` / `NpIrrBalance` campos `climate-irr-kc`, `lectura-kc`, etc.).
9. Riego PRO: **solo** sugerir desde Lluvia/Riego si `periodDays === 7` y hay valor; si el balance está en 1 o 30 días → **solo manual** en ISH. Sección usable sola.
10. Sin riego → cálculo solo con lluvia.
11. Macrotúnel / invernadero: lluvia = 0 (mismo criterio que balance).
12. Orden de pestañas Clima propuesto:  
    `climate-vpd` → `climate-rainfall` → **`climate-ish`** → `climate-live`  
    (actualizar lista `valid` en `climate-functions.js`).
13. Nombre UI preferido: **Rendimiento hídrico**; subtítulo/fórmula: ISH.
14. v1 sin Ky por cultivo; ISH ≈ rendimiento relativo hídrico.
15. No duplicar lógica dentro de Lluvia/Riego: pestaña aparte.
16. \(F_p\) default **0,25**, editable; ver §2 y §8.2 (literatura).
17. **Fechas de ciclo** obligatorias: inicio + fin (o “hasta hoy”) — disparan la lectura satelital de lluvia/ET₀ del bloque ISH (§5.3).
18. **PDF PRO:** casilla/sección Clima incluye ISH guardado (tabla resumen + ISH % + gráfica si aplica).
19. **Admin:** puede ver el mismo bloque ISH del proyecto (como VPD / lluvia / balance).

---

## 5. Flujo de usuario

### 5.1 Gratis

1. Abrir herramienta (login / dashboard).
2. Ubicar predio (mapa / GPS / coords).
3. Fechas del ciclo + Kc (manual o FAO).
4. Obtener clima satélite (lluvia + ET₀) **y/o** editar lluvia/ET₀ manual por semana (campo).
5. (Opcional) Riego por semana.
6. Ver ISH %, tabla semanal (lluvia, riego, ET₀, ETc, D, E, ISH acum.), gráfica de escalones.

### 5.2 PRO (pestaña Clima)

1. Entrar a Clima → **Rendimiento hídrico**.
2. Ubicación ya resuelta por polígono.
3. Fechas del ciclo; Kc precargado si existe, si no campo + FAO.
4. Clima satélite y/o lluvia/ET₀ manual por semana.
5. Riego: si Lluvia/Riego = 7 d con valor → sugerir esa semana; si no → solo manual.
6. Guardar en `climateAnalysis`; sale en PDF Clima y en Admin.

### 5.3 Fechas del ciclo (gratis y PRO) — cómo las veo

Bloque de fechas **propio de ISH** (no confundir con Lectura satelital NDVI):

| Campo | Uso |
|-------|-----|
| **Fecha inicio** | Siembra / arranque del ciclo → desde aquí se pide clima satélite y se arman las semanas |
| **Fecha fin** | Cosecha, o vacío / “Hoy” → hasta aquí corre el ISH |
| Tope | Máx. **52 semanas** entre inicio y fin |

Flujo: el usuario pone fechas → pulsa **Obtener lluvia y ET₀** → Open-Meteo trae el rango → se agrega por semana → edita manual si quiere → calcula ISH.

**Relación con Lectura satelital (Radar):** son bloques distintos. Lectura = NDVI/NDMI + clima por quincena/mes del predio. ISH = rendimiento hídrico semanal del ciclo. Más adelante se pueden cruzar; en v1 **fechas independientes** (el productor define el ciclo de ISH).

---

## 6. Datos y almacenamiento (propuesta)

### 6.1 PRO — extensión de `climateAnalysis`

```text
climateAnalysis: {
  lastTab: 'climate-vpd' | 'climate-rainfall' | 'climate-ish' | 'climate-live',
  rainfall, et0, rolling, lastReading,
  irrigationQuickCalc: { kc, ... },   // Kc canónico del proyecto
  ish: {
    cycleStart: 'YYYY-MM-DD',
    cycleEnd: 'YYYY-MM-DD' | null,    // null = hoy
    fp: 0.25,                         // default tentativo
    macroTunnelNoRain: false,
    weeks: [
      {
        weekStart: 'YYYY-MM-DD',
        weekEnd: 'YYYY-MM-DD',
        rain_mm: number | null,       // satélite o manual (pluviómetro)
        rainSource: 'satellite' | 'manual' | null,
        et0_mm: number | null,        // satélite o manual (campo)
        et0Source: 'satellite' | 'manual' | null,
        irrigation_mm: number | null, // o m3 + ha → mm (definir unidad UI)
        irrigationSource: 'manual' | 'balance' | null,
        etc_mm, deficit_mm, excess_mm, // calculados
        ish_cumulative: number
      }
    ],
    result: { ish: number, sumEtc, sumPenalty, updatedAt },
    ui: { ... }
  }
}
```

Kc **no** se duplica en `ish`: se lee/escribe `irrigationQuickCalc.kc`.

### 6.2 Gratis

- LS key tentativa: `nutriplant_free_ish_v1`
- Campos: lat, lng, cycleStart/End, kc, fp, macroTunnel, weeks[], lastFetchAt
- Catálogo: entrada nueva en `free-tools-catalog.js` + Knowledge GPT cuando se implemente

### 6.3 Clima satélite

- Reutilizar patrón Open-Meteo ya usado en clima/admin (`archive-api` para histórico de ciclo; forecast para tramos recientes).
- Diarios → agregar a **semanas** en cliente (o en función Netlify si conviene cuota/caché).

---

## 7. UI mínima (v1)

**Entradas:** ubicación (gratis) · fechas · Kc + botón/tabla FAO · \(F_p\) · toggle macrotúnel · obtener clima satélite · tabla semanal editable (lluvia, ET₀, riego).

**Salidas:**

- Número grande: ISH %
- Semáforo orientativo (tentativo): ≥85 / 70–85 / &lt;70
- Tabla semanal
- Gráfica rendimiento relativo vs tiempo (escalones, estilo concepto GEOSMET)
- Nota satélite (mismo tono que banner Clima)

---

## 8. Cierres de revisión

### 8.1 Prefill de riego desde Lluvia/Riego — **cerrado**

`irrigationQuickCalc` guarda **un solo** `irrigationValue` (periodo 1 / 7 / 30 d).

| Caso | Comportamiento v1 |
|------|-------------------|
| Lluvia/Riego en **7 días** y hay riego | Se puede **usar/sugerir** en la semana correspondiente de ISH |
| Periodo 1 o 30 días, o sin valor | **Solo manual** en ISH (no inventar) |
| Lectura satelital | Fuera de v1 (posible v1.1) |

### 8.2 \(F_p\) — **default 0,25 + literatura (cerrado con honestidad)**

**¿Es correcto colocarlo así?** Sí en la **estructura** de la fórmula GEOSMET: déficit completo + exceso × \(F_p\).

**¿Si nadie lo mueve, el 0,25 es “correcto”?** Es un **default operativo razonable**, no una constante FAO universal.

| Familia | Qué hace con el exceso | Fuente típica |
|---------|------------------------|---------------|
| **WRSI / WSI / ISHi clásico** | Suele **ignorar** exceso; solo \(ETr/ETc\) o déficit | FAO WRSI, USGS/FEWS, ASAP WSI (UE), ISHi FAUBA (Carnelos et al. maíz) |
| **FAO Ky** | Solo **déficit** → merma de rendimiento | FAO Irrig. & Drainage 33 / 66 |
| **Fórmula tipo GEOSMET** | Déficit + \(F_p \times\) exceso | Material de capacitación (diapositiva); **\(F_p\) no aparece como estándar publicado** en WRSI/ISHi |

**Conclusión NutriPlant:**

- Mantener \(F_p\) en UI (fiel a la idea GEOSMET y útil en suelos con riesgo de encharque).
- Default **0,25** si el usuario no lo toca.
- **Solo una línea** de ayuda junto al campo (ver §2). Sin panel largo ni jerga FAO en pantalla.
- En manual/Knowledge (después) se puede ampliar; en la app, una línea basta.

### 8.3 Lluvia y ET₀ — **satélite o manual (cerrado)**

Por semana, el usuario puede:

- **Obtener satélite** (Open-Meteo), y/o
- **Sobrescribir / capturar manual** (pluviómetro, estación, ETo de campo).

Patrón ya conocido en lámina/balance. No exigir % de lluvia efectiva en v1 (lluvia = valor usado, satélite o campo).

### 8.4 Límite de ciclo — **cerrado: 52 semanas** (confirmado Jesús)

- Tope **52 semanas** (~1 año).
- Confirmado: no pasar a 15 d / 26 periodos por saturación.

### 8.5 Kc constante vs por etapa

v1: **un Kc** (como balance actual).  
Kc por semana/etapa = v2.

---

## 9. Qué no es este módulo

- No sustituye `lamina_riego` / balance en Lluvia/Riego.
- No es Pronóstico agroclimático (14 días).
- No consume créditos del Radar / Lectura satelital en v1 gratis.
- No es AirCI ni NDVI (cruce ISH↔NDVI = mejora futura en PRO).

---

## 10. Orden de implementación sugerido

1. (Hecho) Cierres §8.1–8.4; opcional retocar default \(F_p\).
2. Core JS compartido: agregación semanal + fórmula ISH (testeable).
3. Herramienta gratuita (`ish-rendimiento-free.html` o nombre final) + mapa + FAO + gráfica.
4. Pestaña `climate-ish` en Clima + sync Kc + persistencia `climateAnalysis.ish`.
5. Catálogo gratis / Knowledge GPT / capítulo manual corto.
6. **PDF sección Clima** + bloque en **Admin** (misma data `climateAnalysis.ish`).

---

## 11. Archivos tocados (cuando se construya)

| Área | Archivos probables |
|------|--------------------|
| Core | nuevo helper (ej. `assets/np-ish-core.js`) + tests |
| Gratis | `*-free.html`, `login.html` / dashboard iconos, `free-tools-catalog.js` |
| PRO | `climate-functions.js` (tabs + UI), dashboard sección Clima |
| Kc sync | `assets/np-irrigation-balance-core.js` (añadir id del input ISH) |
| Docs | este plan + Knowledge GPT + manual técnico |
| API socio | `project_climate` / describe si expone bloque `ish` |

---

## 12. Criterios de aceptación v1

- [ ] Gratis: mapa/GPS/coords → clima ciclo → ISH con semanas (máx. 52).
- [ ] Lluvia y ET₀: satélite y/o manual por semana.
- [ ] Sin Kc: no calcula ETc/ISH; UI obliga o guía a FAO.
- [ ] PRO: pestaña tras Lluvia/Riego; usa polígono; Kc sync con Lluvia y Lectura.
- [ ] Riego: prefill solo si balance = 7 d; si no, manual; sección usable sola.
- [ ] \(F_p\) visible/editable (default 0,25) + ayuda honesta.
- [ ] Fechas inicio/fin (o hoy); satélite del rango; máx. 52 semanas.
- [ ] Gráfica de rendimiento relativo + tabla semanal.
- [ ] Disclaimer satélite visible.
- [ ] Persistencia gratis (LS) y PRO (nube proyecto).
- [ ] PDF Clima incluye ISH; Admin puede verlo.
