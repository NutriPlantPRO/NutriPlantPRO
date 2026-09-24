# Socio Admin — MCP (complemento ChatGPT)

Puerta privada del Socio. **No es** el plugin público (`/mcp`).

- MCP: `https://nutriplantpro.com/mcp-admin`
- API que ya usaba el GPT: `https://nutriplantpro.com/api/admin-assistant`
- Tool única: `nutriplantAdminQuery` → `{ "action":"…", "params":{…} }` (v2.15.0)
- Secreto: el mismo `NUTRIPLANT_ADMIN_GPT_TOKEN` (sin variable nueva)

OpenAI retira los Custom GPT (Actions) el **11 de diciembre de 2026**. Las Actions **no** pasan al complemento. Esta puerta las reemplaza.

---

## Antes de migrar el GPT

1. Deploy de este repo a Netlify (`main` verde).
2. En ChatGPT, deja el GPT **publicado** (aunque siga privado) con Instructions + Knowledge al día. La migración usa la última versión publicada.
3. Copia de seguridad: `docs/CHATGPT-SOCIO-INSTRUCCIONES-COMPLETAS.md` y los 7 Knowledge.

## Smoke en terminal

```bash
curl -sS 'https://nutriplantpro.com/mcp-admin'
# ok: true, socio: true

curl -sS -X POST 'https://nutriplantpro.com/mcp-admin' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $NUTRIPLANT_ADMIN_GPT_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"nutriplantAdminQuery","arguments":{"action":"describe_api","params":{}}}}'
# result.structuredContent.version = 2.15.0
```

## En ChatGPT (después del deploy)

1. Settings → Apps & Connectors → **Developer mode**.
2. Crear conector:
   - **Name:** NutriPlant Socio Admin
   - **MCP URL:** `https://nutriplantpro.com/mcp-admin`
3. Al conectar, ChatGPT abre el login del Socio. Contraseña = **token admin** o **PIN de admin** (el del panel). No uses la cuenta de un suscriptor.
4. En el complemento migrado, deja ese conector activo. Revisa que la Skill tenga el bloque Instructions (`CHATGPT-SOCIO-INSTRUCCIONES-COMPLETAS.md`).
5. Chat nuevo → `@NutriPlant Socio Admin` (o el nombre que le diste):
   - «consulta describe_api y dime la version» → **2.15.0**
   - «¿cuántos usuarios tengo, cuándo pagaron y cuándo les toca?» → `subscription_roster`

## Qué pasa al pulsar «Migrar a un complemento»

| Del GPT | En el complemento |
|---------|-------------------|
| Instructions | Skill (revisa que no se recorte) |
| Knowledge | Archivos de referencia |
| Action OpenAPI | **No pasa.** Este MCP la sustituye |
| Chats viejos | Se quedan en el GPT hasta el 11 dic |
| Visibilidad | El complemento nace **privado** |

El GPT original queda de solo lectura. No pulses migrar hasta tener `/mcp-admin` en prod y el conector probado.

## No mezclar

| | Socio `/mcp-admin` | Público `/mcp` |
|---|---|---|
| Quién | Solo Jesús | Cualquiera |
| Login | Token admin o PIN | Cuenta de suscriptor |
| Datos | Todos los clientes, pagos, Plan/Nutri/Invest | Manual + **sus** lotes |

## Archivos

- `netlify/functions/nutriplant-admin-mcp.js`
- `netlify/functions/lib/admin-mcp-auth.js`
- `netlify/functions/lib/admin-mcp-tools.js`
- Paquete GPT: `docs/CHATGPT-SOCIO-PAQUETE-ACTUALIZACION.md`
