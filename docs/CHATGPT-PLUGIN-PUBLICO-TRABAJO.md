# NutriPlant PRO en ChatGPT — definición de producto (barra plataforma)

Fuente de verdad. **No es el Socio.**  
Puerta: `https://nutriplantpro.com/mcp`  
Skill: `CHATGPT-PLUGIN-PUBLICO-SKILL.md`  
Catálogos vivos: `free-tools-catalog.js` · `manual-tecnico-catalog.js`

Última síntesis: 2026-09-16 — **ambición = altura de la plataforma entera, no un plugin recortado**

---

## 1. Ambición (no quedarnos cortos)

NutriPlant PRO no es “unas calculadoras”. Es un sistema de **nutrición vegetal de nivel élite**: labs, enmiendas, extracción, granular, fertirriego, hidro/solución, VPD, clima/riego, uniformidad, interacciones, agua, etc. — con manual técnico público que documenta el mismo criterio.

El plugin en ChatGPT **no puede ser una versión pedorra** de eso.  
La barra es: **al poner `@NutriPlant PRO`, el chat opera al nivel de la plataforma** (método + cálculos +, si conecta, su expediente). ChatGPT aporta cerebro amplio; NutriPlant aporta el tuétano completo para **que no se pierda**.

Si en implementación solo dejamos VPD + meq + un resumen de proyecto, **fracasamos** respecto a lo que ya existe en NutriPlant. Este documento fija la meta alta; el código se construye por oleadas **hacia esa meta**, no como techo.

---

## 2. Qué es el producto

`@NutriPlant PRO` = puente:

| Capa | Rol |
|------|-----|
| ChatGPT | Razona, habla, conocimiento amplio |
| Manual técnico (web) | Contexto y flujo (capítulos vía tools) |
| Herramientas gratis + motores PRO | Cifras = misma física que la web |
| Cuenta conectada (opcional) | Consulta solo lectura de **toda su** nube |

**Plus del `@`:** contexto amplio de plataforma + manos de cálculo → ChatGPT no baja a principiante ni improvisa el tanque.

También es **apoyo de uso**: con o sin cuenta, puede explicar el **flujo de la plataforma**, cómo usar cada módulo y cada **herramienta gratuita** (capítulo + link a la tool). Guía, no solo cálculo.

---

## 3. Superficie completa (techo del producto)

### 3.1 Dashboard PRO (expediente — modo con cuenta)

Todo lo que el suscriptor ve en un proyecto, en consulta:

| Módulo | El chat debe poder… |
|--------|----------------------|
| Ubicación | Cultivo, área, punto/polígono |
| Análisis suelo | Reportes + cifras; criterio kg/ha |
| Agua | Reportes + RAS/SAR / uso en ferti-hidro |
| Foliar | Reportes + DOP / criterio foliar |
| Pasta / fruta / solución lab | Reportes + criterio de cada tipo |
| Enmiendas | Balance CIC guardado |
| Extracción / requerimiento | Curva/demanda si existe |
| Granular | Programa guardado (aportes, etapas) |
| Fertirriego | Programa (meq, %, sales, etapas) |
| Hidro / solución / ciclo | Etapas, equilibrio, sales, cycle program |
| VPD / clima | Lecturas y contexto del predio |
| Estado del flujo | Qué tiene / qué falta / siguiente paso NutriPlant |

Muro: solo `user_id` del JWT. Solo lectura en esta generación. Escritura en chat = fase posterior.

### 3.2 Herramientas gratis (cálculo — sin cuenta y con cuenta)

Techo de cálculo = **catálogo completo** (`free-tools-catalog`), misma lógica que la web. Incluye, sin recortar:

- Conversores (óxido/elemental, ppm/mmol/meq, magnitudes)  
- Solución nutritiva (triángulos, CE→meq, aportes)  
- Pulso riego hidro · Agua dureza/ácidos  
- VPD (también punto→clima) · Pronóstico agroclimático  
- Ventanas foliar · Enmienda CIC · Granular mix · Composición fertilizantes  
- Extracción por etapa · Tabla periódica · Atlas aminoácidos  
- Compatibilidad · Interacciones Mulder · N mineralizable · Agua textura  
- Lámina / balance hídrico · ISH · Uniformidad riego · Solubilidad/IS · Huella carbono  

**Regla:** si la free tool lo calcula, el plugin debe poder devolverlo en el chat (o link + explicación hasta existir la tool). **Prohibido inventar** fuera de plataforma.

Inputs de mapa/satélite: coords/lugar o datos a mano, o link a la calculadora (ChatGPT no lee GPS solo).

### 3.3 Manual técnico (contexto — para no perderse)

Todos los capítulos del catálogo manual (flujo, labs, % meq, ferti, hidro, granular, VPD, ISH, foliar, riego, Mulder, etc.).  
Pregunta de método → `lookup_chapter` / catálogo → razonar encima → citar URL.  
Flujo canónico: **dato → interpretación → ajuste → programa → seguimiento**.

---

## 4. Modo sin cuenta — cerrado (barra alta)

Consultor élite NutriPlant + **toda** la superficie 3.2 y 3.3.  
Sin expediente nube. Respuesta: criterio + cifra (tool) + capítulo + link herramienta visual.  
No fabrica “su rancho”.

---

## 5. Modo con cuenta — cerrado (barra alta)

Todo lo del sin cuenta **más** superficie 3.1 completa (consulta).  
Conectar = misma cuenta web. Escenario estándar: “lote X, ¿dónde estoy en el flujo?” → tiene/falta → criterio → cifra → links.

Hoy: OAuth + resumen. Meta: **paridad de lectura** con el dashboard (tabla 3.1), no un vistazo pobre.

---

## 6. Cómo se construye sin quedarnos cortos

No “parches pedorros”. Oleadas que **cubren la plataforma**:

| Oleada | Entrega (debe sentirse NutriPlant) |
|--------|-------------------------------------|
| **0 (hoy base)** | Capítulos + unidades + VPD T/HR + meq→sal + resumen proyecto — *piso* |
| **1** | Contexto duro: skill + `PUBLIC_INSTRUCTIONS` + `lookup_free_tool` + URLs en catálogo + flujo en list_catalog | **Hecho en repo** (2026-09-16) |
| **2** | Free tools prioritarias en `/mcp` (cálculo real): triángulos meq, VPD punto, uniformidad, foliar window, ISH, óxido↔elemental, CIC/enmienda, dureza/ácido, lámina/balance, mezcla granular | **Hecha en repo** (2026-09-16) |
| **3** | Resto del catálogo free tools (fórmula composición, Mulder, N mineralizable, solubilidad/IS, pulso hidro, pronóstico, magnitudes, extracción etapa, agua suelo, compatibilidad, huella carbono) | **Hecha en repo** (2026-09-16) |
| **4** | Lectura cuenta profunda + **flow_status / siguiente paso** | **Hecha en repo** (2026-09-16): labs 6 tipos con cifras, enmiendas CIC, ferti/hidro/cycleProgram/granular, VPD, clima, extracción; `section`/`stage_index` |
| **5** | Cruces (foliar↔VPD↔programa), deep links a UI | **Hecha en repo** (2026-09-16): `interpret_project_cross`, `project_deep_links`, `cross_manual_signals`; `get_my_project` + `deep_links`/`cross`; dashboard `?np_project=&np_section=` |
| **6** | Probar · pegar skill · directorio OpenAI | **Paquete listo** — `docs/CHATGPT-PLUGIN-PUBLICO-OLEADA-6.md` (deploy + smoke + skill + Plugins Directory). Cierre manual: pegar skill, E/F en ChatGPT, Verify Domain, submit portal |

Cada oleada se mide contra las tablas 3.1–3.3: ¿seguimos cortos respecto a la plataforma? Si sí, no celebrar.

---

## 7. Skill y servidor

- Skill repo: ancla de no perderse + manual + free tools + modos.  
- Servidor: `PUBLIC_INSTRUCTIONS` deben subir al mismo nivel (hoy están cortas).  
- Re-pegar en ChatGPT: cuando arranque oleada 1–2 en código.

---

## 8. Límites fijos

Público ≠ Socio · solo su JWT en cuenta · solo lectura cuenta hasta oleada posterior · no inventar fuera de NutriPlant · decide el agrónomo · skill orienta, no mata el cerebro de ChatGPT.

### Privado — NO entra al plugin público (nunca “libre”)

Queda **fuera** de `@NutriPlant PRO` / `/mcp` público:

- Panel **admin** y cualquier URL/herramienta de administración  
- **GPT Socio** / `admin-assistant` / token admin  
- **Plan PRO** (cerebro digital / notebook privado)  
- **Nutri PRO** (archivos/conocimiento privado del admin o módulos no públicos)  
- **Invest PRO** u otros módulos solo-admin  
- **AirCI** (AirCL / Crop Intelligence — `admin/airci.html` y lo asociado; privado)  
- Roster de usuarios, pagos, datos de otros clientes  

El plugin público solo: manual técnico público + herramientas gratis + (si conecta) **su** cuenta de suscriptor en el dashboard de nutrición/clima del proyecto. Nada de backoffice ni productos privados.

---

## 9. Estado

| Bloque | Estado |
|--------|--------|
| Ambición = plataforma completa | **Fijada** |
| Modo sin cuenta / con cuenta | **Cerrados** en definición |
| Oleada 1 (contexto + lookup free tool + instructions) | **Hecha en repo** — falta deploy + re-pegar skill |
| Oleada 2 (cálculos free prioritarios) | **Hecha en repo** — falta deploy + re-pegar skill |
| Oleada 3 (resto free tools) | **Hecha en repo** — falta deploy + re-pegar skill |
| Oleada 4 (lectura cuenta profunda) | **Hecha en repo** — falta deploy + re-pegar skill |
| Oleada 5 (cruces + deep links) | **Hecha en repo** — va en el mismo deploy que oleada 6 |
| Oleada 6 (probar · skill · directorio) | **Paquete en repo** — seguir `CHATGPT-PLUGIN-PUBLICO-OLEADA-6.md`; checklist ChatGPT/portal es manual |

Documento listo para construir un plugin **a la altura de NutriPlant**, no un accesorio.
