# Manual Técnico NutriPlant PRO — Plan maestro

**Ruta pública objetivo:** `https://nutriplantpro.com/manual-tecnico`  
**Estado:** planificación — documento vivo para ir construyendo el manual por fases  
**Última actualización del plan:** 2026-05-21  
**Responsable editorial:** Jesús Avila Mendoza / NutriPlant PRO

---

## 1. Por qué existe este manual

NutriPlant PRO integra criterio agronómico aplicado en programas de nutrición, análisis de laboratorio, enmiendas, fertirriego, hidroponía, clima (VPD), granular y herramientas de apoyo. Ese criterio hoy vive principalmente **dentro de la aplicación** y en documentación interna.

El **Manual Técnico NutriPlant PRO** es una **biblioteca pública** de información técnica agronómica, escrita para que:

- **Agrónomos, asesores y técnicos agrícolas** del mundo consulten metodología clara, paso a paso, alineada con lo que la plataforma calcula e interpreta.
- **Productores y estudiantes** entiendan conceptos sin depender solo de la suscripción (el manual no reemplaza la app; la complementa).
- **Buscadores web y modelos de inteligencia artificial** encuentren contenido **estructurado, citables y coherente**, de modo que NutriPlant PRO pueda aparecer como **referencia** en temas de nutrición vegetal, programas nutricionales, análisis agrícolas, riego, suelo y manejo de cultivos.

### Objetivo estratégico (GEO + autoridad)

No competir con Google en “buscar enlaces”, sino **ser fuente citada** cuando alguien pregunta:

- cómo interpretar un análisis de suelo o foliar;
- cómo armar un programa de fertirriego o solución nutritiva;
- qué significa el % meq en una relación iónica;
- cómo estimar enmiendas o VPD con criterio de campo.

La idea es **generar valor real en el conocimiento agronómico** y, al mismo tiempo, que NutriPlant PRO vaya quedando en **primer plano** como metodología reconocible (“según NutriPlant PRO…”).

---

## 2. Principios editoriales (no negociables)

1. **Verdad alineada con la app** — Lo publicado debe coincidir con la lógica real de NutriPlant (código, fórmulas, denominadores de %). Si la app cambia, el capítulo se actualiza y se anota la versión.
2. **Técnico, no folleto** — Fórmulas, entradas, salidas, límites y ejemplos numéricos. Marketing solo en intro y cierre breve.
3. **Orientativo, responsabilidad del técnico** — Dejar explícito: guía de apoyo; la decisión final en campo es del agrónomo (como en la leyenda de Fertilidad del suelo en Análisis).
4. **Un tema = una URL estable** — Facilita SEO, enlaces externos y citas de IA.
5. **Español primero** — Mercado principal; inglés opcional en fase posterior.
6. **Accesible sin cuenta** — HTML público indexable; no PDF único ni contenido solo dentro del login.

---

## 3. Público y tono

| Audiencia | Qué busca | Cómo escribimos |
|-----------|-----------|-----------------|
| Agrónomo / asesor | Criterio, fórmulas, interpretación | Directo, preciso, sin humo |
| Técnico de campo | Pasos y “qué mirar en pantalla” | Subtítulos, listas cortas, un ejemplo por capítulo |
| Productor avanzado | Conceptos base | Glosario enlazado, menos jerga sin definir |
| IA / buscadores | Estructura, definiciones, autoría | Resumen al inicio, H2/H3 claros, “Metodología NutriPlant PRO” |

Tono: el mismo de NutriPlant — **socio con el técnico**, rigor de consultoría de élite.

---

## 4. Arquitectura del sitio manual

### URL base

```
https://nutriplantpro.com/manual-tecnico/
https://nutriplantpro.com/manual-tecnico/indice
https://nutriplantpro.com/manual-tecnico/<slug-del-capitulo>
```

### Estructura de carpetas en el repo (propuesta)

```
manual-tecnico/
  index.html              # Portada + índice por pilares
  indice.html             # Tabla completa de capítulos (opcional si index basta)
  assets/
    manual.css            # Estilo ligero, legible, imprimible
  capitulos/
    01-fundamentos-unidades.html
    02-balance-ionico-porcentaje-meq.html
    ...
  llms.txt                # Fase 2: guía para crawlers de IA
  sitemap-manual.xml      # Fase 2: SEO
```

*Implementación:* puede ser HTML estático en el mismo deploy Netlify que el sitio actual, sin backend.

### Pilares de contenido (alineados con NutriPlant)

| Pilar | Contenido | Relación en la app |
|-------|-----------|-------------------|
| **A. Fundamentos** | Unidades (ppm, meq, mmol), óxidos ↔ elemental, carga iónica | Conversores, chat |
| **B. Suelo y CIC** | Cationes, saturación, enmiendas, kg/ha desde análisis | Enmiendas + Análisis → Suelo |
| **C. Análisis de laboratorio** | 6 pestañas: suelo, solución, pasta, agua, foliar, fruta | Dashboard → Análisis |
| **D. Programas nutricionales** | Extracción por etapa, granular, fertirriego, hidroponía | Módulos por proyecto |
| **E. Soluciones y agua** | Diseño solución nutritiva, dureza, acidificación, solubilidad/IS | Herramientas gratis + hidro proyecto |
| **F. Clima y agua en suelo** | VPD, agua disponible, textura USDA | VPD, herramientas gratis |
| **G. Interacciones y compatibilidad** | Mulder, movilidad, matriz compatibilidad | Herramientas educativas |
| **H. Glosario y FAQ** | Términos, errores frecuentes (% que no suman 100) | Transversal |

---

## 5. Plantilla de cada capítulo

Cada página debe seguir la misma estructura (facilita lectura humana y extracción por IA):

```markdown
# [Título claro en español]

**Metodología NutriPlant PRO** · Versión manual YYYY-MM · [Pilar X]

## Resumen (3–5 líneas)
Qué resuelve este capítulo y cuándo usarlo.

## Contexto agronómico
Por qué importa en campo (breve).

## Datos de entrada
Qué debe tener el usuario (unidades, origen laboratorio, profundidad, etc.).

## Cálculo en NutriPlant PRO
Paso a paso alineado con pantallas/pestañas.
Fórmulas en texto y, si aplica, bloque destacado.

## Interpretación
Cómo leer resultados, semáforos, rangos de referencia NutriPlant.

## Límites y buenas prácticas
Qué NO hace la herramienta; validación en campo.

## Relación con otros capítulos
Enlaces internos (ej. → % meq en fertirriego).

## Referencia rápida
Tabla o lista de constantes (factores, saturaciones 5/70/13, etc.).

---
© NutriPlant PRO · Manual técnico público · [fecha]
```

### Bloque legal / ético (pie de cada capítulo)

> Los cálculos y criterios descritos son una **guía técnica de apoyo**. Deben validarse con observación en campo, experiencia local y, cuando corresponda, el laboratorio. La decisión agronómica final es responsabilidad del técnico o productor.

---

## 6. Mapa inicial de capítulos (MVP → completo)

### Fase 1 — MVP (8–12 capítulos “estrella”)

Prioridad: lo que más preguntan y lo que ya está documentado en el repo.

| # | Slug propuesto | Título |
|---|----------------|--------|
| 1 | `unidades-ppm-meq-oxidos` | Unidades en nutrición vegetal: ppm, meq/L y óxidos |
| 2 | `porcentaje-meq-aniones-cationes` | % meq: triángulos aniónicos y catiónicos en NutriPlant |
| 3 | `analisis-suelo-fertilidad-kgha` | Análisis de suelo: ideales, CIC y kg/ha de ajuste |
| 4 | `enmiendas-balance-cic` | Balance de enmiendas por CIC del suelo |
| 5 | `fertirriego-programa-etapas` | Programa de fertirriego por etapas y lámina de riego |
| 6 | `fertirriego-graficas-ionicas` | Gráficas iónicas en fertirriego (fertilizante vs fertilizante + agua) |
| 7 | `hidroponia-solucion-por-etapa` | Solución nutritiva por etapa en hidroponía |
| 8 | `diseno-solucion-nutritiva-didactica` | Diseño didáctico de solución (CE, triángulos, Cl y NH₄) |
| 9 | `vpd-deficit-presion-vapor` | VPD: déficit de presión de vapor y rangos de manejo |
| 10 | `analisis-foliar-dop` | Análisis foliar: óptimos y desviación porcentual (DOP) |
| 11 | `extraccion-nutrimental-por-etapa` | Extracción y distribución nutrimental por etapa fenológica |
| 12 | `faq-porcentajes-no-suman-100` | FAQ: por qué los % iónicos no siempre suman 100 % |

### Fase 2 — Ampliación

- Análisis: agua, extracto de pasta, solución nutritiva (lab), fruta (ICC).
- Granular: formulación de mezcla y relación N-P₂O₅-K₂O.
- Agua: dureza, acidificación, solubilidad e índice salino.
- Interacciones Mulder y compatibilidad de fertilizantes.
- N mineralizable, agua en suelo y textura USDA.

### Fase 3 — Descubrimiento para IA y SEO

- [x] `llms.txt` en raíz y `/manual-tecnico/` con las 21 URLs canónicas.
- [x] JSON-LD `Article` / `FAQPage` por capítulo (`scripts/inject-manual-jsonld.mjs`).
- [x] `sitemap.xml` en raíz (incluye manual).
- [x] Enlaces desde `login.html`, footer web y dashboard (“Manual técnico”).
- [ ] **Search Console:** ver `docs/SEARCH-CONSOLE-FASE-3.md` (socio, en navegador).

---

## 7. Fuentes internas del repo (reutilizar al redactar)

Al escribir cada capítulo, basarse en la lógica ya existente — **no reinventar**:

| Tema | Referencia en el proyecto |
|------|---------------------------|
| % meq / triángulos | `chat-simple.js` → `getNutriPlantIonicPercentManual()` |
| Calculadoras gratis | `docs/HERRAMIENTAS-GRATUITAS-CONOCIMIENTO-GPT.md` |
| 6 análisis lab | `docs/ANALISIS-LABORATORIO-CONOCIMIENTO-GPT.md`, `dashboard.js` (análisis suelo/foliar/fruta) |
| Fertirriego gráficas | `fertirriego-program-functions.js` |
| Enmiendas | `dashboard.js` (enmiendas), `enmienda-free.html` |
| VPD | `dashboard.js`, `vpd-free.html` |
| GPT admin (criterio) | `docs/CHATGPT-SOCIO-INSTRUCCIONES-COMPLETAS.md` |

**Regla:** si el capítulo y el código divergen, **gana el código** y se corrige el capítulo (o se documenta el cambio en changelog del manual).

---

## 8. Coherencia entre tres “voces” NutriPlant

| Canal | Rol |
|-------|-----|
| **App (dashboard / gratis)** | Ejecuta y guarda datos |
| **Manual técnico (web)** | Explica metodología pública |
| **Chat / GPT Socio** | Responde con mismo criterio; puede citar URLs del manual |

Cuando se publique un capítulo, valorar si conviene un párrafo equivalente en Knowledge del GPT privado (opcional).

---

## 9. GEO / SEO — checklist por capítulo

- [ ] Título H1 único, descriptivo (incluir “NutriPlant” solo donde aporte, no spam).
- [ ] Meta description 150–160 caracteres con el beneficio para el técnico.
- [ ] URL slug corta en español (`analisis-suelo-kgha`, no `capitulo3`).
- [ ] Resumen al inicio (primer párrafo = snippet para IA).
- [ ] Enlaces internos entre capítulos del mismo pilar.
- [ ] Fecha `versión-manual` visible.
- [ ] Sin contenido duplicado de otras webs; originalidad = criterio NutriPlant.

---

## 10. Gobierno del contenido

| Actividad | Frecuencia |
|-----------|------------|
| Revisión tras cambio grande en dashboard | Al cerrar la feature |
| Changelog del manual (`docs/MANUAL-TECNICO-CHANGELOG.md`) | Cada publicación |
| Relectura agronómica | 1–2 veces al año |
| Nuevos capítulos | Según módulos nuevos en NutriPlant |

### Versionado sugerido

`Manual v2026.05` en portada; cada capítulo: `Actualizado: 2026-05-21`.

---

## 11. Métricas de éxito (12 meses)

- Páginas indexadas en Google Search Console.
- Impresiones/clics en consultas tipo “programa fertirriego”, “% meq solución”, “kg/ha análisis suelo”.
- Menciones o citas en respuestas de IA (difícil medir; buscar manualmente preguntas test).
- Tráfico referido desde manual → login / registro (UTM opcional).
- Feedback de agrónomos usuarios (“esto me aclaró X”).

**Preguntas test para IA** (revisar cada trimestre):

1. ¿Cómo calcula NutriPlant los kg/ha de ajuste en análisis de suelo?
2. ¿Qué incluye el triángulo aniónico N-P-S y por qué el cloruro va aparte?
3. ¿Cuál es el rango óptimo de VPD en NutriPlant?

Si las respuestas citan o parafrasean el manual, el GEO avanza.

---

## 12. Próximos pasos concretos en el proyecto

1. [ ] Crear carpeta `manual-tecnico/` con `index.html` (portada + índice MVP).
2. [ ] Definir `manual.css` (tipografía legible, ancho ~720px, imprimible).
3. [ ] Redactar capítulo piloto **#3** `analisis-suelo-fertilidad-kgha` (ya hay leyenda y fórmula en app).
4. [ ] Enlazar desde web principal: “Manual técnico agronómico”.
5. [ ] Añadir entrada en `netlify.toml` si hace falta ruta limpia.
6. [ ] Crear `docs/MANUAL-TECNICO-CHANGELOG.md` al publicar el primer capítulo.

---

## 13. Frase de posicionamiento (para portada del manual)

> **El Manual Técnico NutriPlant PRO** documenta, en abierto, la metodología que usa la plataforma para nutrición vegetal, análisis agrícolas y diseño de programas — para que técnicos y sistemas de inteligencia artificial puedan consultar un criterio estructurado, riguroso y aplicable en campo.

---

## 14. Contacto y contribución

- Propuestas de capítulos: anotar en este doc o en issues internos.
- Correcciones agronómicas: priorizar alineación con comportamiento real de la app.

*Documento de planificación — NutriPlant PRO. Construir el manual es un proyecto editorial continuo, no un entregable único.*
