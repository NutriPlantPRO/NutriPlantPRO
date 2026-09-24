# Plugin público NutriPlant PRO (ChatGPT)

Producto acordado. **No es el GPT Socio.** El Socio vive en `/api/admin-assistant` y, para el complemento ChatGPT, en `/mcp-admin` (`docs/CHATGPT-SOCIO-MCP.md`). El token admin no se usa aquí.

**Documento de producto (definición viva):** [`CHATGPT-PLUGIN-PUBLICO-TRABAJO.md`](./CHATGPT-PLUGIN-PUBLICO-TRABAJO.md)

## Qué es

**NutriPlant PRO** en ChatGPT: puente entre el cerebro amplio de ChatGPT y el **tuétano** de la plataforma (método, cálculos, y —si conecta— consulta de **su** cuenta). El `@` sube el piso sin un prompt enorme. No es el Socio.

| | Plugin público | Socio (privado) |
|---|---|---|
| Quién | Cualquiera en ChatGPT | Solo Jesús |
| Puerta | `https://nutriplantpro.com/mcp` | `/mcp-admin` + `/api/admin-assistant` |
| Secreto | Ninguno (login del usuario, opcional) | `NUTRIPLANT_ADMIN_GPT_TOKEN` |
| Datos | Manual + fórmulas; si hay sesión, **sus** lotes | Todos los clientes, pagos, admin |

## Cerebro vs tools

- **Skill** (`docs/CHATGPT-PLUGIN-PUBLICO-SKILL.md`): piso técnico alto desde el mensaje 1. No “empieza principiante”.
- **Tools:** calculan y citan URL. Crecen por oleadas. El cerebro ya nace completo.

## Oleadas (repo)

Oleadas 1–5 en código. **Oleada 6 (sacar a prod):** [`CHATGPT-PLUGIN-PUBLICO-OLEADA-6.md`](./CHATGPT-PLUGIN-PUBLICO-OLEADA-6.md) — deploy, smoke `/mcp`, pegar skill, pruebas, Plugins Directory OpenAI.

Skill: `docs/CHATGPT-PLUGIN-PUBLICO-SKILL.md`.

## Variable OAuth (opcional)

No hace falta una variable nueva en Netlify (el paquete de env ya está al tope de 4 KB de Lambda).

El plugin firma el login con un derivado de un secreto **que ya existe** (`AGROCLIMATE_TOKEN_SECRET`, o si no `AGROCLIMATE_CRON_SECRET` / `ADMIN_ACCESS_PIN`). No usa el token del Socio.

Si más adelante hay hueco en las variables, se puede poner `NUTRIPLANT_PUBLIC_MCP_OAUTH_SECRET` y esa gana. No es obligatorio.
