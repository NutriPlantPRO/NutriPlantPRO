# Radar del Cultivo — Plan de diseño y pasos

Documento para implementar la funcionalidad **Radar del Cultivo** en la sección **Ubicación del Predio** de NutriPlant PRO, usando la API de Planet (y/o Sentinel-2) para mostrar NDVI sobre el polígono del predio.

---

## 1. Resumen de la idea

- El usuario ya traza el **polígono del predio** y las coordenadas se guardan en **Supabase**.
- Se agrega un botón **Radar del Cultivo** al lado del botón de ubicación.
- Al pulsarlo (con polígono ya definido y guardado), se consulta imagen satelital (Sentinel-2 L2A o equivalente), se calcula **NDVI** y se muestra en el **mismo mapa** como capa con colorimetría (Bajo → Óptimo desarrollo).
- **Límites:** 1 actualización por mes por proyecto, máximo **20** consultas mensuales por usuario (tope que puedes subir o bajar según consumo). Contador en la nube para que sea el mismo en todos los equipos y visible en admin.

---

## 2. Alcance MVP

| Aspecto | Definición |
|--------|------------|
| **Dataset** | Sentinel-2 L2A (o alternativa Planet si aplica) |
| **Índice** | NDVI |
| **Entrada** | Polígono del predio (coordenadas desde Supabase) |
| **Salida** | Imagen raster coloreada dentro del polígono |
| **UI** | Mismo mapa del predio + capa NDVI con colorimetría suavizada + barra de intensidad + texto fijo |
| **Límites** | 1 consulta / mes / proyecto; máx. **20** consultas / mes / usuario (contador en Supabase; ajustable según consumo) |

### Cómo se verá en NutriPlant PRO

- Mismo mapa de la sección **Ubicación del Predio**.
- Capa satelital con **colorimetría difuminada** (suavizado entre píxeles).
- **Barra de intensidad:** Bajo → Óptimo desarrollo.
- **Texto debajo del mapa:**  
  *"Las zonas con menor desarrollo sugieren atención y revisión en campo."*
- **Contador visible** en la sección: "Radar del Cultivo: X de 1 usado este mes (proyecto actual)" y "Y de 20 usados este mes (total usuario)".

---

## 2.5 Mejor alternativa y ¿es buena idea 1 consulta/mes/proyecto y tope por usuario?

### Mejor alternativa para el MVP

| Criterio | Sentinel Hub | Planet |
|----------|--------------|--------|
| Dataset NDVI | Sentinel-2 L2A (y otros) | PlanetScope u otros; Sentinel-2 no claro |
| Forma de cobro | Por Processing Units (tamaño de imagen) | Por km² o por orden (poco claro) |
| Free tier | Sí (30.000 PU/mes) | Trial con crédito limitado |
| Coste predecible | Sí (PU por petición) | No hasta tener contrato |
| Objetivo &lt; 0.50 USD/mes | Sí (0 USD con free tier; bajo si pagas) | Riesgo de pasarse sin precio fijo |

**Recomendación:** Usar **Sentinel Hub** para el MVP: Sentinel-2 L2A, NDVI, free tier que encaja con tu techo de coste y cobro por PU (no por superficie), así controlas mejor el gasto. Planet dejarlo como opción futura si más adelante necesitas su catálogo específico.

### ¿Es buena idea 1 consulta mensual por proyecto y tope 30?

**Sí, es una buena regla.** Resumen:

- **1 por mes por proyecto:** Cada predio tiene una “actualización” al mes. Evita que un usuario gaste todo en un solo proyecto, reparte el valor entre proyectos y mantiene el coste bajo (menos imágenes = menos PU). Para seguimiento de cultivo, 1 NDVI al mes por parcela suele ser suficiente en MVP.
- **Tope por usuario al mes:** Fijado en **20 consultas** para arrancar. Limita el coste (~60 PU/usuario/mes) y evita abusos. Puedes **subir o bajar** el tope según consumo y coste real.

**Ajuste según consumo:** Si 20 se queda corto, subes (ej. 25 o 30). Si el coste sube, bajas (ej. 15). El contador en la nube permite cambiar el límite en un solo sitio.

---

## 3. Ajustes de UI en Ubicación del Predio

- **Botón "Ubicación del Predio" (📍):** Que se vea claramente como botón (estilo consistente con "Mi Ubicación" y "Guardar Predio").
- **Nuevo botón:** **Radar del Cultivo** al lado del de ubicación.
  - Habilitado solo si hay polígono guardado (y según límites).
  - Al pulsar: cargar NDVI para el polígono actual y superponer en el mapa.

---

## 4. Límites y contador (nube)

- **1 actualización por mes por proyecto:** Cada proyecto tiene un “último uso” de Radar (fecha/mes). Si ya se usó este mes en este proyecto, no permitir otra consulta hasta el siguiente mes.
- **Máximo 20 consultas por mes por usuario:** Contador global por usuario y mes (ej. `radar_usage_month` = "2026-03", `radar_usage_count` = 5). Si llega a 20, no permitir más hasta el siguiente mes. Límite ajustable según consumo.
- **Persistencia:** Todo en **Supabase** (por usuario y por proyecto) para que:
  - El usuario vea el mismo contador en otro equipo.
  - El admin vea uso por usuario/proyecto desde el panel.

### Modelo de datos sugerido (Supabase)

**Opción A – Columnas en `profiles`:**
- `radar_usage_month` (texto, ej. "2026-03")
- `radar_usage_count` (entero, consultas este mes)

**Tabla `project_radar_usage` (o en `projects.data`):**
- `project_id`, `last_radar_at` (timestamp o "2026-03")  
- Así se sabe si este proyecto ya usó su 1 consulta del mes.

**Opción B – Tabla dedicada `radar_usage`:**
- `user_id`, `month_key`, `count` (consultas del usuario en ese mes)
- `project_id`, `month_key`, `last_used_at` (1 uso por proyecto por mes)

Se puede empezar con columnas en `profiles` + algo en `projects` (o en `data` del proyecto) y luego migrar a tabla si hace falta.

---

## 5. Planet.com – API Key y pasos para ti

### 5.1 Dónde está tu API Key

- Has entrado en **Planet Insights Platform** (insights.planet.com). Ahí suele estar la gestión de **Data** y **Account**.
- La **API Key** para usar las APIs de desarrollador (Data API, Orders, etc.) normalmente se obtiene en:
  - **Account / My account:** [https://www.planet.com/account](https://www.planet.com/account) → sección API Key o similar, o  
  - Dentro de **Planet Insights Platform** → **Account** → **My plan and products** o **Users** → a veces ahí aparece “API key” o “Developer”.
- Si no la ves en Insights, entra a [developers.planet.com](https://developers.planet.com) y en **Authentication** suelen indicar el enlace exacto a “Get your API key” (a veces es el mismo account.planet.com).

### 5.2 Cómo usar la API Key (técnico)

- Autenticación: **HTTP Basic Auth** con la API Key como usuario y contraseña vacía:
  - `Authorization: Basic base64(API_KEY + ':' + '')`
- Las llamadas van a `https://api.planet.com/...` (Data API, Orders API, etc.).  
- **Importante:** La API Key no debe ir en el frontend. Debe usarse desde un **backend** (Netlify Function, Supabase Edge Function o tu `server.py`) que reciba el polígono desde NutriPlant PRO, llame a Planet (o al servicio que finalmente usemos) y devuelva la imagen o los datos de NDVI.

### 5.3 Trial y coste

- Cuenta de **prueba gratis** (30 días): sirve para desarrollar y ver límites de la trial.
- Después del trial, **Planet tiene coste por uso** (imágenes, órdenes, etc.). Por eso tiene sentido:
  - Limitar a **1 consulta/mes/proyecto** y **20/mes/usuario** (tope ajustable).
  - Estimar coste por usuario según documentación de precios de Planet (ver abajo).

### 5.4 Siguiente paso que puedes hacer ya

1. Entra a [https://www.planet.com/account](https://www.planet.com/account) (o al enlace de “API” / “Developer” dentro de Insights).
2. Localiza la sección **API Key** y copia la clave.
3. Guárdala en **variables de entorno** (Netlify, Supabase o `.env` local), por ejemplo: `PLANET_API_KEY=tu_clave`.
4. En el doc o en un paso siguiente, anotamos: “API Key obtenida: sí; entorno: Netlify/Supabase” para no hardcodearla nunca en el front.

---

### 5.5 Qué hay en la pantalla de Planet Insights (insights.planet.com)

Para ir teniendo claro qué ocupa cada cosa en la página:

| En la pantalla (Account / Data) | Para qué sirve (y qué te interesa para el API) |
|---------------------------------|--------------------------------------------------|
| **Account → Usage and reporting** | Ver **consumo** (consultas, uso, créditos o PU si aplican). Útil para ver cuánto gastas en el trial y después. |
| **Account → My plan and products** | Ver **plan actual** (trial, límites, qué incluye). Ahí suele salir si tienes API incluida y hasta cuánto. |
| **Account → Invoices / Purchase** | Facturación y comprar más (por si más adelante pasas a plan de pago). |
| **Data → Subscribe to data** | **Suscribirte a fuentes de datos** (a veces el acceso por API se activa desde aquí). Revisa si hay Sentinel-2 o el producto que quieras. |
| **Data → View subscriptions** | Ver **suscripciones activas** a datos; si ya tienes algo contratado, aparece ahí. |
| **Data → Search and order** | Buscar y pedir escenas (órdenes). La API de órdenes trabaja con esto. |
| **Data → Manage areas of interest** | Definir zonas (AOI); la API puede usar esas áreas. |

**Recordatorio:** Para el **Radar del Cultivo (MVP)** usamos **Sentinel Hub** (Sentinel-2 NDVI), no la API de Planet. Lo que ocupas para el API del Radar es: cuenta en Sentinel Hub y sus credenciales. Planet lo puedes dejar listo (API Key en account.planet.com) por si más adelante; en Insights lo que más te sirve es **Usage and reporting** y **My plan and products** para ver consumo y plan.

---

## 6. Coste estimado por usuario (a rellenar contigo)

**Resumen rápido:** Con 1 consulta/mes/proyecto y máx. 20/usuario/mes (tope ajustable), orden de magnitud: **Planet** 1–5 €/usuario/mes en tope (trial cubre desarrollo); **Sentinel Hub** < 1 €/usuario o free tier. Detalle abajo.

- Planet no publica precios fijos en la web para todos los productos; suelen ser “contact sales” o según plan.
- Con **1 consulta/mes/proyecto** y **máx. 20/mes/usuario** (ajustable):
  - Escenario bajo: 1 usuario = 1–5 consultas/mes → coste bajo.
  - Escenario alto: 1 usuario = 20 consultas/mes → coste máximo por usuario.
- **Qué hacer:** Cuando tengas acceso a “My plan and products” o a la facturación de Planet (después del trial), anota:
  - Coste por escena / por orden / por km² (según lo que te cobren).
  - Con eso calculamos: “coste estimado por usuario/mes” (ej. mínimo y máximo) y lo dejamos en este doc en la sección **Coste estimado**.

### ¿Cuántos PU consume una consulta?

- **Referencia Sentinel Hub:** 1 PU = una imagen 512×512 px, 3 bandas, formato estándar. NDVI usa 2 bandas (rojo + infrarrojo), salida típica 512×512 o 1000×1000 px.
- **Por consulta Radar (una imagen NDVI del predio):** según tamaño de salida, **aprox. 1,5–5 PU** (ej. 512×512 ≈ 1,5–2 PU; 1000×1000 ≈ 4–5 PU). Para las cuentas usamos **~3 PU por consulta** de media.

### Free tier: 30.000 PU/mes

- El plan **gratuito (Exploration)** suele dar **30.000 PU/mes**.
- Con 3 PU por consulta: 30.000 ÷ 3 = **hasta ~10.000 consultas/mes en free tier** (o menos si usas imágenes más grandes).

### Escenario: 500 usuarios, tope 20 consultas/usuario/mes

| Uso promedio por usuario/mes | Consultas totales (500 usu) | PU totales (×3) | ¿Cabe en free 30k? | Comentario |
|------------------------------|-----------------------------|----------------|--------------------|------------|
| 5 consultas | 2.500 | 7.500 | Sí | Cómodo en free |
| 10 consultas | 5.000 | 15.000 | Sí | Free |
| 20 consultas (tope) | 10.000 | 30.000 | Justo en el límite | Free al límite; si superas, plan de pago |

- **Caso peor** (los 500 usan las 20): 10.000 consultas × 3 PU = **30.000 PU/mes** → justo en el límite del free tier. Si algo se pasa, un plan superior (ej. Basic 70k PU) cubre holgado. Con tope 20, es más fácil quedarse en **free tier** o en un plan bajo.
- **Caso realista:** promedio 5–10 consultas por usuario → **free tier, 0 USD**. Si subes el tope más adelante (ej. 25 o 30), revisas consumo y coste y ajustas.

### Orden de magnitud (referencia rápida)

- **Planet:** No publican precio por escena. En foros se ha visto ~€5–8.50/km²; un predio pequeño (0.02–0.5 km²) podría ser **€0.10–4 por consulta** (solo referencia). Trial suele cubrir desarrollo. En tope (20 consultas/usuario/mes) asumir **1–5 €/usuario/mes** hasta que tengas factura.
- **Sentinel Hub (Sentinel-2 NDVI):** ~3 PU por consulta; free tier 30.000 PU/mes. Con tope **20** consultas/usuario: 500×20×3 = 30.000 PU (límite free). Uso bajo/medio → **0 USD**; si superas, plan de pago y coste por usuario sigue bajo.

---

## 7. Flujo técnico resumido (MVP)

1. Usuario tiene **polígono guardado** en Supabase (ya implementado).
2. Usuario pulsa **Radar del Cultivo**.
3. Frontend comprueba límites (1/mes/proyecto, 20/mes/usuario, ajustable) leyendo desde Supabase; si no puede, muestra mensaje y no llama al backend.
4. Frontend envía **project_id** (y polígono si el backend no lo lee de Supabase) a un **endpoint seguro** (Netlify Function / Edge Function / server.py).
5. Backend:
   - Lee polígono (de Supabase o del body).
   - Llama a Planet (o al servicio que dé Sentinel-2/NDVI) para obtener/computar NDVI para esa área y periodo.
   - Devuelve imagen raster o URL de tile/listo para pintar.
6. Frontend superpone la capa NDVI en el mapa, dibuja la **barra Bajo → Óptimo desarrollo** y muestra el texto fijo debajo.
7. Backend (o el front tras respuesta) actualiza en Supabase: uso del proyecto este mes y contador del usuario este mes.

---

## 8. Pasos de implementación sugeridos

| # | Paso | Responsable |
|---|------|-------------|
| 1 | Definir modelo en Supabase (contador usuario + 1 uso/mes/proyecto) | Dev |
| 2 | Obtener y guardar API Key de Planet en entorno seguro | Tú + Dev |
| 3 | Crear endpoint backend que reciba polígono y llame a Planet (o Sentinel) y devuelva NDVI/raster | Dev |
| 4 | En la sección Ubicación: dejar "Ubicación del Predio" como botón claro; agregar botón "Radar del Cultivo" | Dev |
| 5 | Mostrar contador en la sección (X/1 por proyecto, Y/30 por usuario) desde Supabase | Dev |
| 6 | Integrar respuesta NDVI en el mapa (capa + barra + texto) | Dev |
| 7 | Actualizar contadores en Supabase tras cada uso correcto | Dev |
| 8 | En admin: vista o columnas para ver uso Radar por usuario/proyecto | Dev |
| 9 | Rellenar coste estimado por usuario cuando tengas datos de Planet | Tú |

---

## 9. Notas sobre Sentinel-2 vs Planet

- **Sentinel-2** es de la ESA (gratuito bajo condiciones); **Planet** tiene su propio catálogo (PlanetScope, etc.).
- Planet puede ofrecer acceso a algunos productos externos; habría que revisar en **Search and order** / **Subscribe to data** en Insights si hay “Sentinel-2” o equivalente.
- Si en Planet no hay Sentinel-2 L2A, alternativas:
  - Usar **PlanetScope** con NDVI desde Planet (Band Math en Orders API).
  - O integrar **Sentinel Hub** (u otro proveedor) para Sentinel-2 L2A y NDVI, y dejar Planet para otro uso.
- Para el MVP se puede fijar: “Fuente: Planet (o Sentinel-2 si está disponible)” y en la implementación concreta elegir una sola para la primera versión.

---

## 10. Resumen para ti (socio)

- **Radar del Cultivo:** botón al lado de Ubicación del Predio; usa el polígono guardado en Supabase y muestra NDVI en el mismo mapa con barra de colores y texto fijo.
- **Límites:** 1/mes/proyecto, **20**/mes/usuario (ajustable según consumo); contador en la nube (mismo valor en todos los equipos; admin puede verlo).
- **Planet:** API Key en account.planet.com (o en Insights); se usa solo desde backend; después del trial hay coste, por eso los límites.
- **Siguiente:** Conseguir la API Key y guardarla en entorno; luego seguimos con el modelo en Supabase y el endpoint.

Cuando tengas la API Key y (si aplica) algo de info de precios de Planet, lo anotamos aquí y pasamos al paso 1 de implementación.
