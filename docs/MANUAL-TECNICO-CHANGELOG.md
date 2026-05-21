# Manual Técnico NutriPlant PRO — Changelog

Registro de capítulos publicados y cambios relevantes.  
Plan maestro: `MANUAL-TECNICO-NUTRIPLANT-PLAN.md`

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
