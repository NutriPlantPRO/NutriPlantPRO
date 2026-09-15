# Plugin público NutriPlant PRO (ChatGPT)

Producto acordado. **No es el GPT Socio.** El Socio (`/api/admin-assistant` + token admin) no se toca.

## Qué es

**NutriPlant PRO** en ChatGPT: criterio agronómico del [manual técnico](https://nutriplantpro.com/manual-tecnico/) + cálculos de las herramientas gratis. El usuario puede **conectar su cuenta de suscriptor** (mismo correo y contraseña de la web) y consultar **solo sus** proyectos.

| | Plugin público | Socio (privado) |
|---|---|---|
| Quién | Cualquiera en ChatGPT | Solo Jesús |
| Puerta | `https://nutriplantpro.com/mcp` | `/api/admin-assistant` |
| Secreto | Ninguno (login del usuario, opcional) | `NUTRIPLANT_ADMIN_GPT_TOKEN` |
| Datos | Manual + fórmulas; si hay sesión, **sus** lotes | Todos los clientes, pagos, admin |

## Cerebro vs tools

- **Skill** (`docs/CHATGPT-PLUGIN-PUBLICO-SKILL.md`): piso técnico alto desde el mensaje 1. No “empieza principiante”.
- **Tools:** calculan y citan URL. Crecen por oleadas. El cerebro ya nace completo.

## Oleada 1 (esta implementación)

Públicas (sin login): `lookup_chapter`, `list_catalog`, `convert_nutrient_units`, `calculate_vpd`, `interpret_context`, `salt_from_meq`.

Con sesión de suscriptor: `list_my_projects`, `get_my_project`.

## Probar en ChatGPT (después del deploy)

1. Settings → Apps & Connectors → Developer mode.
2. Crear conector → URL `https://nutriplantpro.com/mcp`.
3. Sin cuenta: VPD, 1 meq de Ca → nitrato de calcio, capítulos del manual.
4. Conectar cuenta → login NutriPlant → “mis proyectos”.

## Variable OAuth (opcional)

No hace falta una variable nueva en Netlify (el paquete de env ya está al tope de 4 KB de Lambda).

El plugin firma el login con un derivado de un secreto **que ya existe** (`AGROCLIMATE_TOKEN_SECRET`, o si no `AGROCLIMATE_CRON_SECRET` / `ADMIN_ACCESS_PIN`). No usa el token del Socio.

Si más adelante hay hueco en las variables, se puede poner `NUTRIPLANT_PUBLIC_MCP_OAUTH_SECRET` y esa gana. No es obligatorio.
