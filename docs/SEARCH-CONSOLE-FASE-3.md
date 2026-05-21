# Google Search Console — Fase 3 (socio)

Pasos **solo en el navegador** (no están en el código). Hazlo después del deploy con JSON-LD y `llms.txt` actualizados.

## 1. Entrar

1. Abre https://search.google.com/search-console
2. Inicia sesión con la cuenta Google de NutriPlant (la que uses para el negocio).

## 2. Añadir la propiedad

1. **Añadir propiedad** → **Prefijo de URL**
2. URL: `https://nutriplantpro.com`
3. Verificar dominio (elige un método):
   - **Etiqueta HTML** en `index.html` o `login.html` (Netlify → deploy), o
   - **Registro DNS** en tu proveedor de dominio (recomendado si ya usas Netlify DNS).

## 3. Enviar el sitemap

1. Menú izquierdo → **Sitemaps**
2. Añadir: `sitemap.xml`
3. URL completa: `https://nutriplantpro.com/sitemap.xml`
4. Enviar.

## 4. Revisar en 3–7 días

- **Páginas** → cuántas URLs del manual están indexadas.
- **Rendimiento** → impresiones en búsquedas (kg/ha suelo, % meq, fertirriego, VPD…).
- **Experiencia** → errores de rastreo (corregir si aparece 404).

## 5. Solicitar indexación (opcional, acelera)

En **Inspección de URLs**, pega una URL importante, por ejemplo:

- `https://nutriplantpro.com/manual-tecnico/index.html`
- `https://nutriplantpro.com/manual-tecnico/capitulos/analisis-suelo-fertilidad-kgha.html`
- `https://nutriplantpro.com/manual-tecnico/capitulos/faq-porcentajes-no-suman-100.html`

Pulsa **Solicitar indexación** en cada una.

## 6. Prueba trimestral (IA / GEO)

Pregunta en Google, Perplexity o ChatGPT con web:

1. ¿Cómo calcula NutriPlant los kg/ha de ajuste en análisis de suelo?
2. ¿Por qué los % meq no suman 100 en fertirriego?
3. ¿Qué es el triángulo N-P-S en solución nutritiva?

Si citan `nutriplantpro.com/manual-tecnico/...`, la fase 3 avanza.

---

**En el repo (ya hecho en código):** JSON-LD `Article` / `FAQPage`, `llms.txt` con 21 URLs, `sitemap.xml`, `robots.txt`.
