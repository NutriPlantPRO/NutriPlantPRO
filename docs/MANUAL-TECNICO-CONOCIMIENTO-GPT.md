# Manual Técnico NutriPlant PRO — Knowledge para GPT Socio (fuente pública)

**Uso en ChatGPT:** subir en **Configure → Knowledge** (junto con HERRAMIENTAS, ANALISIS-LABORATORIO y opcional `PUBLICACIONES-REDES-CONOCIMIENTO-GPT.md`).  
**Versión manual web:** v2026.08.7 · **25 capítulos** publicados (pilar **1** + pilares A–G).
**Fuente web:** https://nutriplantpro.com/manual-tecnico/index.html  
**API:** `manual_tecnico_catalog` · OpenAPI v2.2.0  
**Versión Knowledge:** 2026-08-17 · **v2026.08.17b** (+ Zona de equilibrio iónico bajo Requerimiento: dashboard/admin/API `ionic_equilibrium`; no PDF; % fijos, kg y % actuales siguen el req)

---

## 1. Qué es y por qué es fuente pública

Biblioteca HTML **abierta, sin cuenta**: metodología alineada con la app NutriPlant PRO.

- Agrónomos, técnicos, productores, buscadores e **IA (GEO)**.
- **Principio:** si el código y el capítulo divergen, gana el código; actualizar capítulo + este Knowledge.
- **Citar siempre** la URL del capítulo cuando expliques criterio NutriPlant en web, posts o respuestas a terceros.

**Distinciones importantes:**

| Concepto | Qué es |
|----------|--------|
| Manual técnico (web) | Metodología pública, capítulos con URL |
| Pilar 1 flujo | Entrada «¿por dónde empiezo?» → `flujo-nutriplant-pro` |
| Autoría (`autoria.html`) | Plataforma NutriPlant + referente Jesús; ≠ modal «Nosotros» en login |
| Pilar G redes | Editorial y canales; ver `publicaciones-redes-sociales` + Knowledge PUBLICACIONES |
| `project_analyses` | Datos reales del suscriptor en nube (privado, API) |

---

## 2. URLs oficiales

| Recurso | URL |
|---------|-----|
| Índice manual | https://nutriplantpro.com/manual-tecnico/index.html |
| Flujo plataforma (Pilar 1) | https://nutriplantpro.com/manual-tecnico/capitulos/flujo-nutriplant-pro.html |
| Autoría | https://nutriplantpro.com/manual-tecnico/autoria.html |
| Pilar redes | https://nutriplantpro.com/manual-tecnico/capitulos/publicaciones-redes-sociales.html |
| llms.txt manual | https://nutriplantpro.com/manual-tecnico/llms.txt |
| llms.txt sitio | https://nutriplantpro.com/llms.txt |
| Login / herramientas gratis | https://nutriplantpro.com/login.html |

---

## 3. Índice de capítulos publicados (tabla rápida)

| Slug | Título corto | Pilar |
|------|----------------|-------|
| `flujo-nutriplant-pro` | Guía rápida: flujo y criterio de uso | H |
| `unidades-ppm-meq-oxidos` | Unidades ppm, meq, óxidos | A |
| `porcentaje-meq-aniones-cationes` | % meq triángulos | A |
| `analisis-suelo-fertilidad-kgha` | Suelo fertilidad kg/ha | B / C |
| `enmiendas-balance-cic` | Enmiendas CIC | B |
| `extraccion-nutrimental-por-etapa` | Extracción y distribución nutrimental por etapa | D |
| `programa-fertirriego-etapas` | Fertirriego programa | D |
| `fertirriego-graficas-ionicas` | Gráficas iónicas ferti | D |
| `granular-mezclas` | Granular: requerimiento, programa y mezclas | D |
| `hidroponia-solucion-por-etapa` | Hidroponía: solución nutritiva por etapa | D |
| `diseno-solucion-nutritiva-didactica` | Solución didáctica (gratis) | D |
| `vpd-deficit-presion-vapor` | VPD, Radar NDVI/NDMI/NDRE/RGB | E |
| `balance-hidrico-riego-clima` | Balance hídrico y riego rápido (Clima) | E |
| `agua-dureza-acidificacion-solubilidad` | Dureza, ácido HCO₃, solubilidad/IS | E |
| `n-mineralizable-agua-disponible-suelo` | N mineralizable, CC−PMP, textura | B |
| `interacciones-mulder-compatibilidad` | Mulder, matriz C/R/I ferti | F |
| `atlas-aminoacidos-vegetales` | Atlas fisiológico vegetal (aminoácidos + ciclo hormonal) | F |
| `huella-carbono-fertilizantes` | Huella CO₂e fertilizantes (estimación) | F |
| `analisis-solucion-nutritiva-lab` | Solución lab (licor/drenaje) | C |
| `analisis-extracto-pasta` | Extracto de pasta saturada (laboratorio) | C |
| `analisis-agua-ras-sar` | Agua CE, pH, RAS | C |
| `analisis-foliar-dop` | Foliar DOP | C |
| `analisis-fruta-icc` | Fruta ICC | C |
| `faq-porcentajes-no-suman-100` | % meq: por qué no todo suma 100 % | A |
| `publicaciones-redes-sociales` | Publicaciones en redes y autoridad técnica | G |

URL: `https://nutriplantpro.com/manual-tecnico/capitulos/<slug>.html`

---

## 4. Capítulos — resumen técnico (detalle)

### 4.0 Flujo plataforma (Pilar 1 — leer primero si «¿por dónde empiezo?»)

**URL:** …/flujo-nutriplant-pro.html  
- NutriPlant PRO = plataforma (login herramientas gratis vs dashboard PRO proyecto en nube).  
- Cadena: **Dato → Interpretación → Ajuste → Programa → Seguimiento**.  
- Flujo 5 pasos: diagnóstico (Análisis) → Enmiendas → Extracción → Fertirriego/Granular/Hidro → seguimiento (foliar, VPD/NDVI, campo).  
- Tabla **módulo según objetivo** (Análisis, Enmiendas, Extracción, Fertirriego, Granular, Hidroponía, VPD, herramientas gratis).  
- **Pronóstico agroclimático** (`/pronosticoclimatico/`, login/dashboard 🌤️): lectura gratis 7+7 d + opcional alerta semanal por correo (admin `agroclimate.html`). Ver Knowledge HERRAMIENTAS / `free_tools_catalog` `pronostico_agroclimatico`. No sustituye Clima PRO del proyecto.
- **Errores comunes:** suelo ≠ enmiendas; % meq solución ≠ % CIC; CE ≠ composición iónica; gratis ≠ proyecto PRO; kg/ha/DOP/ICC no son receta; no neutralizar 100 % HCO₃; NDVI/VPD no sustituyen campo.

### 4.0b Autoría

**URL:** …/autoria.html · NutriPlant PRO como **plataforma** para agrónomos; visión «la herramienta suma»; perfil Jesús Avila Mendoza; LinkedIn personal y empresa. Sin marcas empleadores en copy público.

### 4.1 Unidades

**URL:** …/unidades-ppm-meq-oxidos.html · ppm; meq/L = ppm÷peso eq. elemental; 1 cmol/L = 10 meq/L; meq/100g = cmolc/kg. Óxidos: P₂O₅×0,436, K₂O×0,830, CaO×0,715, MgO×0,603.

**µmol/L en microelementos (calculadora gratis ppm/meq):** Fe, Mn, Zn, B, Cu, Mo muestran **µmol/L** (no mmol/L). **µmol/L = (ppm ÷ PA elemento) × 1000**; mmol/L = µmol/L ÷ 1000; meq/L = mmol/L × valencia. ppm = mg/L del **elemento**. Formas: Fe²⁺, Mn²⁺, Zn²⁺, Cu²⁺, H₃BO₃ (B), **MoO₄²⁻** (Mo, PA 95,95, valencia 2). Ejemplo: 3 ppm Fe ≈ 53,7 µmol/L. Macros e iones de solución siguen en **mmol/L**.

### 4.2 % meq triángulos

**URL:** …/porcentaje-meq-aniones-cationes.html  
- Aniones N-P-S = 100 % (sin Cl). Cationes K-Ca-Mg = 100 % (sin NH₄). NH₄ y Cl: denominadores aparte.  
- Pesos eq.: N14 P31 S16 K39,1 Ca20,04 Mg12,15 Cl35,45.  
- ≠ % saturación CIC suelo.

### 4.3 Suelo fertilidad kg/ha

**URL:** …/analisis-suelo-fertilidad-kgha.html · Pantalla Análisis → Suelo → Fertilidad.

```
factor = 0,1 × profundidad_cm × densidad × (suelo_explorado_% / 100)
kg/ha = (lab − ideal) × factor
```

Ideales K/Ca/Mg desde CIC (5/70/13 %). P: Bray 40, Olsen 25, Mehlich 40 ppm. Orientativo, no dosis automática.

**Comparar análisis (tabla + gráficas):** en cada subpestaña Análisis (Suelo, Solución, Extracto, Agua, Foliar, Fruta), si hay ≥2 reportes, el bloque **«Comparar análisis (tabla y gráficas)»** alinea columnas por análisis (activar/desactivar). Tablas por bloque; gráficas solo donde aporta (ej. suelo: macros/micros/% CIC; pH y físicos suelen ser tabla). Mismo bloque sale en **Reportes PDF** (tablas + capturas de gráficas). No sustituye el detalle por reporte ni inventa datos: lee los reportes guardados del proyecto.

### 4.4 Enmiendas CIC

**URL:** …/enmiendas-balance-cic.html · Dashboard Enmiendas. CIC = suma catiónica meq/100g. Saturación % = meq/CIC×100. Rangos K 3–7, Ca 65–75, Mg 10–15, Na 0–1, Al 0–1, H 0–10 %. `soilAnalysis` (enmienda) vs `soilAnalyses[]` (reportes Análisis).

### 4.5 Extracción por etapa

**URL:** …/extraccion-nutrimental-por-etapa.html  

**Dos niveles (no confundir):**

| Nivel | Dónde | Qué hace |
|-------|--------|----------|
| **Requerimiento** | Fertirriego / Granular → pestaña Requerimiento | Extracción total = kg/ton × rendimiento; Requerimiento real = Ajuste ÷ (Eficiencia/100). Orden nutrientes N, P₂O₅, K₂O, CaO, MgO, S, SO₄, micros. |
| **Curva fenológica 📊** | Herramienta «Distribución nutrimental por etapa» (`extraccion-etapa-free.html`) | Sobre **kg/ha totales** ya definidos, reparte **% por etapa** → kg/ha por etapa + gráficas. No pide cultivo/rendimiento en pantalla. |

**Herramienta 📊 — pasos:** (1) Extracción total kg/ha por nutriente. (2) % por etapa (suma 100 %/nutriente; etapas editables). (3) Resultado kg/ha etapa = total × (%/100). (4) Gráfica macros/micros.

**Dónde abrirla:** Login (gratis, solo localStorage) · Dashboard botón 📊 (autosave en **proyecto activo** + barra **Mis curvas guardadas**).

**Biblioteca personal (solo dashboard):** curvas con título guardadas **por usuario** (Supabase perfil + LS `np_extraccion_etapa_presets_user_{userId}`). Guardar / elegir / eliminar. **No se pierden** al borrar un proyecto. **No se reparten solas** entre proyectos: en cada proyecto cargas la curva que quieras.

**Dos capas:** biblioteca = plantillas reutilizables · curva activa del proyecto = `calculators.extraccionEtapa` (+ LS `np_extraccion_etapa_{userId}_{projectId}`). Reporte PDF y chat app usan la curva **del proyecto**, no toda la biblioteca.

**Qué NO hace 📊:** no calcula dosis ni fertilizantes; no sustituye programa semanal/mensual de Fertirriego/Granular; no sincroniza sola con el programa.

Los % por etapa son decisión del técnico; la app no impone curva universal fija.

### 4.6 Fertirriego programa

**URL:** …/programa-fertirriego-etapas.html · Requerimiento → **Zona de equilibrio iónico** (apoyo, no PDF) → **Distribución objetivo por etapa** (% + lámina) → programa semanal/mensual → aporte agua N-NO₃ → gráficas.

**Zona de equilibrio iónico (dashboard + admin, no PDF):** debajo de Requerimiento real, tablita de **3 columnas** — Zona (aniones N-P-S / cationes K-Ca-Mg) · % meq del **requerimiento real** vs rangos fijos (N 20–80, P 1.25–10, S 10–70, K 10–65, Ca 22.5–62.5, Mg 0.5–40; **no cambian** con idioma ni unidades) · ventana kg/ha o lb/acre para editar ese nutriente dejando los otros dos del triángulo fijos (o «No cierra»). Apoyo para armar el programa. Recalcula si cambia extracción, suelo, eficiencia o rendimiento. API `project_detail.sections.fertirriego.ionic_equilibrium`. Chat IA lee el bloque en vivo.

**Distribución objetivo (UI, bajo Requerimiento):** título **Distribución objetivo [proyecto]**. Totales (chips) = Requerimiento real. **La tabla del editor muestra solo %** (no kg/ha): el requerimiento, el aporte de agua y el granular ya se ven en Requerimiento/Programa; las dosis se calculan al **Elaborar programa**. Periodo Semana o Mes (mismo eje que Programa). Cada fila = fenología + número. **Sugerir %** (junto a + Agregar semana/mes y primer ítem del ▾; solo dashboard) coloca % según etapas elegidas y busca zona Steiner en triángulos N-P-S y K-Ca-Mg. Si el ciclo ya sale de zona, avisa. ▾ también: más→menos, menos→más, campana, uniforme, cerrar 100 %, copiar %. Suma 100 % por nutriente. Lámina de riego objetivo por etapa se captura debajo (no en Gráficas). Catálogo 📊 (etapas/%; no kg). PDF/admin pueden listar kg al reportar el programa.

**Sugerir % · perfiles objetivo de solución (meq % del triángulo, dentro de Steiner).** El suscriptor pone las etapas que quiera (no son 9 fijas). Cada fila usa el perfil de esa fenología; si la misma etapa se repite (p. ej. 4 Llenado), I y meq se rampan hacia la siguiente (curva tipo extracción, no bloque). Aniones N-NO₃ / P-H₂PO₄ / S-SO₄ = 100. Cationes K / Ca / Mg = 100. El % de Dist suma 100 % del **requerimiento real** de cada nutriente (**N, P, K, Ca, Mg y S no copian el mismo %**: cada uno sigue la tabla meq). **Zn y B** van altos en brotación–establecimiento–preflor–flor–amarre y bajan un poco en llenado (como el P); Fe, Mn, Cu, Mo y Si siguen el tamaño de la etapa. La intensidad (I) sube en rampa suave: vegetativo 14 → preflor 15 → flor 16 → amarre 17 → llenado 18 (no hay bajón vegetativo→flor). K y Ca se sostienen (Ca ~50 hasta preflor/flor; K alza ligera); Mg cede un poco en flor para darles sitio y recupera en llenado. Si el ciclo ya sale de zona, igual pinta la curva meq y avisa; no aplana a la misma solución en todos los meses.

| Etapa | I | N | P | S | K | Ca | Mg |
|---|---:|---:|---:|---:|---:|---:|---:|
| Brotación | 8 | 46 | 8 | 46 | 28 | 52 | 20 |
| Establecimiento | 11 | 48 | 8 | 44 | 30 | 52 | 18 |
| Vegetativo | 14 | 56 | 6 | 38 | 32 | 50 | 18 |
| Prefloración | 15 | 52 | 7 | 41 | 34 | 50 | 16 |
| Floración | 16 | 50 | 6 | 44 | 36 | 49 | 15 |
| Amarre | 17 | 48 | 5 | 47 | 38 | 47 | 15 |
| Llenado | 18 | 46 | 4 | 50 | 44 | 39 | 17 |
| Maduración | 14 | 40 | 4 | 56 | 52 | 32 | 16 |
| Cosecha | 10 | 34 | 4 | 62 | 50 | 32 | 18 |

**Sugerir % vs programa ya hecho:** Sugerir % arma curva nueva (no pisa el programa). Si el proyecto ya tiene dosis, Dist se acomoda sola al aporte real. Si cambias una dosis en Programa (o arrastras en Gráficas), el % de Dist y su gráfica se mueven. Si acabas de pulsar Sugerir % en esa sesión, no se pisa.

**Generador automático:** en Programa, **Propuesta automática de programa** requiere Distribución semanal o mensual y confirmación antes de reemplazar filas. Meta fertilizante etapa = máx(0, requerimiento − agua ciclo − granular/base) × %. El agua y el granular ya vienen descontados en esa meta (no se restan otra vez). Si hay análisis de agua vinculado con HCO₃⁻/CO₃²⁻, el **ácido entra primero** (misma dosis mL/m³ que Hidroponía): L/ha etapa = mL/m³ × lámina etapa (m³/ha) ÷ 1000; su N/P/S resta del faltante (no se recorta por el mínimo ~3 kg/ha). Secuencia de sales: **nitrato de calcio primero** (cubre Ca y aporta N desde el inicio) → **MKP para P** (también aporta K) → **MAP solo después de preflor/flor/amarre** (llenado/cosecha) si aún falta P, sin pasarse de N (el NH₄ viene del MAP) → **SOP cubre ~1/3 del K restante para meter SO₄ desde el inicio** (el NKS solo no alcanza S) → NKS si falta N → SOP del K que quede → si aún falta **SO₄**, el Mg entra como **sulfato de Mg** (el SO₄ cuenta y limita la dosis) → nitrato de Mg **solo si aún falta N y ya no hay SO₄ pendiente en el Mg** → si queda Mg, sulfato de Mg (ahí el SO₄ no bloquea el Mg). **No se usa cloruro de calcio en automático** (cultivos sensibles a Cl⁻); el producto sigue en catálogo por si el agrónomo lo agrega a mano. Si el N se llena antes que el Ca, el Ca que falte queda visible. **No se fuerza el S** (sulfato de amonio no entra solo para cerrar S). Luego micros (quelatos, B). Cada dosis se limita por todos los nutrientes: no sobrepasa metas; lo imposible queda como faltante. Sales a granel por debajo de ~3 kg/ha por periodo no se incluyen. Micros sí pueden ir en gramos. N-NO₃/N-NH₄ lo determinan los productos. Guarda origen/metas/diagnósticos, reporta **Programa vs distribución** en PDF/admin y marca desactualizado si cambia Distribución. Siempre revisar compatibilidad, solubilidad, CE, agua e inyección.

**Aporte por agua (UI):** etiqueta «Traer de análisis» + desplegable «Seleccionar análisis…» (al elegir un reporte Análisis → Agua se cargan kg/ha **y la leyenda de ácido**, igual que Hidroponía). El **m³ del análisis** lo pone el usuario en ese reporte (un riego, el ciclo o, en hidroponía, el volumen de solución); no es la lámina de fertirriego. En Fertirriego la leyenda muestra **mL/m³** y la **lámina del ciclo** (m³/ha o US gal/acre según preferencia) con el ácido total; no lista etapa por etapa ni muestra la fórmula ni mezcla el m³ del análisis. Sin reportes: «Sin análisis de agua en este proyecto». Independiente del ajuste por suelo.

**Ajuste por niveles en suelo (UI):** etiqueta «Traer de análisis» + desplegable (reportes Análisis → Suelo). Independiente del agua y de Nutrición granular. Si eliges un reporte: ajuste = max(extracción × 25 %/100, max(0, extracción total − diferencia considerada del ciclo)). Si el suelo cubre más que la extracción, Fertirriego aplica **25 % de mantenimiento** (no editable en pantalla) para no apagar el nutriente; sale un aviso debajo de la tabla con los nutrientes afectados. Editar una casilla conserva el análisis y solo ese nutriente queda manual; volver a elegir el reporte reaplica todo. Luego eficiencia. Si no eliges reporte, se queda como extracción total o lo editado. Granular no usa este mantenimiento.

**Costos del programa (USD/ha):** precio canónico **USD/t métrica** por material (`NpFertilizerPrice`; UI métrico USD/t · US customary USD/ton corta). Por columna de fertilizante: kg producto/ha = suma de dosis en el ciclo (si unidad L: L/ha × densidad) → costo = kg/ha × (USD/t ÷ 1000). **Costo total** = suma de columnas → **USD/ha** (o USD/acre). Solubles personalizados y overrides de precio se **comparten con Hidroponía**. Sin precio → 0 / «—». No inventar precios de mercado.

### 4.7 Gráficas iónicas fertirriego

**URL:** …/fertirriego-graficas-ionicas.html · Fertilizante solo vs + agua; ternarios; Cl aparte.

**Dinámica Nutricional (dashboard, PDF y admin):** debajo de las curvas hay una tabla de **2 filas** — **% fertirriego** vs **% nutrición granular de base** — con una columna por elemento. Es el **ciclo** (no la etapa del selector). No incluye agua. N granular = N total. Las dos filas suman 100% por nutriente. API admin `project_detail`: `fertigation_vs_granular_share_pct`. Luego: etapa a analizar + Macro resumen iónico.

### 4.8 Granular: requerimiento, programa y mezclas

**URL:** …/granular-mezclas.html  
- **Requerimiento** (Dashboard → Nutrición granular): extracción total = kg/ton × rendimiento; requerimiento real = Ajuste ÷ (Eficiencia/100). Ajuste kg/ha editable; desplegable **Traer de análisis** (reportes Análisis → Suelo) independiente de Fertirriego. Si eliges reporte: ajuste = max(0, extracción total − diferencia considerada del ciclo). Editar a mano desvincula. Eficiencias default granular: N 65 %, P₂O₅ 40 %, K₂O 85 %, CaO/MgO/SO₄ 85 %, micros 80 %, SiO₂ 85 % (editables).  
- **Programa:** aplicaciones numeradas; **mezcla física** (% TM por material, habitualmente 100 %) o **fertilizante al 100 %**; dosis kg/ha por aplicación → aporte nutriente = dosis × (% nutriente en mezcla / 100). Total programa = suma de aplicaciones; resumen **Aporte − Requerimiento = Diferencia**. Sin aporte por agua (≠ fertirriego). UI: texto de sugerencia bajo Diferencia: si el cultivo también lleva fertirriego, el faltante (naranja) se puede cubrir en ese programa (EN si idioma EN).  
- **Formulación:** % nutriente en mezcla = Σ(% TM × % material); relación N-P₂O₅-K₂O normalizada al mínimo de los tres; kg/ha = dosis × %/100.  
- **Costos (USD/ha):** kg producto/ha del material = dosis kg/ha × (% TM ÷ 100); costo = kg/ha × (USD/t ÷ 1000). Total aplicación / programa en **USD/ha** (USD/acre si US customary). Precio desde catálogo/overrides; sin precio → «—».  
- **Gratis** (`granular-mix-free`): solo formulación de mezcla + kg/ha según dosis (localStorage). **Proyecto nube:** requerimiento + programa + resumen + costos. Modo óxido/elemental como fertirriego.

### 4.9 Hidroponía por etapa

**URL:** …/hidroponia-solucion-por-etapa.html · Proyecto nube; etapas; CE ≈ Σmeq/20; tanques A–E; agua relleno resta objetivo. ≠ herramienta gratis didáctica.

**Agua y ácido en Cálculo de fertilizantes (lógica de producto):**
- UI: etiqueta **«Traer de análisis»** + desplegable **«Seleccionar análisis…»**. Al elegir un reporte Análisis → Agua se cargan ppm (macros, micros, Cl⁻) y la dosis de ácido.
- **Leyenda de ácido / volumen** (UI, panel admin y PDF; EN si el reporte está en inglés):
  1. Ácido del análisis: HNO₃ 55 % (11,6 meq/mL), H₂SO₄ 98 % (36,7), H₃PO₄ 75 % (12,0) o 85 % (14,6).
  2. meq/L a neutralizar = (HCO₃⁻ + CO₃²⁻) − residual objetivo (defecto 1 meq/L).
  3. mL/m³ = meq/L × 1000 ÷ meqPerMl del ácido; L totales = mL/m³ × m³ ÷ 1000.
  4. Se muestran L según el **m³ del análisis** y L según el **volumen de agua de hidroponía**.
  5. Aviso si esos m³ coinciden o no (tolerancia ≈ 0,01 m³) + recordatorio de revisar la dosis.
- **Ácido en filas:** el campo L es el **volumen total para el m³ de hidroponía** (no solo mL/m³). Modo producto, **tanque C**; aporte N/P/S (densidad × %) resta del faltante. Mismos IDs que Análisis → Agua.
- **Propuesta automática** (reemplaza filas): (0) ácido C primero → nitrato Ca A → MAP/MKP B → NKS B → nitrato Mg A → SOP B → nitrato Ca extra por N-NO₃ restante → sulfato amonio → sulfato Mg/S → micros. El S suele quedar ligeramente sobre/bajo.
- Catálogo de soluciones (Steiner/Hoagland/… + propias). Solubles personalizados **compartidos con Fertirriego**.
- **Costos (USD del lote, no por ha):** kg eq del producto para el volumen × (USD/t ÷ 1000); líquidos kg = L × densidad. Total = suma de filas. Precios sincronizados con ferti.

### 4.10 Solución didáctica (gratis)

**URL:** …/diseno-solucion-nutritiva-didactica.html · login localStorage; triángulos, CE, Cl, NH₄.

### 4.11 VPD y Radar Satelital (NDVI / NDMI / NDRE / RGB + relieve DEM)

**URL:** …/vpd-deficit-presion-vapor.html · VPD kPa (Tetens / simple / avanzada); módulo **Radar Satelital** (antes Ubicación) con Pilot Copernicus/Sentinel-2: **NDVI** (vigor), **NDMI** (humedad relativa del dosel), **NDRE** (clorofila / estado del dosel, red edge), **RGB** (vista natural). Además capas fijas de relieve **Pendiente** y **Altura** (Copernicus DEM GLO-30 ~30 m). Apoyo a decisión, no sustituye recorrido de campo.

**Cómo se arma la imagen:** **Pilot y Lectura** = **1 sola pasada** Sentinel-2 por imagen (la más clara sobre el predio; sin mediana ni relleno entre fechas) + máscara **SCL**. Lectura mantiene periodos (quincenal/mensual) y clima/riego del periodo. Las **cuatro capas** salen juntas de la misma generación. Resolución típica ~**10 m**/píxel (NDRE/NDMI usan bandas nativas ~20 m remuestreadas).

**Colorimetría índices (NDVI/NDMI/NDRE):** escala **relativa al predio y a la fecha** (P10–P90). Rojo/naranja = menor nivel relativo; amarillo/verde claro = intermedio; verde intenso (o azul verdoso en NDMI) = mayor nivel relativo. No es escala absoluta ni diagnóstico solo por color.

**RGB (vista natural):** no usa Menor/Mayor. **Verde** ≈ planta viva; **rojo/café/rosado** ≈ suelo desnudo o rastrojo (color natural de la tierra, no “bajo vigor”). Útil para ubicar el predio y contrastar con índices.

**Relieve DEM (Pendiente + Altura):** botón **Generar relieve** produce **ambas** capas de una vez (**0 créditos** Radar; no usa Pilot ni fecha Sentinel). Cache por `polygon_hash`; regenerar solo si movés el polígono. **Pendiente (%):** crema/gris = más plano → café oscuro = más inclinado; mismo color ≈ misma inclinación (**no** misma altitud). **Altura:** azul = más bajo → ámbar/café = más alto **dentro del predio**; mismo color ≈ misma altura relativa. Unidades: pendiente siempre %; altitud en **m** (métrico) o **ft** (US customary); botones/leyendas i18n ES/EN. En PDF/admin, si hay DEM: dos mapas (altura + pendiente) en lugar del croquis SVG simple.

**Tope de área:** máximo **250 ha**. Si el polígono es mayor: mensaje «Radar máximo 250 ha; divide el polígono» (no gasta crédito). Ranchos grandes → lotes separados.

**Pilot (pestaña Polígono / NDVI y NDMI):** ventanas **14 → 21 → 30 → 45 d**; **1 pasada** (la más clara + SCL; sin mezclar fechas). Solo corta si ~**100%** útiles; si no, guarda lo mejor (≥~15% cobertura útil). Si &lt;~15% no guarda imagen vacía. Muestra fecha satelital y % útil. Capas: NDVI → NDMI → NDRE → RGB (+ selector **Pendiente/Altura** si ya generaste relieve). Créditos internos: base **20/mes** (+ bonus). Costo por generación: ≤30 ha = **1** · >30 ha = **2** · >100 ha = **3** (las cuatro capas Sentinel juntas; **DEM no consume**). Ver historial / «Ver en mapa» no gasta.

**Lectura Satelital (pestaña 2):** histórico del **mismo predio** con **2–6 periodos** (fecha final elegida), **quincenal (15 d)** o **mensual**. Por periodo: NDVI/NDMI/NDRE promedio, miniaturas NDVI|NDMI|NDRE|RGB, VPD promedio + horas VPD por banda (Open-Meteo), ET₀ y lluvia acumulados, riego m³↔mm. En la gráfica, el tooltip de horas VPD muestra **horas y %** de cada rango (&lt;0.5 / 0.5–1.5 / &gt;1.5) respecto al total de horas del periodo (p. ej. 15 d ≈ 360 h). Si hay **Kc** en Clima (`irrigationQuickCalc.kc`), la gráfica añade **ETc = ET₀ × Kc** por periodo (eje mm; Kc constante). **1 pasada**/periodo (la más clara; sin mediana); quincena incompleta puede ampliar al mes (`lookback_expanded`, *). Costo **fijo por consulta**: **3 créditos** ≤30 ha, **4** si >30 ha. Persistencia `location.lecturaSatelital`. PDF/admin: tabla, gráfica, miniaturas.
### 4.11b Balance hídrico y cálculo rápido de riego (Clima)

**URL:** …/balance-hidrico-riego-clima.html · **Dashboard PRO → Clima → Lluvia y ET₀** → calculadora de balance hídrico.

| Concepto | Detalle |
|----------|---------|
| Periodo | 1, 7 o 30 días (acumulados) |
| ETo / lluvia | Satélite (ventanas rodantes Open-Meteo) o manual; macrotúnel = lluvia 0 |
| Kc | Usuario lo ingresa; tabla FAO-56 solo consulta |
| Fórmulas | ETc = ETo × Kc; déficit climático = ETo − lluvia; déficit cultivo = ETc − lluvia; **balance m³ = déficit m³ cultivo − riego m³ en franja**; balance mm ref. cultivo = balance m³ ÷ (10 × ha cultivo) |
| Volumen | 1 mm sobre X ha = X × 10 m³; **riego aplicado solo en m³** en franja; mm franja = m³ ÷ (ha regada × 10) — mm solo en resultados |
| Franja regada | Déficit en mm/m³ sobre **ha cultivo**; riego siempre en **franja humedecida (m³)**; mm en franja = mm cultivo × (ha cultivo ÷ ha regada); m³ totales **no** se dividen. Ej.: 90 m³ = 9 mm ref. 1 ha = 15 mm en 0,6 ha franja |
| Puente 🪨 suelo | Desplegable Sin ajuste / Déficit (+ riego) / Exceso (− riego) + m³ manual; **«Sugerir desde 🪨 suelo»** prellena desde `nutriplant_bridge_soil_water_v1` (prioriza m³ hasta **objetivo 60% AU** si θ &lt; zona 40–60%; si no, hasta CC). Solo integra al **total integrado (clima ± almacén)** si hay valor; ≠ riego ya aplicado |
| Total integrado | Balance climático ± ajuste almacén suelo manual (m³); líneas «Ajuste almacén suelo» y «Total integrado» en resumen; recuadro azul usa total integrado cuando aplica |
| Recuadro «Dato importante» | Si hay franja distinta: riego sugerido (m³), lámina en franja (mm), aplicar en franja (m³). Criterio NutriPlant + enlace a tabla % suelo explorado |
| Tablas desplegables | Kc FAO-56 (consulta) y **% suelo explorado por sistema** (aguacate, berry, hortaliza…) |
| % alcance raíces | Sugiere franja (ha cultivo × % ÷ 100); **no altera déficit ETc**. Estimar %: **Conversor magnitudes** → alcance raíz (copa circular o cama/banda) o tabla en N mineralizable |
| Persistencia | `climateAnalysis.irrigationQuickCalc` + `rolling` en JSON proyecto; ajuste suelo: `soilStorageMode`, `soilStorageM3` (PRO) / `irr-soil-mode`, `irr-soil-m3` (gratis) |
| Gráfica Clima | Vista Gráficas: lluvia + ET₀ por año; con Kc → línea **ETc = ET₀ × Kc** del año en curso (Kc constante). Misma lógica en PDF/Admin |
| Límite | No integración automática de almacén en ETc (solo ajuste manual opcional); no escurrimiento, drenaje ni lixiviación; validar en campo |
| PDF | Reporte Clima puede incluir balance guardado + bloque 🪨 suelo (sesión navegador) |

**API admin:** `project_climate` mode=saved (snapshot) | live | rainfall_refresh | rolling | **all** (recomendado «actualizado»). Campos live: `rolling_windows_ahora`, `irrigation_quick_calc_live`. Solo lectura; no altera al suscriptor.

### 4.12 Dureza, acidificación y solubilidad (agua)

**URL:** …/agua-dureza-acidificacion-solubilidad.html  
- **Dureza:** ppm CaCO₃ ↔ meq/L (÷50,043); °dH/°e/°fH; clase USGS (&lt;60 blanda … ≥180 muy dura). Dureza lab = Ca×2,498 + Mg×4,118 (ppm CaCO₃).  
- **Ácido:** meq/L a neutralizar = (HCO₃⁻ + CO₃²⁻) − residual; mL/m³ = meq/L×1000÷meq/mL ácido. Ácidos app: HNO₃ 55 %, H₂SO₄ 98 %, H₃PO₄ 75/85 %. No neutralizar 100 % por defecto. En **Hidroponía** y **Fertirriego**, al **Seleccionar análisis…** (etiqueta Traer de análisis) la misma dosis **mL/m³** se muestra como leyenda. En hidroponía entra al **tanque C** (L = mL/m³ × m³ hidro ÷ 1000; ahí sí se compara con el m³ del análisis si el usuario lo usó como volumen de solución). En fertirriego entra **primero** al programa: L/ha = mL/m³ × lámina etapa (m³/ha) ÷ 1000; la leyenda **no** usa el m³ del análisis (ese campo es del reporte, lo define el usuario). Su N/P/S resta del faltante. Admin/PDF; EN si reporte EN. Ver §4.6 y §4.9.  
- **IS:** NaNO₃=100; solubilidad g/L tabla gratis. IS alto = más osmótico relativo, no «prohibido». Herramientas: `agua_dureza`, `solubilidad_is` en free_tools_catalog.

### 4.13 Mulder y compatibilidad (Pilar F)

**URL:** …/interacciones-mulder-compatibilidad.html  
- **Mulder:** rojo = antagonismo bidireccional en aristas; azul = sinergia **solo desde ion seleccionado** (ficha lateral = ion focal). Referencias: K⁺ vs Ca/Mg/NH₄; P alto vs Zn/Fe/Cu/Mn/Ca; **Cu²⁺ ↔ Mn²⁺** competencia entre micros (rojo en diagrama); SO₄ vs Mo; NO₃ sinergia K, NH₄, Mo.  
- **Movilidad:** N,P,K,Mg móviles (hoja vieja); Ca,B punta; Fe,Mn,Zn,Cu según especie/pH. Mecanismos: masa, difusión, interceptación.  
- **Compatibilidad:** matriz C/R/I alineada FERT_SOLUBLES; C compatible, R precaución (solubilidad/salting-out), I precipitado en madre concentrada. Tanques A/B. Herramientas: `interacciones`, `fertilizer_compatibility`.

### 4.14 N mineralizable y agua en suelo

**URL:** …/n-mineralizable-agua-disponible-suelo.html  
- **N_min (kg N/ha/año):** 10000×(P/100)×DA×1000×(R/100)×(MO/100)×(N_MO/100)×(T_min/100); P cm, DA g/cm³, T_min 1–3 %/año. Orden magnitud, no ensayo lab.  
- **Agua:** vol m³ = ha×10000×(prof_cm/100); útil % = CC−PMP; vol útil = vol×(CC−PMP)/100×(% superficie/100). **Zona objetivo 40–60% AU** (entre PMP y CC): objetivo alto = PMP + 0,6×(CC−PMP); franja violeta en gráfica. **Gráfica:** título «Proporción de agua por estado · % volumétrico de referencia»; stats bajo barra con **mm · m³**. Con θ: recuadro azul (m³·mm hasta CC) + «Aplica X m³… no son dos riegos»; recuadro violeta hasta objetivo 60% AU. **m³ vs mm:** `m³ = mm × ha × 10`; aplicar m³ en franja; mm ref. ha = m³÷(ha×10). Puente `nutriplant_bridge_soil_water_v1` (m³ CC, m³ objetivo, exceso) → balance «Sugerir desde 🪨 suelo». Textura USDA.
- Herramientas: `n_mineralizable`, `agua_textura`, `lamina_riego` (puente `nutriplant_bridge_soil_water_v1`).

### 4.15 Huella de carbono de fertilizantes (Pilar F — sostenibilidad)

**URL:** …/huella-carbono-fertilizantes.html  
- **Posicionamiento:** referencia **global abierta** NutriPlant; calibración **Fertilizers Europe (2020)** en urea, AN, CAN, UAN (promedios regionales DNV). No PCF por planta.  
- **Fabricación EU (kg CO₂e/kg, FE 2020 = NutriPlant):** urea 0,878 · AN 1,112 · CAN 0,951 · UAN 0,782 (excl. CO₂ en producto urea/UAN).  
- **Transporte (3 tramos):** DESNZ. **Campo N₂O:** IPCC Tier 1. Programa A vs B. CAN/UAN en catálogo desde v2026-06-23.  
- **Disponibilidad regional:** listado filtrado por origen fab. (`availability_profiles`); hidrosolubles no disponibles con origen MX/BR/LATAM (`not_applicable`); factor propio permite EPD de importación.  
- **Mezclas comerciales:** **NK+Mg no está en catálogo** (v2026-06-26) — es blend KNO₃ + Mg sin factor LCA único por región; modelar como nitrato potasio + nitrato/sulfato Mg, o factor propio. **21 productos** en JSON.  
- **Ruta por fertilizante:** cada fila con origen, km 3 tramos, país/puerto destino; clic en fila edita panel 🏭→🌾.  
- **Equivalencia pick-up A vs B:** km ilustrativos en pick-up mediana 6 cil. (0,254 kg CO₂e/km DESNZ); total A, B y diferencia — no compensación.  
- **Herramienta:** `fertilizer_carbon`; LS `nutriplant_free_fertilizer_carbon_v2`. Panel calibración FE en UI.

### 4.15b Atlas Fisiológico Vegetal (Pilar F — fisiología vegetal)

**URL:** …/atlas-aminoacidos-vegetales.html
- **Herramienta gratuita:** `atlas-aminoacidos-vegetales-free.html` (login/dashboard, icono 🧬). Dos pestañas: **Aminoácidos** y **Ciclo hormonal**.

#### Aminoácidos (pestaña 1)
- Biblioteca interactiva de los 20 aminoácidos proteinogénicos con enfoque en nutrición, fisiología vegetal y aplicación agronómica responsable.
- **Cada tarjeta:** nombre común, nombre L-alpha (glicina: no quiral), abreviaturas 3/1 letras, fórmula, peso molecular, familia química, rutas metabólicas, función fisiológica, beneficios agronómicos, fenología, estrés, precursores, categorías funcionales, evidencia y bibliografía base.
- **Modelo 3D:** 3Dmol.js + PubChem SDF 3D cuando hay conexión; CPK/Jmol: C gris, H blanco, O rojo, N azul, S amarillo; rotación 360°, zoom y selección de átomos.
- **Filtros:** estrés, fenología, formulación nutricional, categoría funcional y evidencia. Categorías: metabolismo del N, fotosíntesis, respuesta al estrés, desarrollo radicular, crecimiento vegetativo, floración, cuajado, llenado, defensa vegetal, antioxidantes, precursor hormonal y transporte de N.
- **Ejemplos de criterio:** prolina = estrés osmótico/hídrico/salino; triptófano = precursor de rutas de auxina; glutamato/glutamina/asparagina/arginina = metabolismo y transporte de N; cisteína = glutatión/defensa antioxidante; fenilalanina = fenilpropanoides/lignina/defensa; metionina = SAM/etileno/poliaminas.
- **Evidencia:** Alta/Media/Baja; no convertir rutas metabólicas en promesa de campo. La respuesta depende de cultivo, dosis, fuente comercial, mezcla, vía de aplicación, estado nutricional, ambiente y validación.
- **Fuentes:** PubChem, KEGG, PlantCyc, Plant Physiology and Development, Biochemistry & Molecular Biology of Plants, Marschner y artículos científicos.

#### Ciclo hormonal (pestaña 2)
- **Mapa visual didáctico** de tendencias relativas de actividad hormonal (no valores de laboratorio). Curvas suaves + puntos de transición donde una fitohormona cede a la siguiente.
- **Secuencia:** Citoquinina → Auxina → Giberelinas → Etileno → ABA.
- **Etapas y eventos:**
  - **I Germinación y Establecimiento** — Iniciación celular (división); CK + Auxina; N, Ca, P, Zn, Mg, K, Mn.
  - **II Crecimiento Vegetativo** — Crecimiento celular · Madurez celular; Auxina + GA; Ca, Cu, Mg, B, Mn, N, Zn, NO₃.
  - **III Floración y Reproducción** — Senescencia (transición reproductiva); GA + Etileno; Ca, B, Mg, N amínico.
  - **IV Maduración y senescencia** — Cierre del ciclo fisiológico; Etileno + ABA; B, Cu, P, K, Mo, Mg, N amínico.
- **Transiciones gráfico:** Iniciación (CK→Auxina), Crecimiento (Auxina→GA), Madurez (GA→Etileno), Senescencia (Etileno→ABA).
- **Rol por hormona:** CK = división/brotación; Auxina = polaridad/elongación; GA = crecimiento/floración; Etileno = maduración/senescencia (Metionina→SAM→etileno); ABA = estrés/cierre (carotenoides).
- **Criterio agronómico:** marco general para mayoría de cultivos; timing y balance hormonal varían por especie, genética, ambiente y manejo. Cruce con programa de fertirriego, análisis y fenología real del cultivo.
- **Aviso:** desequilibrio hormonal-nutricional en transición puede reducir irreversiblemente expresión genética.
- **Fuentes:** Taiz & Zeiger, Marschner, BMBP, KEGG biosíntesis hormonal.

### 4.16 Solución nutritiva (lab)

**URL:** …/analisis-solucion-nutritiva-lab.html · `solucionNutritivaAnalyses[]`. CE, pH, RAS manual. Cationes/aniones meq↔ppm (pesos eq. Ca 20,04, K 39,1, NO₃ 14…). Rangos SN_REF_DEFAULT; ideal editable; diff = lab − ideal. ≠ extracto pasta ≠ diseño didáctico gratis.

### 4.17 Extracto de pasta

**URL:** …/analisis-extracto-pasta.html · Misma estructura iónica que solución nutritiva; interpretación = disponibilidad en rizósfera (pasta saturada), no licor de fertirriego. ≠ solución nutritiva lab.

### 4.18 Agua RAS

**URL:** …/analisis-agua-ras-sar.html · CE, pH, cationes, aniones, residual ácido. **RAS en app = campo manual.** Fórmula referencia: RAS = Na ÷ √((Ca+Mg)/2) en meq/L. Guías: &lt;3 bajo, 3–6 mod, &gt;6–8 alto riesgo sodio. UI: el m³ (o gal US) de agua de riego va en celda azul en la cabecera del reporte; de ese volumen salen kg y L de ácido.

### 4.19 Foliar DOP

**URL:** …/analisis-foliar-dop.html · DOP % = ((nivel−óptimo)/óptimo)×100.

### 4.20 Fruta ICC

**URL:** …/analisis-fruta-icc.html · ICC % misma fórmula que DOP. Semáforo |ICC|: ≤10 verde, 10–25 amarillo, 25–50 naranja, &gt;50 rojo. Calidad °Brix, firmeza; Ca total/soluble/ligado.

### 4.21 FAQ % meq (hidroponía y fertirriego)

**URL:** …/faq-porcentajes-no-suman-100.html · Título web: «% meq en hidroponía y fertirriego: por qué no todo suma 100 %». Triángulos N-P-S y K-Ca-Mg suman 100 % cada uno; Cl y NH₄ aparte. ≠ % saturación CIC suelo (§4.2).

### 4.22 Publicaciones en redes (pilar G)

**URL:** …/publicaciones-redes-sociales.html  
Canales oficiales; tono técnico; mapa capítulo→post; plantilla LinkedIn. **Posts con URL:** Knowledge `PUBLICACIONES-REDES-CONOCIMIENTO-GPT.md` §8 (**24 posts** LinkedIn empresa NutriPlant PRO; IDs `li_*`). Para redactar o «como el post de P-Zn»: ese doc §8b + capítulo citado.

---

## 5. Cómo debe usarlo el GPT Socio

| Pregunta | Fuente |
|----------|--------|
| «¿Por dónde empiezo en NutriPlant?» | Capítulo `flujo-nutriplant-pro` (§4.0) |
| «¿Cómo convierto ppm de Fe a µmol/L?» / micros en conversor | §4.1 + HERRAMIENTAS (conversor µmol) + `free_tools_catalog` `conversor_unidades_nutrientes` |
| Metodología / citar web / GEO | Este Knowledge + URL capítulo |
| Índice o slug | `manual_tecnico_catalog` o §3 |
| Redactar post LinkedIn/IG | `PUBLICACIONES-REDES-CONOCIMIENTO-GPT.md` + capítulo §4 |
| Datos proyecto suscriptor | `project_analyses` / `project_detail` |
| Calculadora gratis | `free_tools_catalog` / HERRAMIENTAS |
| Aminoácidos vegetales, estrés, fenología o formulación | `atlas-aminoacidos-vegetales` + HERRAMIENTAS `atlas_aminoacidos_vegetales` |
| Ciclo hormonal, fitohormonas, etapas fenológicas o nutrición por etapa | `atlas-aminoacidos-vegetales` §7 + HERRAMIENTAS `atlas_aminoacidos_vegetales` pestaña Ciclo hormonal |
| 6 pestañas Análisis | `lab_analyses_catalog` |

**Búsqueda web (si activa):** priorizar nutriplantpro.com/manual-tecnico sobre blogs genéricos.

---

## 6. Mantenimiento manual

**Versión web v2026.07.1:** 25 capítulos · Atlas de Aminoácidos Vegetales 🧬 · huella carbono fertilizantes (21 productos; NK+Mg excluido como mezcla comercial) · calculadora 🌍 (ruta por fila, pick-up A vs B) · Pilar 1 flujo · buscador índice.

Plan histórico: `docs/MANUAL-TECNICO-NUTRIPLANT-PLAN.md`

---

*Alineado con manual-tecnico/ v2026.07.1 en repo*
