# Invest PRO — Conocimiento ChatGPT Socio / Plan PRO Assistant

**Módulo de Plan PRO (admin).** No es pestaña del dashboard de suscriptores.

## Dónde está

Plan PRO → pestaña **Invest PRO** (junto a Notebook PRO, Nutri PRO, Neuron PRO).

URL app: `/planpro/` (misma entrada admin + PIN).

## Para qué sirve

Consultar **empresas, ETFs, índices y criptomonedas** con gráfica **TradingView embebida** en Plan PRO:

- Buscador (catálogo Popular Picks + ticker exacto → abre en TradingView)
- Cabecera del activo + enlace “Abrir en TradingView”
- Gráfica avanzada TradingView (periodos, indicadores, dibujo en el toolbar del widget)
- Comparar hasta **6** activos (⇄ + Graficar → `compareSymbols` en el widget)
- **Popular Picks** y **⭐ Listas** en Supabase (sin cambio)
- Si el admin ya inició sesión en TradingView en el mismo navegador, puede usar su cuenta ahí

## Datos técnicos (para no inventar)

| Pieza | Detalle |
|-------|---------|
| UI | `planpro/index.html` + `assets/planpro-invest.js` / `.css` |
| Gráfica | Widget TradingView Advanced Chart (embed) |
| Cliente Yahoo (legado / opcional) | `assets/planpro-financial-data-service.js` + `/api/plan-pro-invest` — **ya no** alimenta la gráfica principal |
| Tabla | `plan_pro_invest_lists` + `plan_pro_invest_watchlist.list_id` |
| SQL setup | `supabase-plan-pro-invest-watchlist.sql` + `supabase-plan-pro-invest-lists.sql` |

**Importante:** no inventes precios; la cotización se ve en el chart de TradingView. Listas ★ = Plan PRO / Supabase.

## Qué NO hace (aún)

- No hay action `nutriplantAdminQuery` para cotizaciones en vivo (no uses la API admin para inventar precios).
- No hay noticias, recomendaciones de compra ni alertas automáticas en v1.
- No es asesoría financiera: es herramienta de consulta de mercado para el admin.

## Cómo debe responder el Socio / el chat IA

Si Jesús pregunta por Invest PRO, tickers, portafolio o “cómo veo NVIDIA”:

1. Dile que abra **Plan PRO → Invest PRO**.
2. Explica ★ = Mi portafolio (persistente) y filtros Popular Picks.
3. **No inventes precios, P/E ni % del día.** Indica que lo vea en la gráfica TradingView de Invest PRO (o enlace “Abrir en TradingView”).
4. Si pregunta “¿dónde guardo mis favoritos?” → tabla `plan_pro_invest_watchlist` / UI ★.
5. Índices Yahoo típicos: `^GSPC` (S&P 500), `^NDX` (Nasdaq 100), `^DJI`, `^RUT`, `^VIX`. Berkshire: `BRK-B`.

## Relación con el resto de Plan PRO

| Módulo | Rol |
|--------|-----|
| Notebook PRO | Apuntes / plantas / ramas |
| Nutri PRO | Bóveda archivos y enlaces |
| Neuron PRO | Mapa de relaciones |
| **Invest PRO** | Mercados / watchlist |

Las notas de inversión en Notebook PRO (mini-tablas, ideas) **no sustituyen** Invest PRO: uno es cerebro de notas; el otro es cotización y gráfica en vivo.
