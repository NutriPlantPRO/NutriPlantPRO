# NutriPlant PRO — Herramientas gratuitas (conocimiento para Custom GPT)

**Uso:** sube este archivo a tu GPT privado (**Configure → Knowledge → Upload files**).  
**Complemento:** la API admin puede devolver el mismo catálogo con `action: "free_tools_catalog"`.

---

## 1. Qué son y dónde viven

- Páginas HTML (`*-free.html`) y modales en **login.html** (sin cuenta) y en **dashboard** (iconos de la barra lateral).
- Son **material educativo / calculadoras**; no sustituyen el programa nutricional guardado del suscriptor.
- **Persistencia (2026):** casi todas guardan entradas en **localStorage del navegador** (`nutriplant_free_*_v1`). Al cerrar el modal o la pestaña, al volver en el **mismo navegador** se restauran los valores. **No** van a Supabase ni al proyecto del cliente.
- **Excepción importante:** *Distribución por etapa* en modo dashboard guarda también en nube por proyecto; en login solo local.

---

## 2. Cómo debe responder el GPT

| Situación | Qué hacer |
|-----------|-----------|
| Usuario pregunta por un **cliente/suscriptor** | Usar Actions: `project_detail`, `project_analyses`, etc. **No** asumir datos de calculadoras gratis. |
| Usuario pregunta **cómo funciona** una calculadora gratis | Usar este documento o `free_tools_catalog`. Explicar fórmulas, denominadores de %, límites. |
| Usuario dice “en mi pantalla sale X” sin datos | No inventar X; pedir captura o valores, o explicar el criterio de cálculo. |
| Confundir gratis vs PRO | Hidro **gratis** = didáctica global; Hidroponía **proyecto** = por etapa + fertilizantes + guardado en `projects.data`. |

---

## 3. Catálogo de herramientas

### Conversores (login / dashboard)

| Herramienta | Función |
|-------------|---------|
| **Óxido ↔ Elemental** | P₂O₅, K₂O, CaO, MgO, SiO₂ ↔ elemental con factores estándar. |
| **ppm / mmol / meq** | Por ion; peso equivalente; categoría meq/cmol en conversor de magnitudes. |
| **Magnitudes físicas** | Longitud, área, volumen, masa, presión, etc. |

### 💧 Diseño de solución nutritiva (`hidro-solucion-free.html`)

- **Flujo didáctico:** CE objetivo → meq/L → % meq → ppm; triángulos **aniónico** (NO₃, P, SO₄) y **catiónico** (K, Ca, Mg) arrastrables.
- **Cl⁻** entra en la **suma de CE**; en % meq de triángulo aniónico **no** entra (va aparte con leyenda N-NO₃ vs Cl).
- **N-NH₄⁺** fuera del triángulo K-Ca-Mg; su % es sobre K+Ca+Mg+NH₄.
- **Persistencia:** `nutriplant_hydro_solucion_free_v1`.
- **No es** la pestaña Hidroponía del proyecto (esa calcula aporte de fertilizantes y guarda en el proyecto).

### 💦 Diagnóstico de agua (`agua-dureza-free.html`)

- Dureza total (ppm CaCO₃, meq/L, °dH/°eH/°fH), Ca/Mg de laboratorio, ácidos para neutralizar HCO₃/CO₃ con residual y volumen (L o m³).

### 🌡️ VPD (`vpd-free.html`)

- Mapa + Open-Meteo (lat/lng), VPD ambiental (T aire + HR), VPD avanzado (T hoja o estimada por radiación).
- Rango orientativo óptimo **0,5–1,5 kPa** (misma lógica que dashboard VPD del proyecto).

### 🚜 Enmiendas por CIC (`enmienda-free.html`)

- Cationes iniciales y objetivo (%), CIC, densidad aparente, profundidad, pH, % de suelo a tratar.
- Enmiendas: yeso, cal agrícola/dolomítica, SOP, MgSO₄; rangos ideales K 3–7 %, Ca 65–75 %, Mg 10–15 %.
- Misma base conceptual que pestaña **Enmienda** del dashboard PRO (PRO guarda en proyecto).

### 📦 Mezcla granular (`granular-mix-free.html`)

- Varias filas: material + % en mezcla → relación N–P₂O₅–K₂O y kg nutriente/ha según dosis.
- Hasta **3 fertilizantes personalizados** (catálogo aparte en LS).

### ⚗️ Composición de fertilizantes (`fertilizer-composition-free.html`)

- Varias moléculas con % en el producto; debajo de cada fila: composición **teórica pura**; recuadro azul: total ponderado elemental + óxidos (P₂O₅, K₂O…).

### 📊 Distribución por etapa (`extraccion-etapa-free.html`)

- kg/ha totales por nutriente y % repartido por etapas; gráficas.
- **Login:** solo localStorage. **Dashboard (`?ctx=dashboard`):** local + sincronización con proyecto y plantillas con título.

### ⚛️ Tabla periódica nutrientes (`tabla-periodica-nutrientes-free.html`)

- Referencia visual; sin estado de formulario.

### 🔺 Compatibilidad (`fertilizer-compatibility-free.html`)

- Matriz triangular Compatible / Precaución / Incompatible; ficha por par.

### 🔗 Interacciones y movilidad (`interacciones-absorcion-movilidad-free.html`)

1. **Mulder:** rojo = antagonismo (bidireccional en aristas); azul = sinergia **solo desde el ion que el usuario seleccionó** (no inflar listas cruzadas).
2. **Mecanismos hacia la raíz:** flujo de masa, difusión, interceptación.
3. **Movilidad:** N,P,K,Mg móviles (síntoma hoja vieja); Ca,B poco móviles (punta); Fe,Mn,Zn,Cu según especie.
4. **pH:** disponibilidad relativa por nutriente vs acidez/alcalinidad.

### 🌱 N mineralizable (`n-mineralizable-mo-free.html`)

```
N_min (kg N/ha/año) = 10 000 × (P/100) × DA × 1 000 × (R/100) × (MO/100) × (N_MO/100) × (T_min/100)
```

- P = profundidad (cm), DA = densidad aparente (g/cm³), R = % explorado por raíces, MO = % materia orgánica, N_MO = % N en MO, T_min = factor mineralización (1–3 %, slider).

### 🪨 Agua en suelo y textura (`agua-disponible-textura-suelo-free.html`)

**Pestaña Agua:** CC, PMP (% vol.), profundidad (cm), área (ha), zona radical efectiva (%), θ opcional.

- Volumen suelo (m³) ≈ área_ha × profundidad_cm / 10.
- Agua útil ref. ≈ volumen × (CC−PMP)/100 × (zona_radical/100).

**Pestaña Textura:** % arena, limo, arcilla → clase USDA (triángulo arrastrable).

### 🧂 Solubilidad e índice salino (`solubilidad-indice-salino-free.html`)

- Solubilidad (g/L, ~20–25 °C) e **IS** (NaNO₃ = 100).
- IS alto → más estrés osmótico relativo (cuidado en emergencia, solución madre concentrada); no significa “prohibido”.

---

## 4. % meq — criterio NutriPlant (gratis hidro + PRO)

**No mezclar denominadores:**

| Bloque | % sobre qué suma |
|--------|------------------|
| Triángulo aniones | NO₃ + P + SO₄ = 100 % (Cl **fuera**) |
| Triángulo cationes | K + Ca + Mg = 100 % (NH₄ **fuera**) |
| N-NH₄⁺ | % sobre K + Ca + Mg + NH₄ |
| Cl⁻ (fertirriego gráficas PRO) | % sobre NO₃ + P + SO₄ + Cl |

En **hidro solución gratis**, Cl suma a **CE** aunque no esté en el triángulo N-P-S.

---

## 5. API para el GPT (opcional)

```json
POST https://nutriplantpro.com/api/admin-assistant
Authorization: Bearer <NUTRIPLANT_ADMIN_GPT_TOKEN>
{ "action": "free_tools_catalog", "params": {} }
```

Detalle de una herramienta:

```json
{ "action": "free_tools_catalog", "params": { "tool_id": "hidro_solucion" } }
```

---

## 6. Actualización

Si cambias calculadoras en el repo, vuelve a subir este archivo al GPT y redeploy Netlify para que la API traiga el catálogo nuevo (`netlify/functions/lib/free-tools-catalog.js`).

*NutriPlant PRO © 2026 — documento interno admin.*
