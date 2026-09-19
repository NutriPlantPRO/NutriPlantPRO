---
name: inbox-movil
description: Captura ideas desde Cursor iPhone (o cualquier chat) en docs/INBOX-MOVIL.md sin tocar código de producto. Usar cuando el usuario dicta o tira una idea, anota, inbox, se me ocurrió, para después, no implementes, o captura móvil. No usar si pide implementar, arreglar o desplegar.
---

# Inbox móvil

Bandeja: `docs/INBOX-MOVIL.md`. Destino del PR: repo `NutriPlantPRO/NutriPlantPRO`, rama hacia `main`.

## Cuándo

El usuario está capturando, no pidiendo trabajo de producto. Señales: `anota`, `inbox`, `idea`, `se me ocurrió`, `para después`, `no implementes`, dictado corto, o corre en iPhone/cloud y no pidió código.

Si pide **implementar / arreglar / deploy / commit de producto** → no uses este skill. Haz el trabajo.

## Qué hacer

1. Leer `docs/INBOX-MOVIL.md`.
2. Insertar la entrada **arriba** de la sección `## Entradas` (más reciente primero). No reescribir entradas viejas.
3. No tocar HTML, JS, CSS, Netlify, MCP ni otros `docs/` salvo que lo pida.
4. Commit solo de `docs/INBOX-MOVIL.md`. Rama `inbox/YYYY-MM-DD-slug`. PR hacia `main`, título `inbox: <título corto>`.
5. Responder en español con: 1 línea de qué anotaste + URL del PR.

## Formato de entrada

```markdown
### YYYY-MM-DD HH:mm — título corto

- **Estado:** nueva
- **Fuente:** iPhone
- **Tema:** (NutriPlant / plugin / AirCI / campo / otro)

<lo que dijo, limpio, sin inventar. Si dictó mal, interpreta y deja entre comillas una frase literal corta.>

**Para la Mac:** una frase de qué habría que hacer después.
```

Hora en `America/Mexico_City`. Si no sabes el minuto, usa la fecha.

## No hacer

- No implementar “de paso”.
- No mergear a `main` tú mismo.
- No mezclar varias ideas en una entrada: una idea = una entrada. Varias en el mismo mensaje = varias entradas, un solo PR.
