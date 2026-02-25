# 🌡️ PROPUESTA: CALCULADORA DE DÉFICIT DE PRESIÓN DE VAPOR (VPD)

## 🎯 VISIÓN GENERAL

Implementar dos calculadoras de VPD basadas en el Excel de Autogrow Systems:
1. **Calculadora Ambiental Simple** (datos de API de clima)
2. **Calculadora Avanzada** (con temperatura de hoja o radiación solar)

---

## 📊 ESTRUCTURA DE DATOS PROPUESTA

### **Guardado por Proyecto (Igual que otras secciones)**

```javascript
project.vpdAnalysis = {
  // Calculadora Ambiental Simple
  environmental: {
    temperature: null,        // °C (desde API)
    humidity: null,           // % (desde API)
    vpd: null,                // kPa (calculado)
    hd: null,                 // gm/m³ (calculado)
    calculatedAt: null,       // Fecha y hora del cálculo
    location: {               // Coordenadas usadas
      lat: null,
      lng: null
    },
    source: 'api'             // 'api' o 'manual'
  },
  
  // Calculadora Avanzada
  advanced: {
    airTemperature: null,     // °C
    airHumidity: null,        // %
    mode: 'leaf',             // 'leaf' o 'radiation'
    leafTemperature: null,    // °C (si mode = 'leaf')
    solarRadiation: null,     // W/m² (si mode = 'radiation')
    calculatedLeafTemp: null, // °C (si mode = 'radiation', calculado)
    vpd: null,                // kPa (calculado)
    hd: null,                 // gm/m³ (calculado)
    calculatedAt: null        // Fecha y hora del cálculo
  },
  
  // Historial de cálculos (opcional, para gráficos futuros)
  history: [
    {
      type: 'environmental' | 'advanced',
      vpd: 0.84,
      hd: 6.07,
      timestamp: '2025-12-26T13:30:00Z',
      data: { /* datos usados */ }
    }
  ],
  
  lastUpdated: null
}
```

---

## 🔧 COMPONENTES TÉCNICOS

### **1. API de Clima (OpenWeatherMap)**

**Ventajas:**
- ✅ Gratuita (hasta 1,000 llamadas/día)
- ✅ Datos en tiempo real
- ✅ Temperatura y humedad relativa
- ✅ Fácil de usar con coordenadas

**Cómo funciona:**
```javascript
// Obtener clima desde coordenadas del polígono
const lat = project.location.center.lat;
const lng = project.location.center.lng;

const response = await fetch(
  `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${API_KEY}`
);
const data = await response.json();

// data.main.temp → Temperatura en °C
// data.main.humidity → Humedad relativa en %
```

**Configuración necesaria:**
- Crear cuenta gratuita en openweathermap.org
- Obtener API Key (gratuita)
- Configurar en el código

---

### **2. Fórmulas de Cálculo VPD**

#### **A. Calculadora Simple (Ambiental)**
```javascript
// Fórmula básica VPD
function calculateVPD_Simple(airTemp, humidity) {
  // Presión de saturación de vapor a temperatura del aire
  const es = 0.6108 * Math.exp(17.27 * airTemp / (airTemp + 237.3)); // kPa
  
  // Presión de vapor actual
  const ea = es * (humidity / 100); // kPa
  
  // VPD
  const vpd = es - ea; // kPa
  
  // HD (Humidity Deficit) en gm/m³
  const hd = vpd * 0.75; // Aproximación (puede ajustarse)
  
  return { vpd, hd };
}
```

#### **B. Calculadora Avanzada**
```javascript
function calculateVPD_Advanced(airTemp, airHumidity, leafTemp) {
  // Presión de saturación a temperatura de hoja
  const es_leaf = 0.6108 * Math.exp(17.27 * leafTemp / (leafTemp + 237.3)); // kPa
  
  // Presión de vapor actual (del aire)
  const es_air = 0.6108 * Math.exp(17.27 * airTemp / (airTemp + 237.3)); // kPa
  const ea = es_air * (airHumidity / 100); // kPa
  
  // VPD (diferencia entre presión de saturación de hoja y presión actual del aire)
  const vpd = es_leaf - ea; // kPa
  
  // HD
  const hd = vpd * 0.75; // gm/m³
  
  return { vpd, hd };
}

// Si usa radiación solar, calcular temperatura de hoja primero
function calculateLeafTempFromRadiation(airTemp, solarRadiation) {
  // Fórmula aproximada (puede ajustarse según cultivo)
  // T_leaf ≈ T_air + (solarRadiation / 300) * factor
  const factor = 2.5; // Factor de ajuste (depende del cultivo)
  const leafTemp = airTemp + (solarRadiation / 300) * factor;
  return leafTemp;
}
```

---

## 🎨 DISEÑO DE INTERFAZ

### **Estructura Visual Propuesta:**

```
┌─────────────────────────────────────────────────┐
│  🌡️ Déficit de Presión de Vapor (VPD)          │
├─────────────────────────────────────────────────┤
│                                                 │
│  [=== CALCULADORA AMBIENTAL SIMPLE ===]        │
│  ┌─────────────────────────────────────────┐   │
│  │ 📍 Ubicación: [Mostrar coordenadas]     │   │
│  │                                          │   │
│  │ 🌡️ Temperatura del Aire: 20.5 °C      │   │
│  │ 💧 Humedad Relativa: 85 %              │   │
│  │                                          │   │
│  │ [🌐 Obtener Datos del Clima Actual]     │   │
│  │                                          │   │
│  │ Resultados:                              │   │
│  │ • VPD: 0.45 kPa                          │   │
│  │ • HD: 3.38 gm/m³                         │   │
│  │ • Calculado: 26/12/2025, 1:30 PM        │   │
│  │                                          │   │
│  │ [💾 Guardar Cálculo]                     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [=== CALCULADORA AVANZADA ===]                │
│  ┌─────────────────────────────────────────┐   │
│  │ 🌡️ Temperatura del Aire: [____] °C    │   │
│  │ 💧 Humedad Relativa: [____] %          │   │
│  │                                          │   │
│  │ Modo de Cálculo:                        │   │
│  │ ○ Temperatura de Hoja                   │   │
│  │   └─ 🌿 Temp. Hoja: [____] °C          │   │
│  │                                          │   │
│  │ ● Radiación Solar                       │   │
│  │   └─ ☀️ Radiación: [____] W/m²         │   │
│  │                                          │   │
│  │ Resultados:                              │   │
│  │ • VPD: 0.84 kPa                          │   │
│  │ • HD: 6.07 gm/m³                         │   │
│  │ • Temp. Hoja Calculada: 22.4 °C         │   │
│  │                                          │   │
│  │ [📊 Calcular VPD]                        │   │
│  │ [💾 Guardar Cálculo]                     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🔄 FLUJO DE TRABAJO

### **Calculadora Ambiental Simple:**

1. Usuario tiene proyecto con polígono definido
2. Hace clic en "Obtener Datos del Clima Actual"
3. Sistema:
   - Obtiene coordenadas del centro del polígono (`location.center`)
   - Llama a API de OpenWeatherMap
   - Obtiene temperatura y humedad actual
   - Calcula VPD automáticamente
   - Muestra resultados con fecha/hora
4. Usuario hace clic en "Guardar Cálculo"
5. Se guarda en `project.vpdAnalysis.environmental`

### **Calculadora Avanzada:**

1. Usuario ingresa temperatura del aire y humedad relativa
2. Elige modo:
   - **Temperatura de Hoja**: Ingresa temperatura de hoja directamente
   - **Radiación Solar**: Ingresa radiación solar (W/m²)
3. Si eligió radiación solar, se calcula temperatura de hoja primero
4. Calcula VPD usando temperatura de hoja (directa o calculada)
5. Muestra resultados
6. Usuario hace clic en "Guardar Cálculo"
7. Se guarda en `project.vpdAnalysis.advanced`

---

## 💾 GUARDADO (Igual que otras secciones)

```javascript
// Guardar usando el sistema centralizado
window.projectStorage.saveSection('vpd', vpdData, projectId);

// O directamente en el proyecto completo
project.vpdAnalysis = vpdData;
// Guardar proyecto completo
```

---

## 🔐 API KEY (OpenWeatherMap)

**Pasos para obtener:**
1. Registrarse en openweathermap.org (gratis)
2. Ir a "API Keys"
3. Crear nueva API Key
4. Copiar la key
5. Configurarla en el código (variable o archivo de configuración)

**Límite gratuito:** 1,000 llamadas/día (suficiente para muchos usuarios)

**Si necesitas más:** Plan pago desde $40/mes (sin límites)

---

## 📋 PREGUNTAS PARA DEFINIR

1. **API Key:** ¿Quieres que la API Key esté en el código o que cada usuario use la suya? (Recomiendo una key compartida inicialmente)

2. **Historial:** ¿Quieres guardar historial de cálculos para gráficos futuros o solo el último cálculo?

3. **Validación de polígono:** ¿Qué hacer si el proyecto no tiene polígono? ¿Mostrar error o permitir ingresar coordenadas manualmente?

4. **Fórmula de temperatura de hoja:** ¿Tienes una fórmula específica o usamos la aproximada que propuse?

5. **HD (Humidity Deficit):** ¿La fórmula `HD = VPD * 0.75` es correcta o tienes otra?

6. **Rangos ideales:** ¿Quieres mostrar rangos ideales de VPD por cultivo (como en tu Excel) o solo el valor calculado?

---

## ✅ VENTAJAS DE ESTA PROPUESTA

- ✅ **Consistente** con el resto de la herramienta (mismo patrón de guardado)
- ✅ **Independiente por proyecto** (como pediste)
- ✅ **Dos opciones** (simple y avanzada, como tu Excel)
- ✅ **Datos reales** (API de clima automática)
- ✅ **Flexible** (usuario elige modo de cálculo avanzado)
- ✅ **Guardado permanente** (igual que otras secciones)

---

## 🚀 SIGUIENTE PASO

**¿Te parece bien esta estructura? ¿Hay algo que quieras ajustar o agregar antes de implementarla?**



















