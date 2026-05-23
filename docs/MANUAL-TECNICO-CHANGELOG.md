# Manual Técnico NutriPlant PRO — Changelog

Registro de capítulos publicados y cambios relevantes.  
Plan maestro: `MANUAL-TECNICO-NUTRIPLANT-PLAN.md`

---

## 2026-05-23 — v2026.05.7 (Pilar flujo = 1, no H)

### Actualizado

- `index.html`, `flujo-nutriplant-pro.html`, `manual-search.js` — **1 · Flujo de la plataforma** (antes H; va primero en el índice, alineado al orden visual)
- `manual-tecnico-catalog.js`, Knowledge GPT e instrucciones Socio — pilar **1** + pilares A–G

---

## 2026-05-23 — v2026.05.6 (Créditos Radar NDVI/NDMI)

### Actualizado

- `vpd-deficit-presion-vapor.html` — sección **Créditos Radar**: costo por superficie del polígono (≤30 ha = 1 · >30 ha = 2 · >100 ha = 3), tope mensual 20, regenerar vs ver historial
- `MANUAL-TECNICO-CONOCIMIENTO-GPT.md` §4.11 + versión v2026.05.6
- `manual-tecnico-catalog.js` — summary capítulo VPD/NDVI
- `manual-search.js` — keywords créditos Radar

---

## 2026-05-21 — Fase 3 SEO / GEO (código)

- JSON-LD en 21 capítulos (`Article`; FAQ → `FAQPage`), índice (`CollectionPage` + `hasPart`), autoría (`ProfilePage`)
- `llms.txt` raíz y manual con 21 URLs + preguntas test GEO
- `scripts/inject-manual-jsonld.mjs` para regenerar schema tras nuevos capítulos
- `docs/SEARCH-CONSOLE-FASE-3.md` (pasos Google; pendiente en navegador)

---

## 2026-05-21 — v2026.05.4 (Pilares F y E cierre — fase 2 cerrada)

### Publicado

- `interacciones-mulder-compatibilidad.html` — Mulder (antagonismo/sinergia focal), movilidad, pH; matriz C/R/I (`interacciones-absorcion-movilidad-free`, `fertilizer-compatibility-free`)
- `n-mineralizable-agua-disponible-suelo.html` — N_min, CC−PMP, lámina, textura USDA (`n-mineralizable-mo-free`, `agua-disponible-textura-suelo-free`)

### Actualizado para ChatGPT Socio

- `MANUAL-TECNICO-CONOCIMIENTO-GPT.md` §3 + §4.13–4.14 + fase 2 cerrada · v2026.05.4 · **21 capítulos**
- `index.html` (sin «Próximamente»), `sitemap.xml`, `llms.txt`, `manual-tecnico-catalog.js` (`upcoming: []`)
- `agua-dureza-acidificacion-solubilidad.html`, `publicaciones-redes-sociales.html`, `PUBLICACIONES-REDES-CONOCIMIENTO-GPT.md` (mapa capítulos)
- `CHATGPT-SOCIO-PAQUETE-ACTUALIZACION.md`

---

## 2026-05-22 — v2026.05.3d (Pilar E — dureza, ácido, solubilidad/IS)

### Publicado

- `agua-dureza-acidificacion-solubilidad.html` — alineado con `agua-dureza-free.html` y `solubilidad-indice-salino-free.html`

### Actualizado para ChatGPT Socio

- `MANUAL-TECNICO-CONOCIMIENTO-GPT.md` §3 tabla + §4.12 + fase 2
- `index.html`, `sitemap.xml`, `llms.txt`, `manual-tecnico-catalog.js`
- `analisis-agua-ras-sar.html` (enlace al capítulo)

---

## 2026-05-22 — v2026.05.3c (Pilar C completo — 6 análisis)

### Publicado

- `analisis-solucion-nutritiva-lab.html` — `solucionNutritivaAnalyses[]`, meq↔ppm, SN_REF, diff vs ideal
- `analisis-extracto-pasta.html` — `extractoPastaAnalyses[]`, rizósfera vs licor

### Actualizado

- `index.html` (18 capítulos; Pilar C completo)
- `sitemap.xml`, `llms.txt`, `manual-tecnico-catalog.js`, `MANUAL-TECNICO-CONOCIMIENTO-GPT.md`

---

## 2026-05-22 — v2026.05.3b (Catálogo LinkedIn empresa)

### Knowledge / manual

- `PUBLICACIONES-REDES-CONOCIMIENTO-GPT.md` — **§8:** 24 posts NutriPlant PRO (URLs urn:li:activity:*), IDs `li_*`, mapa capítulo, §8b instrucciones Socio
- `publicaciones-redes-sociales.html` — tabla destacados + enlace al catálogo completo
- `CHATGPT-SOCIO-PAQUETE-ACTUALIZACION.md` — §8 ya poblado

Temas registrados: P-Zn, cierre estomático, NDVI, VPD, N mineralizable, meq→kg, movilidad nutriente suelo, aportes iónicos/CE, IS, compatibilidad, solubilidad, mol→meq, CIC, % fertilizantes, agua, DOP, Mn, agua disponible, rizosfera, apoplasto, yeso/Na, qué es meq, fijación P, microelementos.

---

## 2026-05-21 — v2026.05.3 (Pilar G redes + Knowledge Socio)

### Publicado

- `publicaciones-redes-sociales.html` — Pilar G: canales, tono, mapa capítulo→post

### Knowledge GPT Socio (listo para subir cuando Jesús quiera)

- `MANUAL-TECNICO-CONOCIMIENTO-GPT.md` — reescrito v2026.05.2 (15 técnicos + redes + tabla índice)
- `PUBLICACIONES-REDES-CONOCIMIENTO-GPT.md` — nuevo; §8 catálogo LinkedIn
- `CHATGPT-SOCIO-INSTRUCCIONES-COMPLETAS.md` — quinta fuente redes
- `CHATGPT-SOCIO-PAQUETE-ACTUALIZACION.md` — 4 archivos Knowledge

---

## 2026-05-21 — v2026.05.2 (MVP plan + inicio fase 2)

### Publicado

- `extraccion-nutrimental-por-etapa.html`
- `hidroponia-solucion-por-etapa.html`
- `analisis-agua-ras-sar.html`
- `analisis-fruta-icc.html`
- `granular-mezclas.html`

### Actualizado

- `index.html` — 15 capítulos + bloque «Próximamente» fase 2
- `llms.txt`, `sitemap.xml`, `manual-tecnico-catalog.js`

### Pendiente GPT Socio

- No subir Knowledge hasta cerrar más capítulos de fase 2 (usuario).

---

## 2026-05-21 — v2026.05.1 (MVP completo — 10 capítulos)

### Publicado

- `unidades-ppm-meq-oxidos.html` — Unidades ppm, meq/L y óxidos
- `programa-fertirriego-etapas.html` — Programa de fertirriego por etapas
- `fertirriego-graficas-ionicas.html` — Gráficas iónicas en fertirriego
- `diseno-solucion-nutritiva-didactica.html` — Diseño didáctico solución nutritiva
- `vpd-deficit-presion-vapor.html` — VPD
- `analisis-foliar-dop.html` — Análisis foliar DOP
- `faq-porcentajes-no-suman-100.html` — FAQ % iónicos

### Actualizado

- `index.html` — Los 10 capítulos en «Disponible», agrupados por pilares
- `llms.txt`, `sitemap.xml` — URLs nuevas
- `manual-tecnico-catalog.js` — Catálogo API Socio (7 capítulos + upcoming fase 2)
- `docs/MANUAL-TECNICO-CONOCIMIENTO-GPT.md` — Knowledge §3.1b–3.9

---

## 2026-05-21 — v2026.05 (MVP web)

### Publicado en `/manual-tecnico/`

- `index.html` — Portada e índice por pilares
- `assets/manual.css` — Estilos públicos
- `llms.txt` — Guía para crawlers e IA
- `capitulos/analisis-suelo-fertilidad-kgha.html` — Fertilidad del suelo, ideales y kg/ha
- `capitulos/porcentaje-meq-aniones-cationes.html` — % meq y triángulos iónicos
- `capitulos/enmiendas-balance-cic.html` — Balance de enmiendas por CIC

### Integración sitio

- **Login:** botón en header, banner público antes de herramientas gratis, pie de página y modal «Sobre nosotros»
- **Dashboard:** header + footer + modal «Sobre nosotros»
- **Raíz:** `index.html` (entrada login + manual), `robots.txt`, `sitemap.xml`, `llms.txt`
- **Legal:** enlaces en políticas y términos
- **Netlify:** redirect `/manual-tecnico` → `/manual-tecnico/`

### Planificación previa

- Creado plan maestro (`MANUAL-TECNICO-NUTRIPLANT-PLAN.md`): pilares A–H, plantilla, MVP 12 capítulos, fases 1–3.

---

<!-- Formato para entradas futuras:

## YYYY-MM-DD — v2026.XX

### Publicado
- `slug` — Título del capítulo

### Actualizado
- `slug` — Qué cambió y por qué (ej. alineación con dashboard)

-->
