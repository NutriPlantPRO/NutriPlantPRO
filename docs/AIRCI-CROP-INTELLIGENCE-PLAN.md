# AirCI — Crop Intelligence by NutriPlant PRO

Documento vivo para definir e implementar el módulo **AirCI**: análisis de huerta con dron RGB + ortomosaico, capas de copa, fenología y coloración, con apoyo de la IA de admin (ChatGPT Socio / Terra).

**Ruta prevista:** `https://nutriplantpro.com/airCI`  
**Acceso:** solo uso interno (admin). No es módulo público de usuarios.  
**Estado:** F1 listo (subida GeoTIFF + mapa). Ejecutar `supabase-airci.sql` en Supabase. Siguiente: F2 detección de copas.

---

## 0. Identidad y assets

| Elemento | Archivo | Uso |
|----------|---------|-----|
| Logo AirCI (blanco) | `assets/AirCL_4K_transparente.png` | **Header banda oscura** (izquierda). Nota: archivo dice `AirCL`; marca = **AirCI** |
| Logo AirCI (azul marino) | `assets/AirCI_azul_marino_4K_transparente.png` | Opcional en cuerpo blanco / favicon / docs |
| Logo NutriPlant PRO (blanco) | `assets/NutriPlant_PRO_white.png` | **Header banda oscura** (derecha) |
| Logo NutriPlant PRO (azul) | `assets/NutriPlant_PRO_blue.png` | Cuerpo / docs si hace falta |
| Marca N (hoja) | `assets/N_Hoja_Azul.png` / `N_Hoja_Blanca.png` | Favicon / enlace “Panel Admin” |

### Panel UI (cerrado — calca estilo Alertas agroclimáticas)

Referencia visual: `admin/agroclimate.html` (banda superior + fondo claro + cards blancas).

| Zona | Diseño |
|------|--------|
| **Fondo del módulo** | Claro / blanco (`#f1f5f9` + paneles `#fff`), igual espíritu que agroclimate |
| **Banda superior** | Sticky, gradiente oscuro (`#0f172a` → `#075985`), como `.aa-header` |
| **Izquierda del header** | Logo **AirCI Crop Intelligence** (variante blanca) |
| **Derecha del header** | Logo **NutriPlant PRO** (variante blanca) |
| **Centro (opcional)** | Título corto del predio/vuelo activo o subtítulo *Análisis de huerta con ortomosaico RGB* |
| **Cuerpo** | Metadatos editables inline + métricas en cards + mapa / ortomosaico |

**Nombre oficial:** AirCI Crop Intelligence by NutriPlant PRO  
**Nombre corto en menú/admin:** AirCI

---

## 1. Resumen de la idea

1. Se vuela un **dron RGB** sobre la huerta.
2. Se genera un **ortomosaico** georreferenciado (calidad de imagen de la huerta).
3. En NutriPlant PRO, sección **AirCI** (`/airCI`), se sube o vincula ese ortomosaico (y metadatos del predio / vuelo).
4. El sistema (pipeline de visión + estadísticas + IA admin) detecta **copas de árboles/plantas**, construye **capas**, calcula **métricas** y permite **interpretar** con Terra / ChatGPT Socio.
5. Se mantienen **IDs permanentes por árbol** entre vuelos para comparar evolución.

**Entrada principal:** ortomosaico RGB (con escala y georreferencia cuando exista).  
**Salida:** resumen de huerta + mapa interactivo con capas + ficha por árbol + estadísticas + exportación.

---

## 2. Alcance por bloques funcionales

### 2.1 Datos generales del predio

| Métrica | Descripción |
|---------|-------------|
| Superficie analizada | ha |
| Número total de árboles | conteo detectado |
| Árboles por hectárea | densidad |
| Superficie total cubierta por copas | m² |
| % cobertura de copa | |
| % superficie sin copa | |
| Árboles sin copa / posiblemente faltantes | conteo y % |

### 2.2 Datos individuales por árbol

ID **permanente** por árbol. Por cada uno:

| Campo | Notas |
|-------|--------|
| Coordenadas GPS del centro | si hay geo |
| Polígono de la copa | geometría |
| Área de copa | m² (o px si aún no hay escala) |
| Diámetro promedio / máx / mín | de la copa |
| Diferencia % vs promedio de la huerta | |
| Clasificación de tamaño | pequeña / media / grande |
| Completo o cortado por límite del predio | flag |
| Nivel de confianza del análisis | 0–1 o % |

### 2.3 Estadística de las copas

Área promedio, mediana, máx, mín, desviación estándar, CV, percentiles P10 / P25 / P75 / P90, % debajo o encima del rango normal.

### 2.4 Clasificación fenológica por árbol

Separar píxeles de cada copa en:

- Floración  
- Brotación nueva  
- Vegetativo maduro  
- Coloración atípica  
- Sombra / no clasificado  

Calcular:

- Índice de Floración / Brotación / Vegetativo  
- Estado fenológico dominante  
- Uniformidad entre árboles  
- Confianza de la clasificación  

**Regla:** floración + brotación + vegetativo + no clasificado = **100%** (definir si “coloración atípica” es subclase de vegetativo/no clasificado o categoría aparte que también entra en el 100%).

### 2.5 Coloración

Por árbol:

- Color promedio de la copa  
- Diferencia vs mediana de la huerta  
- % amarilla / bronceada / verde clara / verde oscura  
- Índice de anomalía de color  
- Clasificación relativa: similar al lote / diferente / muy diferente  

**Advertencia de producto (obligatoria en UI e IA):**  
No interpretar automáticamente una coloración diferente como deficiencia nutricional o enfermedad. Puede ser floración, brotación u otra etapa vegetativa.

### 2.6 Comparación entre vuelos

Mismo ID de árbol entre fechas:

- Δ área (m² y %)  
- Δ floración / brotación / vegetativo / coloración  
- Árboles nuevos, faltantes o con reducción de copa  
- Evolución histórica (gráficas)

### 2.7 Capas del mapa

Visualizar (una a la vez como capa activa; cobertura de contorno siempre como base opcional):

- Cobertura de copa (contornos)  
- **Tamaño de copa — semáforo** (relleno del polígono según valor vs promedio del lote)  
- Floración  
- Brotación  
- Vegetativo  
- Coloración  
- Árboles atípicos  
- Cambios entre fechas  

Al seleccionar un árbol → **ficha individual** con todos sus datos.

#### Capa semáforo de copa (cerrado — idea 2026-08-06)

Cada polígono de copa se **pinta** según su valor relativo al promedio de la huerta (variable activa: por defecto **área de copa**; luego diámetro, floración, etc.):

| Color | Significado | Criterio sugerido (Z-score) |
|-------|-------------|-------------------------------|
| **Rojo** | Muy bajo | Z &lt; −1.5 (o &lt; −2 si se quiere más estricto) |
| **Amarillo** | Por debajo del promedio | −1.5 ≤ Z &lt; −0.5 |
| **Verde** | En el promedio / normal | −0.5 ≤ Z ≤ +0.5 (o ±1 DE) |
| **Azul** | Por encima del promedio | Z &gt; +0.5 |

Leyenda fija junto al mapa. Contorno de la copa siempre visible; el color es el **relleno**.

#### Mapa + tabla sincronizada

Al elegir una capa:

1. El mapa pinta según esa variable.  
2. **Debajo del mapa**, una tabla muestra solo (o prioriza) los valores de esa capa: ID, valor, promedio del lote, Δ%, Z, clase semáforo.  
3. Clic en fila → destaca el árbol en el mapa; clic en copa → resalta la fila.  
4. Filtros rápidos: “solo rojos”, “solo amarillos”, etc.

Así el agrícola ve el patrón visual y, al mismo tiempo, la lista accionable de árboles a revisar.

### 2.8 Correcciones / exclusiones

Excluir del análisis de copa:

- Pasto, suelo, sombras, personas, vehículos, objetos ajenos  

Árboles cortados por el límite de la imagen:

- Marcarlos  
- **Excluirlos** de estadísticas de tamaño si no se puede reconstruir la copa completa  

### 2.9 Resultados y exportación

- Resumen general de la huerta  
- Mapa interactivo  
- Tabla completa por árbol  
- Histograma de tamaño de copa  
- Distribución de floración y brotación  
- Lista de árboles atípicos  
- Exportación: **CSV, Excel, PDF, GeoJSON**

---

## 3. Estadística obligatoria (todas las variables)

Variables: área de copa, diámetro, floración, brotación, vegetativo, coloración.

Para cada una:

| Nivel | Métricas |
|-------|----------|
| Por árbol | valor, Δ abs vs promedio, Δ % vs promedio, Z-score, percentil |
| Huerta | promedio, mediana, mín, máx, rango, varianza, DE, CV, P10–P90 |

### Fórmulas

- Desviación absoluta: `valor − promedio`  
- Desviación %: `(valor − promedio) / promedio × 100`  
- Z: `(valor − promedio) / DE`  
- CV: `DE / promedio × 100`  

### Clasificación por Z

| Etiqueta | Criterio |
|----------|----------|
| Muy por debajo | Z &lt; −2 |
| Por debajo | −2 ≤ Z &lt; −1 |
| Normal | −1 ≤ Z ≤ +1 |
| Por encima | +1 &lt; Z ≤ +2 |
| Muy por encima | Z &gt; +2 |

Mostrar también:

- % dentro de ±1 DE  
- % fuera de ±1 DE  
- % atípicos  
- Relación copa mayor / menor  
- Histograma y boxplot por variable  

### Unidades

- Sin escala / sin geo: píxeles (px) y px².  
- Con escala y georreferencia: **m²** y metros (diámetro).

---

## 4. Ejemplo de referencia (imagen ya analizada)

Valores de un análisis piloto (en px; sustituir por m² cuando haya escala):

| Indicador | Valor |
|-----------|--------|
| Árboles detectados | 45 |
| Árboles con copa | 44 |
| Prácticamente sin copa | 1 (2.2%) |
| Cobertura total de copas | 39.6% |
| Superficie sin copa | 60.4% |
| Árboles completos para estadística | 27 |
| Área promedio de copa | 12,011 px |
| Copa máxima | 21,101 px |
| Copa mínima | 4,391 px |
| Desviación estándar | 3,802 px |
| Coeficiente de variación | 31.7% |
| Máx vs promedio | +75.7% |
| Mín vs promedio | −63.4% |
| Mayor / menor | 4.8× |

Este ejemplo sirve como **benchmark de UI y de reporte** (misma estructura de números en el resumen).

---

## 5. Rol de la IA (admin + Terra / ChatGPT Socio)

Uso interno, no chat público de clientes:

| Uso | Descripción |
|-----|-------------|
| Interpretación asistida | Explicar capas y outliers en lenguaje agronómico (sin diagnosticar enfermedad por color solo) |
| Ayuda en umbrales | Sugerir rangos “normales” del lote según cultivo / fecha |
| QA del análisis | Señalar posibles falsos positivos (pasto, sombra, objetos) |
| Narrativa de reporte | Borrador de resumen PDF a partir de las métricas |

**No sustituye** el pipeline numérico: la IA comenta sobre resultados ya calculados; no inventa conteos ni áreas.

---

### Cómo se entrega al cliente (cerrado — idea)

No se entrega el panel admin completo. Se entrega un **link de solo lectura** por predio/vuelo (o por site):

| Qué ve el cliente en el link | Qué no ve |
|------------------------------|-----------|
| Mapa + capas (cobertura, semáforo, etc.) | Panel admin / otros predios |
| Resumen y estadísticas del lote | Herramientas de edición / pipeline |
| Tabla de valores (según capa) | Tus notas internas si las marcas privadas |
| Export básico (PDF/CSV) opcional | Subida de vuelos, configuración |

**Modelo:** tú procesas en AirCI (admin) → generas **link compartible** con token → el agrícola abre `nutriplantpro.com/airCI/ver/...` y ve su mapa y sus números.

Opciones de acceso (por definir en F0/F1):

1. **Link con token** (recomendado para vender): no necesita cuenta NutriPlant.  
2. **Cuenta cliente** más adelante, si quieres historial propio.

---

### Auth del panel (cerrado)

Mismo flujo que Admin / Plan PRO — **no** clave `k=` de agroclimate:

1. Login en `login.html` con el **mismo correo y contraseña** de admin.  
2. Modal **“¿A dónde quieres entrar?”** → agregar 4.º botón **AirCI**.  
3. Al elegir AirCI → pide el **mismo código de 4 dígitos** (`nutriplant-access-pin`, scope p. ej. `airci` o reutilizar el de admin/planpro).  
4. Entra a `/airCI` (panel AirCI).

| Destino actual | Nuevo |
|----------------|-------|
| NutriPlant PRO (dashboard) | igual |
| Admin | igual |
| Plan PRO | igual |
| — | **AirCI** · Crop Intelligence · luego código 4 dígitos |

AirCI queda solo para el usuario admin (misma puerta). El **link de cliente** es aparte (solo lectura, sin este login).

---

## 6. Acceso, ruta y producto (cerrado)

| Decisión | Acuerdo |
|----------|---------|
| URL | `/airCI` (redirect Netlify → p. ej. `admin/airci.html`) |
| Visibilidad | Solo admin: login + modal destino + PIN 4 dígitos (como Admin / Plan PRO) |
| Menú | Panel admin / herramientas internas — no sidebar de usuarios |
| Ligado a proyecto NutriPlant | **No.** Predio AirCI independiente |
| Relación opcional | Solo campo texto **Apunte / nota / título** para recordar vínculo mental con algún proyecto (sin FK) |
| Relación con Radar | Complementario: Radar = satélite NDVI; AirCI = dron RGB + copas / fenología |

### Metadatos del predio AirCI (visibles y editables en el panel)

Campos de cabecera del análisis — se ven en la vista y se editan **inline** (cambiar el texto ahí mismo, sin modal obligatorio):

| Campo | Ejemplo |
|-------|---------|
| Título / apunte | “Huerta norte — vuelo mayo” (opcional: mencionar proyecto NutriPlant a mano) |
| Agrícola / productor | Nombre del agrícola |
| Predio o sector | “Bloque 3 / Sector A” |
| Cultivo | Aguacate, mango, etc. |
| Variedad | Hass, etc. |
| Edad | Años o texto libre (“8 años”) |
| Nota / comentario | Observaciones libres |

---

## 6.5 Ortomosaico fuera de NutriPlant (cerrado)

El mosaico **no** se genera dentro de NutriPlant. Flujo: fotos del dron → software en la Mac → GeoTIFF (u orto exportado) → subir a AirCI.

### Recomendación para Mac Apple Silicon (M5 / M-series): **WebODM**

| Criterio | WebODM |
|----------|--------|
| Precio | **Gratis** local ([webodm.org/download](https://webodm.org/download/)) |
| Mac Apple Silicon | Soportado oficialmente (rápido en M-series) |
| Instalación | Installer macOS (gestiona Docker) |
| Salida útil para AirCI | Ortomosaico georreferenciado (GeoTIFF / COG según export) |
| RAM sugerida | Ideal ≥16 GB; con 8 GB solo vuelos chicos (~&lt;100 fotos) |
| Disco | ≥20 GB libres (mejor ~100 GB si vuelas mucho) |

**Alternativas (no preferidas para arrancar):**

- **Pix4D / DJI Terra:** más pulidos, pero de pago o trial.
- **ODM CLI solo:** más técnico; WebODM ya envuelve el motor.

**Formato preferido a aceptar en AirCI (F1):** GeoTIFF georreferenciado (ideal COG). PNG + world file como respaldo si hace falta.

---

## 7. Flujo de trabajo propuesto (alto nivel)

```text
Vuelo dron RGB
    → Ortomosaico en Mac con WebODM (fuera de NutriPlant)
    → Subir GeoTIFF a AirCI + metadatos del predio (editables inline)
    → Segmentación de copas (excluir suelo/pasto/sombras/objetos)
    → Métricas por árbol + estadísticas de huerta
    → Clasificación fenológica + coloración
    → Capas en mapa + fichas
    → (Opcional) Comparar con vuelo anterior (mismo ID)
    → Exportar + interpretación IA admin
```

---

## 8. Modelo de datos (borrador — por definir en SQL)

Tablas tentativas (nombres a cerrar). **Sin `project_id` obligatorio.**

| Tabla | Contenido |
|-------|-----------|
| `airci_sites` | Metadatos: título/apunte, agrícola, predio/sector, cultivo, variedad, edad, nota |
| `airci_flights` | `site_id`, fecha vuelo, URL ortomosaico, CRS, GSD (m/px), superficie ha |
| `airci_trees` | `tree_id` permanente por site, centro lat/lon, flags (completo / cortado) |
| `airci_tree_observations` | por vuelo × árbol: área, diámetros, fenología %, color, confianza, Z, etc. |
| `airci_layers` / storage | rasters o GeoJSON de capas |
| `airci_share_links` | token, `site_id` / `flight_id`, expiración opcional, solo lectura |

**Sí: sección nueva en Supabase** para AirCI (tablas `airci_*` + bucket Storage para ortomosaicos/GeoJSON), aislada de proyectos NutriPlant.

IDs permanentes: `tree_id` estable en el site; matching entre vuelos por proximidad del centro + polígono.

---

## 9. Fases sugeridas

| Fase | Qué incluye | Prioridad |
|------|-------------|-----------|
| **F0** | Shell `/airCI`: header agroclimate-style + logos + metadatos inline + cards placeholder + acceso admin | ✅ Hecho (2026-08-06) |
| **F1** | Subida GeoTIFF (WebODM) + storage + visor mapa Leaflet | ✅ Hecho (2026-08-06) |
| **F2** | Detección de copas + IDs + métricas tamaño + resumen predio | Alta |
| **F3** | Estadística completa + histograma/boxplot + export CSV/GeoJSON | Alta |
| **F4** | Capas mapa + ficha por árbol | Alta |
| **F5** | Fenología + coloración (con regla del 100% y disclaimer) | Media |
| **F6** | Comparación entre vuelos + gráficas históricas | Media |
| **F7** | PDF/Excel + interpretación con IA admin | Media |
| **F8** | Refinar exclusiones (pasto, sombra, vehículos…) y confianza | Continuo |

### Cómo arrancamos (acuerdo)

1. Cerrar este doc (hecho en parte).  
2. **Implementar F0** calcando `admin/agroclimate.html`: banda + logos + campos editables + cards vacías de métricas.  
3. Tú instalas **WebODM** en la Mac y generas el primer GeoTIFF de prueba.  
4. Luego F1: subir ese orto y verlo en el mapa.

---

## 10. Decisiones

### Cerradas (2026-08-06)

| # | Tema | Acuerdo |
|---|------|---------|
| 1 | Ortomosaico | Fuera de NutriPlant; recomendado **WebODM** gratis en Mac Apple Silicon |
| 2 | Ligado a proyecto | **No**; solo apunte/nota/título + metadatos (agrícola, predio/sector, cultivo, variedad, edad, nota) editables inline |
| 3 | Look del panel | Fondo claro + **banda superior** tipo agroclimate; izq. logo AirCI, der. logo NutriPlant PRO |
| 4 | Arranque | Empezar por **F0** (shell visual + metadatos), luego F1 con GeoTIFF |
| 5 | Auth | Login admin → modal destino (+ botón AirCI) → **mismos 4 dígitos** |
| 6 | Entrega cliente | **PDF + link** solo lectura |
| 7 | Storage GeoTIFF | **Supabase Storage** bucket `airci-orthos` (`supabase-airci.sql`) |

### Siguen abiertas (no bloquean F1)

1. **¿“Coloración atípica” entra en el 100% fenológico o es métrica paralela?**
2. **¿Umbrales pequeña/media/grande: fijos por cultivo o percentiles del lote?**
3. **¿Matching de IDs entre vuelos: solo distancia al centro, o registro geométrico del mosaico?**
4. **PIN: ¿mismo scope que admin/planpro o scope `airci` con el mismo código?** → **Hecho:** scope `airci` usa `ADMIN_ACCESS_PIN`
---

## 11. Criterios de éxito (MVP interno)

- Entrar a `/airCI` solo como admin y ver branding AirCI + NutriPlant PRO.  
- Subir un ortomosaico de prueba y ver el mapa.  
- Obtener lista de árboles con ID, área y capa de cobertura.  
- Ver resumen tipo el ejemplo de la §4 (aunque sea en px).  
- Exportar CSV y GeoJSON.  
- Poder pedirle a Terra/Socio un comentario sobre el resumen **sin** que invente diagnósticos por color.

---

## 12. Notas de branding / tipografía

- Marca: **AirCI** (A mayúscula, ir minúsculas, CI mayúsculas).  
- Subtítulo: Crop Intelligence  
- Firma: by NutriPlant PRO  
- Logo en assets ya disponible; preferir variantes transparentes sobre el fondo del panel.  
- Corregir a futuro el nombre de archivo `AirCL_*.png` → `AirCI_*` si se renombra (evitar confusión I/L).

---

*Documento vivo: actualizar cuando cerremos decisiones de las §10 y al avanzar fases.*
