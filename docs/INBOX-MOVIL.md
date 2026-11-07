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

- **Estado:** nueva
- **Fuente:** iPhone
- **Tema:** plugin / ChatGPT

Al llamar el complemento NutriPlant en ChatGPT, a veces hay que insistir para que “sepa” y se adentre a la data del usuario; después ya nota hasta dónde puede llegar.

Idea: que desde el **primer prompt** o un **subtítulo / intent** del complemento en ChatGPT quede claro que puede acceder a la data del usuario (cuando hay sesión), para no depender de insistir.

**Para la Mac:** revisar skill / instrucciones del plugin público (y copy del complemento) para declarar al inicio capacidades con sesión vs sin sesión, y bajar la fricción del primer mensaje.
