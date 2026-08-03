# Invest PRO — Conocimiento ChatGPT Socio / Plan PRO Assistant

**Módulo de Plan PRO (admin).** No es pestaña del dashboard de suscriptores.

## Dónde está

Plan PRO → pestaña **Invest PRO** (junto a Notebook PRO, Nutri PRO, Neuron PRO).

URL app: `/planpro/` (misma entrada admin + PIN).

## Para qué sirve

Consultar **empresas, ETFs, índices y criptomonedas**:

- Buscador por ticker o nombre (ej. `AAPL`, `VOO`, `YAR.OL`, `BTC-USD`)
- Ficha: nombre, ticker, tipo, precio, cambio del día, apertura, máx/mín día, 52 semanas, volumen; P/E / Forward P/E / EPS / yield / cap. cuando la fuente los entrega (si no → **N/D**)
- Gráfica histórica: 1D, 5D, 1M, 6M, 1A, 5A, Máximo
- Comparar hasta 6 activos en la misma gráfica
- **Popular Picks**: catálogo predefinido por categorías (IA, Semiconductores, Agricultura, Salud, Finanzas, Consumo, Espacio, Energía, ETFs, Cripto, Índices)
- **⭐ Mi portafolio** (watchlist): el admin marca ★ para agregar/quitar; se guarda en Supabase con símbolo + nombre

## Datos técnicos (para no inventar)

| Pieza | Detalle |
|-------|---------|
| UI | `planpro/index.html` + `assets/planpro-invest.js` / `.css` |
| Cliente aislado | `assets/planpro-financial-data-service.js` |
| API interna | `GET /api/plan-pro-invest` (Netlify; solo admin Bearer) |
| Proveedor actual | Yahoo Finance endpoints públicos **sin API key** (`lib/yahoo-finance-provider.js`) |
| Tabla | `plan_pro_invest_watchlist` (RLS: `is_admin_user()` + `user_id = auth.uid()`) |
| SQL setup | `supabase-plan-pro-invest-watchlist.sql` |

**Importante:** la fuente sin API key puede cambiar o fallar. El servicio está aislado para cambiar de proveedor sin rehacer la UI.

## Qué NO hace (aún)

- No hay action `nutriplantAdminQuery` para cotizaciones en vivo (no uses la API admin para inventar precios).
- No hay noticias, recomendaciones de compra ni alertas automáticas en v1.
- No es asesoría financiera: es herramienta de consulta de mercado para el admin.

## Cómo debe responder el Socio / el chat IA

Si Jesús pregunta por Invest PRO, tickers, portafolio o “cómo veo NVIDIA”:

1. Dile que abra **Plan PRO → Invest PRO**.
2. Explica ★ = Mi portafolio (persistente) y filtros Popular Picks.
3. **No inventes precios, P/E ni % del día.** Si no tienes dato de API de mercados, indica que lo vea en la ficha Invest PRO (o que actualice deploy/SQL si aún no aparece).
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
