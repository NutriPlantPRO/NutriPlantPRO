# Invest PRO — Conocimiento ChatGPT Socio / Plan PRO Assistant

**Módulo de Plan PRO (admin).** No es pestaña del dashboard de suscriptores.  
**OpenAPI:** v2.14.0 · actions `invest_pro_overview` · `invest_pro_holdings` · `invest_pro_lists`

## Dónde está

Plan PRO → pestaña **Invest PRO** (junto a Notebook PRO, Nutri PRO, Neuron PRO).

URL app: `/planpro/` (misma entrada admin + PIN).

## Para qué sirve

Consultar **empresas, ETFs, índices y criptomonedas** con gráfica **TradingView embebida** en Plan PRO:

- Buscador (catálogo Popular Picks + ticker exacto → abre en TradingView)
- Cabecera del activo + enlace “Abrir en TradingView”
- Gráfica avanzada TradingView (periodos, indicadores, dibujo en el toolbar del widget)
- Comparar hasta **6** activos (⇄ + Graficar → `compareSymbols` en el widget)
- **Popular Picks** y **⭐ Listas** en Supabase
- Si el admin ya inició sesión en TradingView en el mismo navegador, puede usar su cuenta ahí
- **Portafolio Schwab (abajo):** subir 1–4 capturas → `/api/invest-portfolio-extract` → filas en Supabase `plan_pro_invest_holdings`. Escaneo actualiza solo mercado (precio, cantidad, etc.). **Objetivo** y **Comentarios** solo se escriben cuando el admin los edita. Pasteles de peso y % ETF vs acciones.

## Actions API (lectura — GPT Socio)

Única Action ChatGPT: `nutriplantAdminQuery`. Usa estos `action`:

| action | Uso |
|--------|-----|
| `invest_pro_overview` | Resumen: conteos holdings/listas, top símbolos, reglas |
| `invest_pro_holdings` | Portafolio Schwab (`params.q` o `symbol` para filtrar; `limit`) |
| `invest_pro_lists` | Listas ★ + símbolos (`params.q` o `list_name`) |

```json
{ "action": "invest_pro_holdings", "params": { "q": "NVDA", "limit": 50 } }
```

```json
{ "action": "invest_pro_lists", "params": { "q": "Mi portafolio" } }
```

**Disclaimer obligatorio al responder con holdings:** los precios/valores vienen de la **última captura** (no cotización en vivo). Cotización en vivo = TradingView en la UI.

## Datos técnicos (para no inventar)

| Pieza | Detalle |
|-------|---------|
| UI | `planpro/index.html` + `assets/planpro-invest.js` / `planpro-invest-portfolio.js` / `.css` |
| Gráfica | Widget TradingView Advanced Chart (embed) |
| Cliente Yahoo (legado / opcional) | `assets/planpro-financial-data-service.js` + `/api/plan-pro-invest` — **ya no** alimenta la gráfica principal |
| Watchlist | `plan_pro_invest_lists` + `plan_pro_invest_watchlist.list_id` |
| Portafolio holdings | tabla `plan_pro_invest_holdings` + API `/api/invest-portfolio-extract` |
| Orden tabla portafolio | `plan_pro_ui_prefs.prefs_json.invest_holdings_sort` `{ key, dir }` |
| SQL setup | `supabase-plan-pro-invest-watchlist.sql` + `supabase-plan-pro-invest-lists.sql` + `supabase-plan-pro-invest-holdings.sql` |

## Qué NO hace

- **No inventes** precios, P/E ni % del día si no vienen en `invest_pro_holdings`.
- No hay noticias, recomendaciones de compra ni alertas automáticas en v1.
- El portafolio Schwab **no** sincroniza solo con el broker: hay que subir capturas.
- No es asesoría financiera: herramienta de consulta para el admin.
- Las actions son **solo lectura** (no escriben holdings ni listas).

## Cómo debe responder el Socio

Si Jesús pregunta por Invest PRO, tickers, portafolio o “cómo veo NVIDIA”:

1. Llama `invest_pro_overview` y/o `invest_pro_holdings` / `invest_pro_lists` **en el mismo turno**.
2. Si pide cotización en vivo → Plan PRO → Invest PRO (TradingView); no inventes.
3. ★ = listas persistentes; portafolio abajo = holdings Schwab.
4. Índices Yahoo típicos en UI: `^GSPC`, `^NDX`, `^DJI`, `^RUT`, `^VIX`. Berkshire: `BRK-B`.

## Relación con el resto de Plan PRO

| Módulo | Rol |
|--------|-----|
| Notebook PRO | Apuntes / plantas / ramas |
| Nutri PRO | Bóveda archivos y enlaces |
| Neuron PRO | Mapa de relaciones |
| **Invest PRO** | Mercados / watchlist / portafolio |

Las notas de inversión en Notebook PRO **no sustituyen** Invest PRO.
