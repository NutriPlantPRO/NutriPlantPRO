/**
 * NutriPlant — UI compartida para agua, suelo y clima.
 * El DOM puede mostrar unidades elegidas; todos los valores expuestos por read()
 * y guardados por snapshot() permanecen en SI agronómico.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root || {});
  if (root) root.NpWaterClimateUI = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function (w) {
  'use strict';

  var fieldKinds = {};
  var canonicalValues = {};
  var lastUnitSystem = 'metric';
  var textOriginals = typeof WeakMap === 'function' ? new WeakMap() : null;
  var attrOriginals = typeof WeakMap === 'function' ? new WeakMap() : null;
  var observer = null;
  var refreshCallback = null;
  var unitSystemOverride = null;

  var definitions = {
    water_depth: { canonical: 'mm', metric: 'mm', us_customary: 'in' },
    volume_area: { canonical: 'm3/ha', metric: 'm3/ha', us_customary: 'US gal/acre' },
    temperature: { canonical: 'C', metric: 'C', us_customary: 'F' },
    temperature_delta: { canonical: 'deltaC', metric: 'deltaC', us_customary: 'deltaF' },
    depth: { canonical: 'cm', metric: 'cm', us_customary: 'in' },
    bulk_density: { canonical: 'g/cm3', metric: 'g/cm3', us_customary: 'lb/ft3' },
    area: { canonical: 'ha', metric: 'ha', us_customary: 'acre' },
    volume: { canonical: 'm3', metric: 'm3', us_customary: 'US gal' },
    speed: { canonical: 'km/h', metric: 'km/h', us_customary: 'mph' },
    acid_dose_volume_volume: {
      canonical: 'mL/m3',
      metric: 'mL/m3',
      us_customary: 'US fl oz/1000 US gal'
    }
  };

  var phrases = {
    'Lámina de riego y balance hídrico': 'Irrigation depth and water balance',
    'Agua en suelo y textura': 'Soil water and texture',
    'Estimador de déficit de presión de vapor': 'Vapor pressure deficit estimator',
    'Diagnóstico de agua y acondicionamiento': 'Water diagnosis and conditioning',
    'Ubicación del predio': 'Field location',
    'Clima en un punto (mapa o GPS)': 'Weather at a point (map or GPS)',
    'Mi ubicación': 'My location',
    'Obtener clima y calcular VPD': 'Get weather and calculate VPD',
    'Obtener clima y calcular': 'Get weather and calculate',
    'Latitud': 'Latitude',
    'Longitud': 'Longitude',
    'Unidad:': 'Unit:',
    'Periodo:': 'Period:',
    '1 día': '1 day',
    '7 días': '7 days',
    '30 días': '30 days',
    'Calculadora (1 o 7 días)': 'Calculator (1 or 7 days)',
    'Mis valores de agua (opcional)': 'My water values (optional)',
    'Usar mi ETo del periodo': 'Use my period ETo',
    'Usar mi lluvia': 'Use my rainfall',
    'Macrotúnel (lluvia = 0)': 'High tunnel (rainfall = 0)',
    'Acumulado del periodo': 'Period total',
    'Cultivo (opcional)': 'Crop (optional)',
    'Kc (editable)': 'Kc (editable)',
    'Sin precargar': 'No preset',
    'Riego en franja regada (periodo)': 'Irrigation in wetted strip (period)',
    'Volumen en franja': 'Strip volume',
    'Superficie del cultivo': 'Crop area',
    'Superficie regada': 'Irrigated area',
    'Franja humedecida': 'Wetted strip',
    'Raíces en superficie (% del área)': 'Surface root coverage (% of area)',
    'Sugerir franja regada': 'Suggest irrigated strip',
    'Referencia almacén suelo': 'Soil water storage reference',
    'Estimador ambiental simple': 'Simple environmental estimator',
    'Estimador avanzado': 'Advanced estimator',
    'Temperatura del Aire': 'Air Temperature',
    'Temperatura de Hoja': 'Leaf Temperature',
    'Humedad Relativa': 'Relative Humidity',
    'Modo de Cálculo:': 'Calculation Mode:',
    'Radiación Solar': 'Solar Radiation',
    'Calcular Déficit de Presión de Vapor': 'Calculate Vapor Pressure Deficit',
    'Calcular VPD': 'Calculate VPD',
    'Limpiar valores': 'Clear values',
    'Resultados:': 'Results:',
    'Déficit de Presión de Vapor': 'Vapor Pressure Deficit',
    'Déficit de Humedad': 'Humidity Deficit',
    'Rango Óptimo': 'Optimal Range',
    'Estado': 'Status',
    'Agua en suelo': 'Soil water',
    'Triángulo de textura': 'Soil texture triangle',
    'Cálculo y barra volumétrica': 'Calculation and volumetric bar',
    'Cargar valores de referencia': 'Load reference values',
    'Tus valores para el cálculo': 'Your calculation values',
    'Capacidad de campo': 'Field capacity',
    'Punto de marchitez': 'Wilting point',
    'Profundidad de suelo': 'Soil depth',
    'Área': 'Area',
    '% suelo explorado — superficie (franja)': '% explored soil — surface (strip)',
    'Humedad actual del suelo': 'Current soil moisture',
    'Resultados (actualizado al cambiar valores)': 'Results (updated when values change)',
    'Ayuda visual: saturación · CC · PMP': 'Visual guide: saturation · FC · PWP',
    'Punto de saturación': 'Saturation point',
    'Marchitez permanente': 'Permanent wilting point',
    'Todo el poro con agua': 'All pore space filled with water',
    'Arena': 'Sand',
    'Limo': 'Silt',
    'Arcilla': 'Clay',
    'Normalizar a 100%': 'Normalize to 100%',
    'Tamaño de partículas': 'Particle size',
    'Partícula': 'Particle',
    'Diámetro': 'Diameter',
    'Clasificación y valores de referencia': 'Classification and reference values',
    'Clasificación': 'Classification',
    'Blanda': 'Soft',
    'Moderadamente dura': 'Moderately hard',
    'Muy dura': 'Very hard',
    'Dura': 'Hard',
    'Dureza del agua (conversiones y rango)': 'Water hardness (conversions and range)',
    'Dureza por Ca + Mg': 'Hardness from Ca + Mg',
    'Dureza como CaCO₃': 'Hardness as CaCO₃',
    'Dureza total como CaCO₃ (resultado)': 'Total hardness as CaCO₃ (result)',
    'Calcio': 'Calcium',
    'Magnesio': 'Magnesium',
    'Ácido para neutralizar HCO₃⁻ y CO₃²⁻ (con colchón)': 'Acid to neutralize HCO₃⁻ and CO₃²⁻ (with residual buffer)',
    'Residual objetivo': 'Target residual',
    'Volumen de preparación': 'Preparation volume',
    'Ácido': 'Acid',
    'Ácido Nítrico': 'Nitric Acid',
    'Ácido Nítrico 55%': 'Nitric Acid 55%',
    'Ácido Sulfúrico': 'Sulfuric Acid',
    'Ácido Sulfúrico 98%': 'Sulfuric Acid 98%',
    'Ácido Fosfórico': 'Phosphoric Acid',
    'Ácido Fosfórico 75%': 'Phosphoric Acid 75%',
    'Ácido Fosfórico 85%': 'Phosphoric Acid 85%',
    'Resultado con': 'Result with',
    'Dosis': 'Dose',
    'Volumen usado': 'Volume used',
    'Equivale a': 'Equivalent to',
    'solo referencia': 'reference only',
    'Referencia técnica': 'Technical reference',
    'Foco técnico:': 'Technical focus:',
    'valida en campo': 'validate in the field',
    'validar en campo': 'validate in the field',
    'Ubicación aplicada.': 'Location set.',
    'Consultando clima': 'Fetching weather',
    'Clima cargado.': 'Weather loaded.',
    'No se pudo obtener clima.': 'Weather could not be fetched.',
    'No se pudo leer GPS.': 'GPS could not be read.',
    'Obteniendo ubicación': 'Getting location',
    'día': 'day',
    'días': 'days',
    'superávit': 'surplus',
    'déficit': 'deficit',
    'Lluvia activa': 'Active rainfall',
    'ETo activa': 'Active ETo',
    'campo': 'field',
    'satélite': 'satellite',
    'Volumen total aplicado en la zona humedecida (1 o 7 días). Indica Superficie regada para el balance; la app calcula la lámina en mm en los resultados.': 'Total volume applied in the wetted zone (1 or 7 days). Enter Irrigated area for the balance; the app calculates depth in mm in the results.',
    'Área total del cultivo (ETc / m³).': 'Total crop area (ETc / m³).',
    'Zona humedecida (goteo/macrotúnel). Vacío = misma que cultivo.': 'Wetted zone (drip/high tunnel). Empty = same as crop.',
    'Fracción del área del cultivo con raíces activas. No es profundidad — sirve para sugerir franja regada.': 'Fraction of crop area with active roots. Not depth — used to suggest irrigated strip.',
    'Mapa, GPS o escribe lat/lng. Luego obtén clima para cargar ETo y lluvia del periodo.': 'Map, GPS, or enter lat/lng. Then fetch weather to load period ETo and rainfall.',
    'Indica latitud y longitud o elige un punto en el mapa.': 'Enter latitude and longitude or pick a point on the map.',
    'Indica % raíces en superficie (10–100).': 'Enter surface root coverage (10–100).',
    'No se pudo obtener el clima en ese punto. Revisa la conexión o las coordenadas.': 'Weather could not be fetched at that point. Check the connection or coordinates.',
    'abrir herramienta en página completa': 'open the tool in a full page',
    'Datos de 🪨 suelo actualizados en otra pestaña. Pulsa Sugerir hasta 60% AU o hasta CC si quieres prellenar.': '🪨 Soil data updated in another tab. Press Suggest to 60% AW or to FC if you want to prefill.',
    'periodo seleccionado': 'selected period',
    'Valores manuales = acumulado de esos mismos días.': 'Manual values = total for those same days.',
    'información meteorológica con respaldo satelital': 'weather information with satellite support',
    'Ej. limón, aguacate…': 'e.g. lemon, avocado…',
    'Eliminar esta lectura': 'Delete this reading',
    'Eliminar cuadro guardado': 'Delete saved panel',
    'Prellena m³ hasta 60% agua útil (tope zona objetivo)': 'Prefills m³ up to 60% available water (target zone cap)',
    'Prellena m³ hasta capacidad de campo (CC)': 'Prefills m³ up to field capacity (FC)',
    'Volumen en m³ en la franja regada': 'Volume in m³ in the irrigated strip',
    'Referencia práctica NutriPlant PRO:': 'NutriPlant PRO practical reference:',
    'capacidad útil CC − PMP': 'available water FC − PWP',
    'por hectárea (no es tu humedad hoy si ya ingresaste medición), lámina hasta CC según humedad actual, y': 'per hectare (not today’s moisture if you already entered a reading), depth to FC from current moisture, and',
    '% de superficie explorada': '% explored surface',
    '(franja regada — mismo criterio que balance hídrico); triángulo textual USDA en español.': '(wetted strip — same criterion as water balance); USDA texture triangle text in Spanish.',
    'Puedes usar el desplegable para': 'You can use the dropdown to',
    'cargar una vez': 'load once',
    'CC y PMP ilustrativos según textura típica; al elegir una fila se rellenan los campos y el menú vuelve solo (así, si luego editas los números, no parece que sigas en esa textura). También puedes escribir CC y PMP a mano. La': 'illustrative FC and PWP for a typical texture; choosing a row fills the fields and the menu resets (so if you edit numbers later, it does not look stuck on that texture). You can also type FC and PWP by hand. The',
    'humedad actual volumétrica': 'current volumetric moisture',
    '(misma escala que CC/PMP) permite estimar la': '(same scale as FC/PWP) lets you estimate the',
    'lámina a reponer hasta CC': 'depth to refill to FC',
    'y verla en la barra.': 'and see it on the bar.',
    'Cargar valores de referencia (CC / PMP)': 'Load reference values (FC / PWP)',
    'El % suelo explorado es la fracción del': '% explored soil is the fraction of the',
    'área del cultivo': 'crop area',
    'con raíces activas o zona humedecida (goteo, surco).': 'with active roots or wetted zone (drip, furrow).',
    'No es profundidad.': 'It is not depth.',
    'Mismo criterio que «franja regada» en 🌧️ balance hídrico: los': 'Same criterion as the «wetted strip» in 🌧️ water balance: the',
    'se reparten solo en esa superficie; los': 'are allocated only to that surface; the',
    'mm en franja': 'mm in strip',
    'son la lámina física en el suelo humedecido.': 'are the physical depth in the wetted soil.',
    'Este bloque muestra cuánto almacén “útil entre PMP y CC” tienes como referencia de capacidad': 'This block shows how much “useful storage between PWP and FC” you have as a capacity reference',
    'con humedad actual se calculan aparte el déficit y la lámina hasta CC. Si el % explorado es': 'with current moisture, deficit and depth to FC are calculated separately. If explored % is',
    'verás mm en franja regada (para regar) y la referencia sobre ha cultivo completa.': 'you will see mm in the irrigated strip (for irrigation) and the reference over the full crop ha.',
    'Barras horizontales: la escala muestra tus': 'Horizontal bars: the scale shows your',
    'como proporción del volumen de poros (% vol.). Entre ambos aparece la': 'as a proportion of pore volume (% vol.). Between them appears the',
    'banda típica de agua útil': 'typical available-water band',
    'violeta marca la': 'violet band marks the',
    'zona objetivo de riego (40–60% del agua útil)': 'irrigation target zone (40–60% of available water)',
    'referencia NutriPlant para no regar siempre hasta CC. Si indicas': 'NutriPlant reference so you do not always irrigate to FC. If you enter',
    'humedad actual (% vol.)': 'current moisture (% vol.)',
    'el tramo verde claro muestra cuánto faltaría hasta CC; la': 'the light-green segment shows how much is left to FC; the',
    'línea ámbar': 'amber line',
    'es tu valor en el eje. Abajo verás también la lámina hasta': 'is your value on the axis. Below you will also see depth to',
    'nivel objetivo': 'target level',
    'cuando aplique.': 'when applicable.',
    'Introduce arena, limo y arcilla (%) o': 'Enter sand, silt and clay (%) or',
    'arrastra el punto': 'drag the point',
    'dentro del triángulo; los tres campos, la textura y un': 'inside the triangle; the three fields, texture and a',
    'rango típico de CC y PMP': 'typical FC and PWP range',
    'aparecen en el recuadro verde. Idealmente deben sumar 100%. Las zonas de color reproducen límites oficiales USDA (soiltexture CRAN).': 'appear in the green box. Ideally they sum to 100%. Color zones follow official USDA limits (soiltexture CRAN).',
    'Línea de arena (constante arena)': 'Sand line (constant sand)',
    'Línea de limo (constante limo)': 'Silt line (constant silt)',
    'Línea de arcilla (constante arcilla)': 'Clay line (constant clay)',
    'NutriPlant PRO — material educativo. Los valores típicos de CC y PMP varían con estructura, materia orgánica y método de medición; el triángulo de texturas sigue polígonos USDA estándar (referencia Soil Survey Manual / soiltexture). Combine con laboratorio y criterio local.': 'NutriPlant PRO — educational material. Typical FC and PWP values vary with structure, organic matter and measurement method; the texture triangle follows standard USDA polygons (Soil Survey Manual / soiltexture). Combine with lab data and local judgment.',
    'Cálculo y barra volumétrica (CC · PMP · capacidad útil CC − PMP)': 'Calculation and volumetric bar (FC · PWP · available water FC − PWP)',
    'Triángulo de textura (USDA)': 'Soil texture triangle (USDA)',
    '1 · Agua en suelo': '1 · Soil water',
    '2 · Triángulo de textura': '2 · Texture triangle',
    'Potencial de agua útil': 'Available water potential',
    'Lámina hasta CC': 'Depth to FC',
    'Lámina hasta objetivo': 'Depth to target',
    'Déficit hasta CC': 'Deficit to FC',
    'Volumen de suelo': 'Soil volume',
    'Volumen de ese potencial': 'Volume of that potential',
    '✓ Suelo cerca de CC': '✓ Soil near FC',
    '40–60% agua útil': '40–60% available water',
    'Referencia ilustrativa (varía con MO, compactación y método). En «Agua en suelo» puedes cargar un valor puntual desde el desplegable.': 'Illustrative reference (varies with OM, compaction and method). In «Soil water» you can load a point value from the dropdown.',
    'Fracción del área del cultivo con raíces activas o zona humedecida': 'Fraction of crop area with active roots or wetted zone',
    'Ej. 60 = 60% del área (franja regada); no es profundidad': 'e.g. 60 = 60% of area (wetted strip); not depth',
    'Referencia de tamaño de partículas': 'Particle size reference',
    '% volumétrico de referencia': 'reference volumetric %',
    'Foco técnico: el VPD aquí es ambiental': 'Technical focus: VPD here is environmental',
    '(aire a escala meteorológica). Si usas el mapa, NutriPlant toma en ese punto temperatura, humedad y radiación a partir de': '(air at meteorological scale). If you use the map, NutriPlant takes temperature, humidity and radiation at that point from',
    '; en el cultivo el microclima puede variar con el': '; in the crop the microclimate can vary with',
    'área foliar': 'leaf area',
    ', el dosel o la ventilación. La T': ', canopy or ventilation. Leaf T',
    'hoja manual o estimada por radiación es orientativa —': 'entered manually or estimated from radiation is indicative —',
    'La temperatura de hoja se calculará automáticamente': 'Leaf temperature will be calculated automatically',
    'Ambiente húmedo / baja demanda evaporativa': 'Humid environment / low evaporative demand',
    'Transpiración activa; vigilar cultivo sensible': 'Active transpiration; watch sensitive crops',
    'VPD con radiación solar': 'VPD with solar radiation',
    'Radiación solar': 'Solar radiation',
    'Índice UV': 'UV Index',
    '⚠️ Coordenadas fuera de rango.': '⚠️ Coordinates out of range.',
    '⚠️ Por favor ingresa la radiación solar': '⚠️ Please enter solar radiation',
    '⚠️ Por favor ingresa la temperatura de hoja': '⚠️ Please enter leaf temperature',
    '⚠️ La humedad relativa debe estar entre 0 y 100%': '⚠️ Relative humidity must be between 0 and 100%',
    '⚠️ Indica latitud y longitud válidas o usa el mapa.': '⚠️ Enter valid latitude and longitude or use the map.',
    '⚠️ Por favor ingresa temperatura del aire y humedad relativa': '⚠️ Please enter air temperature and relative humidity',
    'Error al obtener clima. Intenta de nuevo.': 'Could not fetch weather. Try again.',
    'No se pudieron obtener datos del clima. Revisa tu conexión.': 'Weather data could not be obtained. Check your connection.',
    'No se pudo leer el GPS. Prueba seleccionando un punto en el mapa.': 'GPS could not be read. Try selecting a point on the map.',
    'Sin dato útil de radiación en esta respuesta — VPD simple (solo T y HR). Punto:': 'No usable radiation in this response — simple VPD (T and RH only). Point:',
    'Elige un punto en el mapa o usa tu ubicación. NutriPlant obtiene la temperatura, humedad y radiación solar actuales en ese punto': 'Pick a point on the map or use your location. NutriPlant gets current temperature, humidity and solar radiation at that point',
    'Herramienta independiente:': 'Standalone tool:',
    'conversión y tiras o método sencillo': 'conversion and strips or simple method',
    'dureza desde Ca y Mg de laboratorio': 'hardness from lab Ca + Mg',
    'dosis de ácido con colchón (residual objetivo)': 'acid dose with buffer (target residual)',
    'Criterio en mg/L o ppm (CaCO₃)': 'Criterion in mg/L or ppm (CaCO₃)',
    'equivalencias aproximadas': 'approximate equivalents',
    'Referencia habitual': 'Common reference',
    'Para contrastar, usa el CaCO₃ del informe; meq/° redondeados a 2 dec.': 'To cross-check, use CaCO₃ from the report; meq/° rounded to 2 decimals.',
    'Escribe en cualquier casilla: las demás se actualizan al vuelo; al salir se redondea. Empieza vacío hasta que tú ingreses datos.': 'Type in any box: the others update live; values round when you leave the field. Starts empty until you enter data.',
    'Para quien trae análisis de laboratorio. Elige en cada renglón si el valor de Ca o Mg está en': 'For lab analysis results. On each row choose whether Ca or Mg is in',
    'al salir de la casilla se redondea.': 'values round when you leave the field.',
    'Meq de ácido por litro de agua': 'Meq of acid per liter of water',
    'igual que en Análisis de agua. El volumen de preparación': 'same as in Water analysis. Preparation volume',
    'puede capturarse en L o m³ según tu tanque, calda o volumen a acidificar. Si el resultado es negativo, se toma como 0.': 'can be entered in L or m³ for your tank, spray mix or volume to acidify. If the result is negative, it is taken as 0.',
    'Equivale a — m³ de agua (solo referencia).': 'Equivalent to — m³ of water (reference only).',
    'Unidad de calcio': 'Calcium unit',
    'Unidad de magnesio': 'Magnesium unit',
    'Unidad del volumen de preparación': 'Preparation volume unit',
    'Lectura rápida:': 'Quick reading:',
    '°dH (alemán)': '°dH (German)',
    '°fH (francés)': '°fH (French)',
    '°e (inglés, Clark°)': '°e (English, Clark°)',
    'Introduce dureza en cualquier unidad (ppm, meq/L, °dH, °e, °fH).': 'Enter hardness in any unit (ppm, meq/L, °dH, °e, °fH).',
    'Introduce al menos un valor (Ca o Mg) del análisis.': 'Enter at least one value (Ca or Mg) from the analysis.',
    'El cálculo es estimado según tus datos de entrada': 'The calculation is estimated from your inputs',
    'Usa EPP y buenas prácticas al manipular ácidos.': 'Use PPE and good practices when handling acids.',
    'Suma de las contribuciones de Ca y Mg a equivalente CaCO₃': 'Sum of Ca and Mg contributions as CaCO₃ equivalent',
    'Tip de aplicación foliar: prioriza compatibilidad del producto y rango de pH recomendado en etiqueta. Esta herramienta orienta, no reemplaza prueba de mezcla.': 'Foliar tip: prioritize product compatibility and label pH range. This tool guides; it does not replace a jar test.',
    'Referencia técnica: no neutralizar al 100% por defecto. Ajusta con colchón (residual objetivo) y valida pH final de la solución.': 'Technical reference: do not neutralize 100% by default. Adjust with a buffer (target residual) and validate final solution pH.',
    'Mg: no indicado (0 en la suma).': 'Mg: not entered (0 in the sum).',
    'Lluvia/Riego': 'Rain/Irrigation',
    'Tiempo actual': 'Current weather',
    'Lluvia acumulada y ET₀': 'Accumulated rainfall and ET₀',
    'Tabla · Lluvia y ET₀': 'Table · Rainfall and ET₀',
    'Gráficas · Lluvia y ET₀': 'Charts · Rainfall and ET₀',
    'Obtener lluvia y ET₀': 'Get rainfall and ET₀',
    'Obtener lectura': 'Get reading',
    'Tiempo actual en el predio': 'Current weather at the field',
    'Calculadora de balance hídrico': 'Water balance calculator',
    'Satélite, valores de campo (ETo, pluviómetro, riego) o ambos. Calcula déficit y balance en mm y m³/ha.': 'Satellite, field values (ETo, rain gauge, irrigation) or both. Calculates deficit and balance in mm and m³/ha.',
    'Agrega un polígono en': 'Add a polygon in',
    'para consultar lluvia y ET₀.': 'to query rainfall and ET₀.',
    'Agrega un polígono en <strong>Ubicación</strong> para consultar lluvia y ET₀.': 'Add a polygon in <strong>Location</strong> to query rainfall and ET₀.',
    'Agrega un polígono en <strong>Ubicación</strong>.': 'Add a polygon in <strong>Location</strong>.',
    'Pestaña lluvia no disponible.': 'Rainfall tab unavailable.',
    'Pestaña tiempo actual no disponible.': 'Current weather tab unavailable.',
    'centro del polígono': 'polygon center',
    'Hasta': 'Up to',
    'años.': 'years.',
    'Lectura en el punto': 'Reading at point',
    'Obtener del Clima': 'Get from Weather',
    'Guardar Cálculo': 'Save Calculation',
    'Serie VPD por Rango (diario / semanal / mensual)': 'VPD Series by Range (daily / weekly / monthly)',
    'Fuente geográfica:': 'Geographic source:',
    'centro del polígono del proyecto': 'project polygon center',
    'Fechas y horas del clima: zona horaria local del punto indicado arriba (latitud y longitud del centro del polígono).': 'Weather dates and times: local time zone of the point above (latitude and longitude of the polygon center).',
    'Ubicación del Proyecto:': 'Project Location:',
    'Para usar esta calculadora, primero necesitas agregar un polígono desde la pestaña': 'To use this calculator, first add a polygon from the',
    'Vista': 'View',
    'Diario': 'Daily',
    'Semanal': 'Weekly',
    'Mensual': 'Monthly',
    'Fecha inicio': 'Start date',
    'Fecha fin': 'End date',
    'Descargar serie': 'Download series',
    'Guardar cuadro en proyecto': 'Save table to project',
    'Historial de Cálculos': 'Calculation History',
    'Ambiental': 'Environmental',
    'Avanzado': 'Advanced',
    'Ajuste manual:': 'Manual adjustment:',
    'VPD con radiación solar:': 'VPD with solar radiation:',
    'la radiación (W/m²) proviene de estimaciones con información satelital en el predio. NutriPlant estima la temperatura de hoja a partir de esa radiación y calcula el VPD con el modelo avanzado (presión de saturación a T': 'radiation (W/m²) comes from satellite-based estimates at the field. NutriPlant estimates leaf temperature from that radiation and calculates VPD with the advanced model (saturation pressure at T',
    'Radiación solar (global)': 'Solar radiation (global)',
    'Cuadros guardados': 'Saved tables',
    'Periodo': 'Period',
    'Horas óptimas': 'Optimal hours',
    'temperatura, humedad, lluvia, ET₀ y viento son': 'temperature, humidity, rainfall, ET₀ and wind are',
    'estimaciones': 'estimates',
    'basadas en': 'based on',
    'información obtenida por satélite': 'satellite-derived information',
    'en el punto del predio. Pueden diferir del microclima en el cultivo o de mediciones en campo.': 'at the field point. They may differ from crop microclimate or on-site measurements.',
    'Puedes usar': 'You can use',
    'tus valores de campo': 'your field values',
    'para datos satelitales.': 'for satellite data.',
    'Mis valores de agua (calculadora)': 'My water values (calculator)',
    'ETo, lluvia y riego son acumulados del periodo seleccionado (1, 7 o 30 días).': 'ETo, rainfall and irrigation are totals for the selected period (1, 7 or 30 days).',
    'ETo activa': 'Active ETo',
    'Lluvia fijada en 0 (macrotúnel)': 'Rainfall fixed at 0 (high tunnel)',
    'Actualiza ETo, lluvia y riego': 'Update ETo, rainfall and irrigation',
    'al acumulado de': 'to the total for',
    'Macrotúnel / invernadero (sin lluvia → 0 mm)': 'High tunnel / greenhouse (no rain → 0 mm)',
    'Usar mi lluvia (pluviómetro,': 'Use my rainfall (rain gauge,',
    'Ej. Limón, aguacate…': 'E.g. Lemon, avocado…',
    'Sin valor precargado': 'No preset value',
    'Consulta la tabla Kc FAO-56 abajo.': 'See the FAO-56 Kc table below.',
    'Volumen en franja (m³)': 'Strip volume (m³)',
    'Volumen total aplicado en la': 'Total volume applied in the',
    'zona humedecida': 'wetted zone',
    'del periodo. Indica': 'for the period. Enter',
    'la lámina en mm aparece en los resultados.': 'depth in mm appears in the results.',
    'Área donde está el cultivo (demanda ETc / m³ total).': 'Area where the crop is (ETc demand / total m³).',
    'Vacío = ha del predio': 'Empty = field ha',
    'Franja humedecida (goteo)': 'Wetted strip (drip)',
    'Zona humedecida (goteo/macrotúnel). Vacío = misma que cultivo.': 'Wetted zone (drip/high tunnel). Empty = same as crop.',
    'Referencia almacén suelo (Agua en suelo y textura)': 'Soil water storage reference (Soil water and texture)',
    'Fracción del': 'Fraction of the',
    'área del cultivo': 'crop area',
    'con raíces activas / riego localizado.': 'with active roots / localized irrigation.',
    'No es profundidad': 'It is not depth',
    'del suelo — aquí sirve para sugerir la franja regada.': 'of the soil — here it is used to suggest the irrigated strip.',
    '10–100 (vacío = sin usar)': '10–100 (empty = unused)',
    'Usar % del análisis de suelo': 'Use % from soil analysis',
    'Análisis de suelo guardado:': 'Saved soil analysis:',
    '% raíces en superficie (mismo valor que Fertilidad).': '% surface roots (same value as Fertility).',
    'Si tienes análisis de suelo en el proyecto, el % puede cargarse desde ahí.': 'If you have a soil analysis in the project, the % can load from there.',
    'La lectura satelital de lluvia y ET₀ no está disponible en este momento. Intenta de nuevo más tarde; tus datos guardados se mantienen sin cambios.': 'Satellite rainfall and ET₀ reading is unavailable right now. Try again later; your saved data stays unchanged.',
    'Punto:': 'Point:',
    'Temperatura de Hoja Calculada:': 'Calculated Leaf Temperature:',
    'Satélite:': 'Satellite:',
    'Satélite: ': 'Satellite: ',
    '/día': '/day',
  };

  function prefs() {
    var p = w.NpPrefs && typeof w.NpPrefs.get === 'function' ? w.NpPrefs.get() : w.NP_PREFS_BOOTSTRAP;
    return {
      language: p && p.language === 'en' ? 'en' : 'es',
      unit_system: p && p.unit_system === 'us_customary' ? 'us_customary' : 'metric',
      locale: (p && p.locale) || (p && p.language === 'en' ? 'en-US' : 'es-MX')
    };
  }

  function unit(kind, system) {
    if (!definitions[kind]) throw new TypeError('Magnitud agua/clima no soportada: ' + kind);
    return definitions[kind][system || unitSystemOverride || prefs().unit_system];
  }

  function convert(value, from, to) {
    if (!w.NpUnits || typeof w.NpUnits.convert !== 'function') throw new Error('NpUnits no está disponible');
    return w.NpUnits.convert(Number(value), from, to);
  }

  function toSI(value, kind, system) {
    return convert(value, unit(kind, system), definitions[kind].canonical);
  }

  function fromSI(value, kind, system) {
    return convert(value, definitions[kind].canonical, unit(kind, system));
  }

  function number(value, digits, locale) {
    var n = Number(value);
    if (!Number.isFinite(n)) return '';
    try {
      return new Intl.NumberFormat(locale || prefs().locale, {
        maximumFractionDigits: digits == null ? 2 : digits,
        minimumFractionDigits: 0,
        useGrouping: false
      }).format(n);
    } catch (e) {
      return String(Math.round(n * Math.pow(10, digits || 0)) / Math.pow(10, digits || 0));
    }
  }

  function inputFromSI(value, kind, system) {
    return number(fromSI(value, kind, system), 4);
  }

  function resultFromSI(value, kind, digits, system) {
    var u = unit(kind, system);
    var symbol = w.NpUnits && w.NpUnits.units && w.NpUnits.units[u] ? w.NpUnits.units[u].symbol : u;
    return number(fromSI(value, kind, system), digits == null ? 2 : digits) + ' ' + symbol;
  }

  function read(target, kind) {
    var el = typeof target === 'string' && w.document ? w.document.getElementById(target) : target;
    if (!el || String(el.value).trim() === '') return null;
    var n = Number(String(el.value).replace(',', '.'));
    if (!Number.isFinite(n)) return null;
    var k = kind || fieldKinds[el.id] || el.getAttribute('data-np-unit-kind');
    var si = k ? toSI(n, k) : n;
    if (el.id && k) canonicalValues[el.id] = si;
    return si;
  }

  function write(target, valueSI, kind) {
    var el = typeof target === 'string' && w.document ? w.document.getElementById(target) : target;
    if (!el) return;
    var k = kind || fieldKinds[el.id] || el.getAttribute('data-np-unit-kind');
    if (el.id && k) canonicalValues[el.id] = Number(valueSI);
    el.value = k ? inputFromSI(valueSI, k) : valueSI;
  }

  function bindFields(map) {
    if (!w.document) return;
    Object.keys(map || {}).forEach(function (id) {
      var el = w.document.getElementById(id);
      if (!el) return;
      var kind = map[id];
      fieldKinds[id] = kind;
      el.setAttribute('data-np-unit-kind', kind);
      if (String(el.value).trim() !== '') {
        var initial = Number(String(el.value).replace(',', '.'));
        if (Number.isFinite(initial)) canonicalValues[id] = toSI(initial, kind, lastUnitSystem);
        write(el, canonicalValues[id], kind);
      }
      el.addEventListener('input', function () { read(el, kind); });
      el.addEventListener('change', function () { read(el, kind); });
    });
  }

  function refreshUnitLabels() {
    if (!w.document) return;
    Array.prototype.forEach.call(w.document.querySelectorAll('[data-np-unit-label]'), function (el) {
      var kind = el.getAttribute('data-np-unit-label');
      if (!definitions[kind]) return;
      var u = unit(kind);
      var symbol = w.NpUnits && w.NpUnits.units && w.NpUnits.units[u] ? w.NpUnits.units[u].symbol : u;
      el.textContent = symbol;
    });
  }

  function snapshot(ids) {
    var out = { __np_si: true };
    (ids || Object.keys(fieldKinds)).forEach(function (id) {
      var el = w.document && w.document.getElementById(id);
      if (!el) return;
      if (el.type === 'checkbox') out[id] = el.checked;
      else if (fieldKinds[id]) out[id] = String(el.value).trim() === '' ? '' : read(el, fieldKinds[id]);
      else out[id] = el.value;
    });
    return out;
  }

  function applySnapshot(data, ids) {
    if (!data || !w.document) return;
    (ids || Object.keys(data)).forEach(function (id) {
      var el = w.document.getElementById(id);
      if (!el || data[id] === undefined) return;
      if (el.type === 'checkbox') el.checked = !!data[id];
      else if (fieldKinds[id]) {
        var si = Number(data[id]);
        if (Number.isFinite(si)) write(el, si, fieldKinds[id]);
        else el.value = '';
      } else {
        el.value = data[id];
      }
    });
  }

  function translateString(input) {
    var output = String(input == null ? '' : input);
    if (prefs().language !== 'en') return output;
    Object.keys(phrases).sort(function (a, b) { return b.length - a.length; }).forEach(function (es) {
      output = output.split(es).join(phrases[es]);
    });
    return output;
  }

  function translateNode(node) {
    if (!node || !w.document) return;
    var lang = prefs().language;
    if (node.nodeType === 3) {
      if (!String(node.nodeValue || '').trim()) return;
      if (textOriginals && !textOriginals.has(node)) textOriginals.set(node, node.nodeValue);
      var original = textOriginals ? textOriginals.get(node) : node.nodeValue;
      node.nodeValue = lang === 'en' ? translateString(original) : original;
      return;
    }
    if (node.nodeType !== 1 && node.nodeType !== 9 && node.nodeType !== 11) return;
    if (node.nodeType === 1) {
      if (node.closest && node.closest('.notranslate,[translate="no"]')) return;
      var attrs = ['placeholder', 'title', 'aria-label'];
      if (attrOriginals && !attrOriginals.has(node)) attrOriginals.set(node, {});
      attrs.forEach(function (name) {
        if (!node.hasAttribute || !node.hasAttribute(name)) return;
        var bag = attrOriginals ? attrOriginals.get(node) : {};
        if (bag[name] === undefined) bag[name] = node.getAttribute(name);
        if (attrOriginals) attrOriginals.set(node, bag);
        node.setAttribute(name, lang === 'en' ? translateString(bag[name]) : bag[name]);
      });
    }
    var walker = w.document.createTreeWalker(node, 4);
    var current;
    while ((current = walker.nextNode())) translateNode(current);
  }

  function applyLanguage(root) {
    if (!w.document) return;
    w.document.documentElement.lang = prefs().language;
    translateNode(root || w.document);
    if (w.document.title) {
      if (!w.document.documentElement.getAttribute('data-np-title-es')) {
        w.document.documentElement.setAttribute('data-np-title-es', w.document.title);
      }
      var titleEs = w.document.documentElement.getAttribute('data-np-title-es');
      w.document.title = prefs().language === 'en' ? translateString(titleEs) : titleEs;
    }
  }

  function refreshUnits(nextSystem) {
    Object.keys(fieldKinds).forEach(function (id) {
      var el = w.document && w.document.getElementById(id);
      if (!el || String(el.value).trim() === '') return;
      if (canonicalValues[id] === undefined) {
        var old = Number(String(el.value).replace(',', '.'));
        if (Number.isFinite(old)) canonicalValues[id] = toSI(old, fieldKinds[id], lastUnitSystem);
      }
      if (canonicalValues[id] !== undefined) write(el, canonicalValues[id], fieldKinds[id]);
    });
    lastUnitSystem = nextSystem;
    refreshUnitLabels();
    if (typeof refreshCallback === 'function') refreshCallback();
  }

  function init(options) {
    options = options || {};
    lastUnitSystem = prefs().unit_system;
    refreshCallback = typeof options.refresh === 'function' ? options.refresh : null;
    bindFields(options.fields || {});
    refreshUnitLabels();
    applyLanguage();
    if (w.MutationObserver && w.document && !observer) {
      observer = new w.MutationObserver(function (records) {
        records.forEach(function (record) {
          Array.prototype.forEach.call(record.addedNodes || [], translateNode);
        });
      });
      observer.observe(w.document.documentElement, { childList: true, subtree: true });
    }
    if (w.addEventListener) {
      w.addEventListener('np:prefs-changed', function (event) {
        var next = event && event.detail && event.detail.prefs ? event.detail.prefs : prefs();
        if (next.unit_system !== lastUnitSystem) refreshUnits(next.unit_system);
        applyLanguage();
        if (w.NpI18n && typeof w.NpI18n.setLanguage === 'function') {
          w.NpI18n.setLanguage(next.language, { persist: false });
        }
      });
    }
    return api;
  }

  function t(es, en) {
    return prefs().language === 'en' ? (en || translateString(es)) : es;
  }

  function withUnitSystem(system, callback) {
    if (system !== 'metric' && system !== 'us_customary') {
      throw new TypeError('Sistema de unidades no soportado: ' + system);
    }
    var previous = unitSystemOverride;
    unitSystemOverride = system;
    try {
      return callback();
    } finally {
      unitSystemOverride = previous;
    }
  }

  var api = {
    definitions: definitions,
    technicalKinds: {
      ppm: true, mg_L: true, meq_L: true, ph: true, ec: true, kPa: true, percent: true
    },
    prefs: prefs,
    unit: unit,
    toSI: toSI,
    fromSI: fromSI,
    inputFromSI: inputFromSI,
    resultFromSI: resultFromSI,
    read: read,
    write: write,
    bindFields: bindFields,
    snapshot: snapshot,
    applySnapshot: applySnapshot,
    translateString: translateString,
    applyLanguage: applyLanguage,
    refreshUnitLabels: refreshUnitLabels,
    init: init,
    t: t,
    withUnitSystem: withUnitSystem
  };
  return api;
});
