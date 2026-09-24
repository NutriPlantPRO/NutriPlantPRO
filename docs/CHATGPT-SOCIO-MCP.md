# Socio Admin — MCP y complemento ChatGPT

Mapa vivo (2026-09-24). **Léete esto** antes de tocar el Socio en ChatGPT o Codex.

Solo la cuenta personal de Jesús. Privado. No se publica en el directorio OpenAI.

---

## Con qué nos quedamos (3)

| En ChatGPT | Qué es | Qué hacer |
|---|---|---|
| **Nutriplant Socio Admin** (icono **N** azul) | El Socio de todos los días. Skill + foto. ZIP en repo. | **Este se usa.** `@Nutriplant Socio Admin` |
| **NutriPlant App Private** | La manguera: MCP `/mcp-admin`. Login = PIN de 4 dígitos del admin. | **No se abre. No se desinstala.** |
| **NutriPlant PRO** | Plugin público (`/mcp`). Aún no liberado en OpenAI. | **No se toca.** Otro producto. |

Todo lo demás sobra:

- Complemento **Asistente AI** (cuadrito rojo) = GPT migrado. Ya no se ocupa. Si reaparece con **+**, no lo instales.
- **GPT** Nutriplant Socio Admin (Fijados) = muerto el 11 dic 2026. No se usa, no se actualiza.
- **Codex** `@Nutriplant Socio Admin` = otro Socio, solo Work/Codex. No se mezcla. Cupo aparte.

---

## Puerta (sin llave nueva en Netlify)

- MCP: `https://nutriplantpro.com/mcp-admin`
- API vieja (sigue viva): `https://nutriplantpro.com/api/admin-assistant`
- Tool única: `nutriplantAdminQuery` → `{ "action":"…", "params":{…} }` **v2.15.0**
- Auth: mismo `NUTRIPLANT_ADMIN_GPT_TOKEN`. Login ChatGPT: **PIN admin** (4 dígitos) o ese token.
- **No** es `https://nutriplantpro.com/mcp` (público).

Login OAuth: `/mcp-admin/oauth/*`. Well-known: `/.well-known/oauth-*-/mcp-admin` (antes que los del público).

---

## Cómo se usa

ChatGPT **normal** (pestaña **Chat**, no Work):

1. `@Nutriplant Socio Admin` (el de la N).
2. «consulta describe_api» → **2.15.0**
3. «¿cuántos activos en 30 días?» / roster de pagos.

Si no trae cifras: también `@` **NutriPlant App Private**. App Private se queda instalada aunque no se mencione.

iPhone: Complementos → Personales → el de la N. Developer/MCP a veces no sale igual que en web.

---

## Cómo actualizamos (no perder el hilo)

### Manuales, API, catálogos, datos reales

Código en este repo → deploy Netlify. El Socio lo lee solo por `/mcp-admin`. **Jesús no sube nada en ChatGPT.**

Instructions de referencia: `docs/CHATGPT-SOCIO-INSTRUCCIONES-COMPLETAS.md` (bloque INICIO–FIN). Knowledge largo: los 7 md del paquete (`CHATGPT-SOCIO-PAQUETE-ACTUALIZACION.md`).

### Tono / reglas del complemento (skill + icono)

Vive en el ZIP, no en el GPT.

1. Editar `chatgpt-plugins/nutriplant-socio-admin/` (`plugin.json`, `skills/…/SKILL.md`, `assets/logo.png` + `icon.png`).
2. Zip **con `plugin.json` en la raíz** (no una carpeta padre).
3. ChatGPT → `https://chatgpt.com/plugins?directoryTab=personal` → **Añadir** → **Subir archivo comprimido** (no «Crear complemento», no Plugin Creator / Codex).
4. Instalar el de la **N**. Probar activos 30 días.

Icono: la ficha «Gestionar» de un GPT migrado **no** deja foto. Va en el ZIP (`interface.logo` + `composerIcon`). PNG cuadrado; el de marca es `assets/pwa-icon-512.png`.

### Codex (aparte)

Cuando haya cupo Work: el `@` de Codex se actualiza **allá**. No uses Plugin Creator para el Socio del teléfono si Codex está tapado.

---

## Smoke

```bash
curl -sS 'https://nutriplantpro.com/mcp-admin'
# ok: true, socio: true, public_plugin: false

curl -sS -X POST 'https://nutriplantpro.com/mcp-admin' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $NUTRIPLANT_ADMIN_GPT_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"nutriplantAdminQuery","arguments":{"action":"describe_api","params":{}}}}'
# version 2.15.0
```

---

## Archivos en repo

| Ruta | Rol |
|---|---|
| `netlify/functions/nutriplant-admin-mcp.js` | Handler `/mcp-admin` |
| `netlify/functions/lib/admin-mcp-auth.js` | Bearer + OAuth PIN/token |
| `netlify/functions/lib/admin-mcp-tools.js` | Tool `nutriplantAdminQuery` → `runAdminAction` |
| `netlify/functions/nutriplant-admin-assistant.js` | Misma API; `describe_api` trae `mcp.url` |
| `chatgpt-plugins/nutriplant-socio-admin/` | Paquete ZIP (skill + N) |
| `docs/CHATGPT-SOCIO-INSTRUCCIONES-COMPLETAS.md` | Instructions canónicas |
| `docs/CHATGPT-SOCIO-PAQUETE-ACTUALIZACION.md` | Knowledge / checklist |

Público (no mezclar): `docs/CHATGPT-PLUGIN-PUBLICO.md` · `/mcp`.
