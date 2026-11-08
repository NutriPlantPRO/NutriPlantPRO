# Inbox móvil

Bandeja de ideas desde **Cursor iPhone**. No es producto. No es el Cerebro Digital.

La Mac baja esto con `git pull` (o abriendo el PR) y se trabaja en el chat local.

---

## Cómo usarlo (iPhone)

En el chat del agente, dicta o escribe. Ejemplos:

- `Anota: …`
- `Inbox: …`
- `Se me ocurrió … no implementes`
- Solo tira la idea. Si no pediste código, va aquí.

El agente **añade una entrada** (arriba = más reciente), **no toca código**, y abre un **PR** hacia `main`. El PR vive en GitHub:

https://github.com/NutriPlantPRO/NutriPlantPRO/pulls

---

## Cómo seguirlo (Mac)

1. Abrir el PR o `git pull` si ya está mergeado.
2. En el chat local: `lee docs/INBOX-MOVIL.md y sigue con la idea de …`

---

## Entradas

<!-- El agente inserta cada idea DEBAJO de este heading, más reciente primero. -->

### 2026-11-07 13:04 — ChatGPT: primer prompt / subtítulo con alcance de data del usuario

- **Estado:** hecha (repo 2026-11-08) — falta deploy + Actualizar/rescan en OpenAI
- **Fuente:** iPhone → PR #2
- **Tema:** plugin / ChatGPT

Al llamar el complemento NutriPlant en ChatGPT, a veces hay que insistir para que “sepa” y se adentre a la data del usuario; después ya nota hasta dónde puede llegar.

Idea: que desde el **primer prompt** o un **subtítulo / intent** del complemento en ChatGPT quede claro que puede acceder a la data del usuario (cuando hay sesión), para no depender de insistir.

**Hecho en Mac:** skill + `PUBLIC_INSTRUCTIONS` + subtítulo listing + `defaultPrompt` + MCP `prompts/*` declaran modos invitado vs sesión desde el inicio. Paquete: `chatgpt-plugins/nutriplant-pro/`.

### 2026-11-07 12:51 — ChatGPT complemento: acceso gratis con Manual + free

- **Estado:** hecha (repo 2026-11-08) — falta deploy + Actualizar/rescan en OpenAI
- **Fuente:** iPhone → PR #1
- **Tema:** plugin / ChatGPT

Hoy el complemento de ChatGPT pide usuario y contraseña: solo quien es usuario/suscriptor entra y ve proyectos + contexto. Quien no tiene cuenta no puede usarlo.

Idea: que **cualquiera** pueda interactuar al menos sin suscripción, con contexto y criterio NutriPlant PRO basado en el **Manual técnico** y lo **gratuito** (herramientas free). Quien sí esté suscrito inicia sesión y ve sus proyectos / contexto completo.

**Hecho en Mac:** MCP `0.7.0` con `securitySchemes` por tool (`noauth` free / `oauth2` suscriptor) + challenge OAuth solo en tools de cuenta. Login deja de ser muro de entrada.
