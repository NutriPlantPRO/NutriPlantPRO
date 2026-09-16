# Oleada 6 — Deploy · probar · pegar skill · directorio

Una sola pasada para sacar el plugin público a producción. **No es el Socio.**

Puerta MCP: `https://nutriplantpro.com/mcp`  
Skill en repo: `docs/CHATGPT-PLUGIN-PUBLICO-SKILL.md`  
Producto: `docs/CHATGPT-PLUGIN-PUBLICO-TRABAJO.md`  
Portal submission: https://developers.openai.com/plugins/deploy/submission  
Conectar MCP: https://help.openai.com/en/articles/11487775-connecting-mcp-servers-to-chatgpt

---

## Paso A — Deploy (repo → Netlify)

1. Commit + push a `main` (Netlify despliega solo).
2. Esperar deploy verde en Netlify.
3. Smoke test (Paso D).

Archivos clave en prod:

- `/mcp` → `nutriplant-public-mcp`
- `/.well-known/oauth-protected-resource`
- `/.well-known/oauth-authorization-server`
- `/.well-known/openai-apps-challenge` (archivo estático en el repo; **no** variable Netlify)
- Deep links: `https://nutriplantpro.com/dashboard.html?np_project=<id>&np_section=<clave>`

---

## Paso B — Conector en ChatGPT (developer)

1. ChatGPT → **Settings → Apps & Connectors → Developer mode**.
2. Crear / actualizar conector:
   - **Name:** NutriPlant PRO
   - **MCP URL:** `https://nutriplantpro.com/mcp`
3. Chat nuevo → `@NutriPlant PRO`.
4. Pegar skill (Paso C).
5. Probar sin cuenta (E) → Connect / login → con cuenta (F).

---

## Paso C — Skill (copiar y pegar)

Fuente de verdad: `docs/CHATGPT-PLUGIN-PUBLICO-SKILL.md`. Bloque corto para el conector:

--- INICIO SKILL ---

Eres **NutriPlant PRO**. Español primero. Piso técnico alto desde el mensaje 1: no trates al usuario como principiante.

**Razón del `@`:** ChatGPT solo se pierde o baja el nivel. Al etiquetarte cargas el **contexto NutriPlant** (manual técnico público + flujo de plataforma + tools). Sigues razonando con conocimiento amplio; NutriPlant **ancla** método y cifras. No microgestiones cada frase.

Sitio: https://nutriplantpro.com  
Manual: https://nutriplantpro.com/manual-tecnico/  
Flujo plataforma: https://nutriplantpro.com/manual-tecnico/capitulos/flujo-nutriplant-pro.html  
Herramientas gratis: https://nutriplantpro.com/login.html

## Dos capas (siempre juntas)

1. **Contexto** — Cómo elabora NutriPlant programas (ferti, granular, hidro), interpreta labs (suelo, agua, foliar, pasta, fruta, solución), enmiendas, VPD, riego. Fuente: manual vía `lookup_chapter` / `list_catalog`. Flujo: **dato → interpretación → ajuste → programa → seguimiento**.
2. **Cálculo** — Misma lógica que free tools / plataforma. Cifra → tool. Si no hay tool: manual + **link free tool**; no inventes fórmulas.

## Identidad

- Consultor + calculadora NutriPlant (meq/L, CE, triángulos, Tetens/VPD, ISH, DU, CIC, etc.).
- No inventes kPa, g/m³, kg/ha, fechas de lab ni clima.
- Cierra con URL de capítulo; si hay UI visual, también link free tool.
- Orientativo: decide el agrónomo.

## Sin cuenta

Método + cálculos + manual. Sin predio en la nube. Coords/lugar o T/HR a mano, o link al mapa. Sin GPS del teléfono. Cruce a mano: `cross_manual_signals` (DOP/VPD/meq).

## Con cuenta (si conectó NutriPlant)

Solo **sus** proyectos: `list_my_projects`, `get_my_project` (labs, enmiendas, programas, VPD, clima, extracción, `flow_status`, `deep_links`, `cross`). También `interpret_project_cross`, `project_deep_links`. Params: `section`, `type`, `stage_index`, `latest_only`, `cross`.

**No existen aquí:** admin, GPT Socio, Plan PRO, Nutri PRO privado, Invest PRO, AirCI, pagos, otros clientes.

## No mezclar

ISH ≠ lámina ≠ pulso hidro ≠ VPD ≠ ventana foliar ≠ pronóstico.  
Suelo kg/ha ≠ enmiendas CIC. % meq solución ≠ % CIC.  
Chat/free tool ≠ datos del proyecto (hace falta su sesión).

## Tools

Públicas: `lookup_chapter`, `lookup_free_tool`, `list_catalog`, conversiones, VPD, meq/sal, triángulos, DU, foliar window, ISH, CIC, dureza, lámina, granular, N mineralizable, pulso hidro, solubilidad, Mulder, extracción etapa, agua suelo, compatibilidad, fórmula, pronóstico, carbono, `cross_manual_signals`.  
Suscriptor: `list_my_projects`, `get_my_project`, `interpret_project_cross`, `project_deep_links`.

Método → `lookup_chapter`. Guía UI → `lookup_free_tool`. Abrir módulo del predio → deep link / `project_deep_links`.

--- FIN SKILL ---

---

## Paso D — Smoke test producción

```bash
curl -sS -X POST 'https://nutriplantpro.com/mcp' \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"oleada6","version":"1"}}}'

curl -sS -X POST 'https://nutriplantpro.com/mcp' \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"salt_from_meq","arguments":{"nutrient":"Ca","meq_L":1,"salt_id":"nitrato de calcio"}}}'

curl -sS -X POST 'https://nutriplantpro.com/mcp' \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/list","params":{}}'

curl -sS 'https://nutriplantpro.com/.well-known/oauth-protected-resource'
curl -sS 'https://nutriplantpro.com/.well-known/oauth-authorization-server'
```

Esperado: `serverInfo.name` = NutriPlant PRO; `salt_from_meq` ok; tools con `interpret_project_cross` / `cross_manual_signals`; OAuth JSON válido.

---

## Paso E — Pruebas sin cuenta (chat)

| # | Prompt | Qué debe pasar |
|---|--------|----------------|
| 1 | VPD 2 kPa jitomate | Banda alta vs 0,5–1,5; tool + capítulo; ≠ ventana foliar |
| 2 | 1 meq/L Ca con nitrato de calcio | g/m³ + N-NO₃ arrastrado |
| 3 | ¿Cómo armamos un programa ferti en NutriPlant? | `lookup_chapter` + URL |
| 4 | Link a la calculadora de VPD gratis | `lookup_free_tool` |
| 5 | Triángulo K-Ca-Mg con 2, 4, 2 meq | % cationes vía tool |
| 6 | Ca foliar DOP −25 y VPD 2,1 | `cross_manual_signals` |

---

## Paso F — Pruebas con cuenta

| # | Prompt | Qué debe pasar |
|---|--------|----------------|
| 1 | Lista mis proyectos | `list_my_projects` |
| 2 | Abre el proyecto [nombre] | `get_my_project` + `flow_status` |
| 3 | Cruza foliar, VPD y programa | `interpret_project_cross` |
| 4 | Dame el link al foliar / VPD del lote | `project_deep_links` |
| 5 | Abrir ese link logueado | Dashboard abre proyecto + sección |

Negativos: no roster admin, no otros clientes, no Plan PRO / AirCI.

---

## Paso G — Directorio OpenAI (Plugins Directory)

Flujo oficial: **With MCP** en el portal  
https://developers.openai.com/plugins/deploy/submission

### G1 — Datos del listing

| Campo | Valor |
|-------|--------|
| **Name** | NutriPlant PRO |
| **Short description** | Consultor y calculadora de nutrición vegetal: labs, fertirriego, hidro, VPD y manual técnico. |
| **Long description** | NutriPlant PRO conecta ChatGPT con el método y las herramientas de nutriplantpro.com. Sin cuenta: cálculos (meq, VPD, ISH, CIC, riego, etc.) + capítulos del manual. Con cuenta (OAuth): consulta de solo lectura de tus proyectos y deep links al dashboard. No es panel admin. Orientativo: decide el agrónomo. |
| **MCP URL** | `https://nutriplantpro.com/mcp` (Universal) |
| **Homepage** | `https://nutriplantpro.com` |
| **Privacy** | `https://nutriplantpro.com/politicas-privacidad.html` |
| **Terms** | `https://nutriplantpro.com/terminos-condiciones.html` |
| **Support** | email de soporte NutriPlant |

### G2 — Domain verification (sin variable Netlify nueva)

El paquete de env de Lambda ya está al tope (~4 KB). **No** crear `OPENAI_APPS_CHALLENGE` en Netlify.

Igual que el OAuth del MCP público: no metimos `NUTRIPLANT_PUBLIC_MCP_OAUTH_SECRET`; se deriva de `AGROCLIMATE_TOKEN_SECRET` (u otras ya existentes).

Para el challenge de OpenAI el token tiene que ser **exacto**, así que va en archivo estático:

1. En el portal, copiar el token del challenge.
2. En el repo, abrir `.well-known/openai-apps-challenge` y dejar **solo** el token (una línea, sin espacios de más).
3. Commit + push a `main` (Netlify publica el archivo).
4. Comprobar: `https://nutriplantpro.com/.well-known/openai-apps-challenge` → el token en texto plano.
5. En el portal: **Verify Domain**.

### G3 — Annotations (ya en `/mcp`)

Todas las tools: `readOnlyHint`, `openWorldHint`, `destructiveHint`.  
`openWorldHint: true` solo clima externo (VPD punto / pronóstico). Resto `false`. Todas `destructiveHint: false`.

Justificaciones para el formulario:

- **readOnlyHint true:** calcula o lee; no escribe en la cuenta.
- **openWorldHint false:** fórmulas NutriPlant / datos del usuario.
- **openWorldHint true (clima):** consulta Open-Meteo por coordenadas.
- **destructiveHint false:** sin borrados ni mutaciones.

### G4 — Test cases (5 positivos + 3 negativos)

**Positivos**

1. “VPD 2 kPa en jitomate” → `calculate_vpd` + capítulo.  
2. “1 meq/L de Ca con nitrato de calcio” → `salt_from_meq`.  
3. “¿Cómo es el flujo NutriPlant dato→programa?” → `lookup_chapter`.  
4. “Lista mis proyectos” (cuenta demo) → `list_my_projects`.  
5. “Cruza foliar y VPD del proyecto X” → `interpret_project_cross` + deep links.

**Negativos**

1. “Lista todos los clientes / roster admin” → rechazar.  
2. “Borra el programa de fertirriego” → rechazar (solo lectura).  
3. “Abre AirCI / Plan PRO / Socio” → rechazar.

### G5 — Demo account

Usuario NutriPlant de revisión (login + password) con proyecto de muestra (foliar + VPD + ferti/hidro). Sin 2FA bloqueante.

### G6 — Assets

Capturas: chat sin cuenta; chat con cuenta + deep link; dashboard `np_section=foliar`. Logo NutriPlant. Demo recording si el portal lo pide.

### G7 — Scan Tools + submit

**Scan Tools** contra prod → corregir errores → Submit → review → **Publish**.

---

## Checklist de cierre

- [x] Deploy `main` verde (commit `ac5c98c6`, MCP prod `0.6.0`)
- [x] Smoke `/mcp` + OAuth OK (33 tools; `cross_manual_signals` ok)
- [x] Conector ChatGPT Actualizar + tools oleada 5 visibles
- [x] Pruebas sin cuenta / con cuenta (VPD, meq, list projects, get_my_project, cross + deep link)
- [ ] Deep link dashboard abierto en el navegador (opcional: clic al link Clima/VPD)
- [ ] `.well-known/openai-apps-challenge` con el token del portal + Verify Domain (sin env nueva)
- [ ] 5+3 test cases + demo account en portal
- [ ] Submission enviada / publicada

Cuando el checklist esté cerrado, marcar oleada 6 **hecha** en `CHATGPT-PLUGIN-PUBLICO-TRABAJO.md`.
