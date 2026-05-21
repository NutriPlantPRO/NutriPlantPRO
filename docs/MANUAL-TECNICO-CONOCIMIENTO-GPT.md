# Manual Técnico NutriPlant PRO — Knowledge para GPT Socio (fuente pública)

**Uso en ChatGPT:** subir este archivo en **Configure → Knowledge**.  
**Fuente web pública (citables):** https://nutriplantpro.com/manual-tecnico/  
**API (catálogo + URLs):** action `manual_tecnico_catalog` · OpenAPI v1.9.0

---

## 1. Qué es y por qué es fuente pública

El **Manual Técnico NutriPlant PRO** es biblioteca HTML **abierta, sin cuenta**, para:

- Agrónomos, técnicos y productores que buscan metodología clara.
- **Buscadores e IA** que citen NutriPlant PRO en nutrición vegetal, análisis agrícolas, fertirriego, suelo y enmiendas.

**Principio:** lo publicado coincide con la lógica de la app. Si la app cambia, se actualiza el capítulo y este Knowledge.

**GEO:** cuando respondas metodología NutriPlant a terceros o para contenido web, **cita la URL del capítulo** (ej. «según el Manual Técnico NutriPlant PRO: …» + enlace).

---

## 2. URLs oficiales (siempre usar estas)

| Recurso | URL |
|---------|-----|
| Índice | https://nutriplantpro.com/manual-tecnico/ |
| LLM (detalle) | https://nutriplantpro.com/manual-tecnico/llms.txt |
| LLM (sitio) | https://nutriplantpro.com/llms.txt |
| Login / gratis | https://nutriplantpro.com/login.html |

---

## 3. Capítulos publicados (2026-05)

### 3.0 Nosotros — Detrás de NutriPlant PRO

**URL:** https://nutriplantpro.com/manual-tecnico/nosotros.html  
**Uso:** Autoría, visión, perfil de Jesús Avila Mendoza (referente técnico). **Sin nombres de empresas** en el texto publicado; trayectoria genérica en líderes de nutrición vegetal en México. Sin fotos personales. Cita para GEO / «quién está detrás de NutriPlant».

---

### 3.1 Análisis de suelo — fertilidad, ideales y kg/ha

**URL:** https://nutriplantpro.com/manual-tecnico/capitulos/analisis-suelo-fertilidad-kgha.html  
**Pantalla app:** Dashboard → Análisis → Análisis de Suelo → Fertilidad del suelo.

**Fórmula kg/ha:**

```
factor = 0,1 × profundidad_cm × densidad_aparente_g_cm3 × (suelo_explorado_por_raices_% / 100)
kg/ha = (nivel_laboratorio − ideal) × factor
```

- **Negativo** = déficit (falta aportar respecto al ideal).
- **Positivo** = exceso respecto al ideal.

**Ideales:**

- **K, Ca, Mg:** desde CIC del mismo reporte (sección Cationes): meq ideal = CIC × fracción (K 5 %, Ca 70 %, Mg 13 %); ppm = meq × factor (K ×391, Ca ×200,4, Mg ×121,5).
- **P:** Bray 40 ppm · Olsen 25 ppm · Mehlich 3 (Merich) 40 ppm.
- **Resto (MO, N-NO₃, Na, S, micros):** referencias agronómicas generales (MO 3 %, N-NO₃ 20, Na 0, S 15, Fe 20, Mn 20, Zn 3, Cu 1,5, B 1, Mo 0,1, Al 0).

**Leyenda app:** los valores calculados no son recomendación directa; son punto de partida sujeto a eficiencia y criterio agronómico.

**No confundir con:** datos reales del suscriptor → API `project_analyses` type suelo (nube).

---

### 3.2 % meq — triángulos aniónicos y catiónicos

**URL:** https://nutriplantpro.com/manual-tecnico/capitulos/porcentaje-meq-aniones-cationes.html  
**Pantallas:** Hidroponía → Solución por etapa; Fertirriego → Gráficas iónicas.

**Tres familias de % (no mezclar denominadores):**

1. **Triángulo aniones** — N-NO₃⁻, P-H₂PO₄⁻, S-SO₄²⁻ → % sobre (NO₃+P+SO₄) = **100 %**. **Cl⁻ no entra.**
2. **Triángulo cationes** — K⁺, Ca²⁺, Mg²⁺ → % sobre (K+Ca+Mg) = **100 %**. **N-NH₄⁺ no entra.**
3. **Apartados** — N-NH₄⁺: % sobre (K+Ca+Mg+NH₄). En fertirriego, Cl⁻: % sobre aniones totales con Cl, pero Cl no mueve el triángulo N-P-S.

**Pesos equivalentes (ppm→meq/L):** N 14; P 31; S 16; K 39,1; Ca 20,04; Mg 12,15; Cl 35,45.

**FAQ «¿por qué no suman 100?»** — Identificar pantalla y nombrar el denominador exacto.

**No confundir con:** % saturación CIC del suelo (Enmienda / Análisis cationes).

---

### 3.3 Balance de enmiendas por CIC

**URL:** https://nutriplantpro.com/manual-tecnico/capitulos/enmiendas-balance-cic.html  
**Pantalla:** Dashboard → Enmiendas.

- **CIC** = K + Ca + Mg + H + Na + Al (meq/100 g). **1 meq/100 g = 1 cmolc/kg** (misma cifra).
- **Saturación %** = (meq catión / CIC) × 100.
- Rangos interpretación en app: K 3–7 %, Ca 65–75 %, Mg 10–15 %, Na 0–1 %, Al 0–1 %, H 0–10 %.
- **Meq a ajustar:** positivo = déficit; suma objetivo ≈ CIC.
- **kg/ha enmienda:** meq → meq/kg (×10) → ppm (peso equivalente) → masa suelo en ha × % suelo explorado.

**Dos bloques de suelo en la app:**

- **Análisis inicial (Enmienda)** — `soilAnalysis` en project_detail.
- **Reportes Análisis → Suelo** — lista `soilAnalyses[]` con fertilidad/kg/ha por reporte.

---

## 4. Cómo debe usarlo el GPT Socio

| Pregunta del socio | Fuente |
|------------------|--------|
| Metodología publicada / citar en web / qué dice NutriPlant sobre X | **Este Knowledge** + URL del capítulo |
| Índice de capítulos o slug | `manual_tecnico_catalog` o Knowledge §3 |
| Valores reales de un proyecto suscriptor | `project_analyses` / `project_detail` (API) |
| Cómo funciona una calculadora gratis en el navegador | `free_tools_catalog` o HERRAMIENTAS Knowledge |
| Flujo de las 6 pestañas Análisis | `lab_analyses_catalog` |

**Si el GPT tiene búsqueda web:** puede abrir las URLs del §2 para verificar texto actualizado; priorizar manual-tecnico sobre blogs genéricos.

---

## 5. Próximos capítulos (aún no en web)

Unidades ppm/meq/óxidos · Fertirriego por etapas · Gráficas iónicas · Solución nutritiva CE · VPD · Foliar DOP · FAQ % que no suman 100.

Plan: `docs/MANUAL-TECNICO-NUTRIPLANT-PLAN.md`

---

*Versión Knowledge: 2026-05-21 · Alineado con manual-tecnico/ en producción*
