# 🔑 ESTRUCTURA DE IDs Y INFORMACIÓN DE PROYECTOS

## 📋 FORMATO DE ID DESCRIPTIVO

### Formato Actual
```
[InicialesUsuario]_[NombreProyecto]_[FechaHora]
```

### Ejemplos:
- `JA_PEPE-PRUEBA_20251215_193045` → Usuario "Juan Avila", proyecto "Pepe Prueba", creado el 15/12/2025 a las 19:30:45
- `MG_TOMATES-CAMPO1_20251216_081530` → Usuario "María González", proyecto "Tomates Campo 1", creado el 16/12/2025 a las 08:15:30

### Ventajas:
✅ **Descriptivo**: Puedes identificar el proyecto sin abrirlo  
✅ **Único**: Incluye fecha y hora exacta  
✅ **Información del usuario**: Identifica quién creó el proyecto  
✅ **Fácil de ordenar**: Por fecha/hora al ordenar alfabéticamente  

---

## 📦 ESTRUCTURA COMPLETA DE INFORMACIÓN DEL PROYECTO

Cada proyecto incluye la siguiente información estructurada:

### 🔑 IDENTIFICADORES
```javascript
{
  id: "JA_PEPE-PRUEBA_20251215_193045",  // ID único descriptivo
  code: "JA_PEPE-PRUEBA_20251215_193045"  // Código (mismo que ID)
}
```

### 📝 INFORMACIÓN BÁSICA
```javascript
{
  name: "Pepe Prueba",        // Nombre del proyecto
  title: "Pepe Prueba"        // Compatibilidad (mismo que name)
}
```

### 👤 INFORMACIÓN DEL USUARIO
```javascript
{
  user_id: "user123",         // ID del usuario que creó el proyecto
  user_name: "Juan Avila",    // Nombre del usuario
  user_email: "juan@email.com" // Email del usuario
}
```

### 🌾 INFORMACIÓN DEL CULTIVO
```javascript
{
  crop_type: "Aguacate",      // Tipo de cultivo
  cultivo: "Aguacate",        // Compatibilidad
  campoOsector: "Campo Norte", // Campo o sector
  rendimientoEsperado: 50,    // Rendimiento esperado
  unidadRendimiento: "t/ha"   // Unidad de medida
}
```

### 📍 UBICACIÓN Y MAPA
```javascript
{
  location: {
    projectId: "JA_PEPE-PRUEBA_20251215_193045", // Validación de pertenencia
    coordinates: "",           // Coordenadas
    surface: "",               // Superficie
    perimeter: "",             // Perímetro
    polygon: null,             // Array de coordenadas del polígono
    city: "",                  // Ciudad
    state: "",                 // Estado
    country: "",               // País
    center: null,              // Centro del polígono
    area: null,                // Área en m²
    areaHectares: null,        // Área en hectáreas
    areaAcres: null            // Área en acres
  }
}
```

### 🚜 ANÁLISIS DE ENMIENDAS
```javascript
{
  amendments: {
    selected: [],              // Enmiendas seleccionadas
    results: {
      type: "",                // Tipo de enmienda
      amount: "",              // Cantidad
      caContribution: "",      // Contribución de Ca
      naRemoval: "",           // Remoción de Na
      detailedHTML: "",        // HTML detallado
      isVisible: false         // Visibilidad
    },
    lastUpdated: null          // Última actualización
  }
}
```

### 🔬 ANÁLISIS DE SUELO
```javascript
{
  soilAnalysis: {
    initial: {
      k: 0, ca: 0, mg: 0, h: 0, na: 0, al: 0, cic: 0
    },
    properties: {
      ph: 0,                   // pH
      density: 0,              // Densidad
      depth: 0                 // Profundidad
    },
    adjustments: {
      k: 0, ca: 0, mg: 0, h: 0, na: 0, al: 0
    },
    lastUpdated: null
  }
}
```

### 📊 NUTRICIÓN GRANULAR
```javascript
{
  granular: null  // Datos de nutrición granular
}
```

### 💧 FERTIRRIEGO
```javascript
{
  fertirriego: null  // Datos de fertirriego
}
```

### 🌡️ DÉFICIT DE PRESIÓN DE VAPOR (VPD)
```javascript
{
  vpdAnalysis: {
    temperature: {
      air: 0,                  // Temperatura del aire
      leaf: 0,                 // Temperatura de la hoja
      soil: 0                  // Temperatura del suelo
    },
    humidity: {
      air: 0,                  // Humedad del aire
      soil: 0                  // Humedad del suelo
    },
    calculations: {
      vpd: 0,                  // VPD calculado
      optimalVPD: 0,           // VPD óptimo
      status: "",              // Estado (Óptimo, Alto, Bajo)
      recommendation: ""       // Recomendación
    },
    irrigation: {
      frequency: "",           // Frecuencia
      duration: "",            // Duración
      timing: "",              // Horario
      notes: ""                // Notas
    },
    lastUpdated: null
  }
}
```

### 🌱 HIDROPONÍA
```javascript
{
  hydroponics: null  // Datos de hidroponía
}
```

### 🧪 EXTRACTO DE PASTA
```javascript
{
  extracto: null  // Datos de extracto de pasta
}
```

### 💧 ANÁLISIS DE AGUA
```javascript
{
  agua: null  // Datos de análisis de agua
}
```

### 🌿 ANÁLISIS FOLIAR
```javascript
{
  foliar: null  // Datos de análisis foliar
}
```

### 🍎 ANÁLISIS DE FRUTA
```javascript
{
  fruta: null  // Datos de análisis de fruta
}
```

### 💬 HISTORIAL DE CHAT
```javascript
{
  chat_history: []  // Array de mensajes del chat
}
```

### 📄 CÁLCULOS Y DOCUMENTOS
```javascript
{
  calculations: {},  // Objeto con cálculos
  documents: []      // Array de documentos
}
```

### 📅 FECHAS
```javascript
{
  created_at: "2025-12-15T19:30:45.000Z",  // ISO 8601
  createdAt: "2025-12-15T19:30:45.000Z",   // Compatibilidad
  updated_at: "2025-12-15T19:30:45.000Z",  // ISO 8601
  updatedAt: "2025-12-15T19:30:45.000Z"    // Compatibilidad
}
```

### 🏷️ METADATOS
```javascript
{
  status: "active",   // active, archived, deleted
  version: "1.0"      // Versión del formato de datos
}
```

---

## 🔄 FUNCIONES DE GENERACIÓN DE ID

### Función Principal: `np_newId(projectName, userId)`
- **Parámetros:**
  - `projectName` (string): Nombre del proyecto
  - `userId` (string, opcional): ID del usuario (se obtiene automáticamente si no se proporciona)
- **Retorna:** ID descriptivo único
- **Ejemplo:** `np_newId("Pepe Prueba")` → `"JA_PEPE-PRUEBA_20251215_193045"`

### Función Legacy: `np_newIdLegacy()`
- **Retorna:** ID aleatorio en formato `"np_" + timestamp + random`
- **Uso:** Solo como fallback si falla la generación descriptiva

---

## 🔒 VALIDACIONES Y GARANTÍAS

1. **Unicidad**: Se valida que el ID no exista antes de crear el proyecto
2. **Consistencia**: El ID en la clave de localStorage es exactamente el mismo que en el objeto
3. **Normalización**: Caracteres especiales se reemplazan por guiones
4. **Longitud**: Máximo 50 caracteres (se trunca si es necesario)
5. **Fallback**: Si falla la generación descriptiva, usa ID legacy

---

## 📍 DÓNDE SE GUARDA

### Clave en localStorage:
```
nutriplant_project_[ID]
```

### Ejemplo:
```
nutriplant_project_JA_PEPE-PRUEBA_20251215_193045
```

---

## ✅ BENEFICIOS DEL NUEVO SISTEMA

1. **Identificación rápida**: Puedes ver quién creó qué proyecto y cuándo
2. **Organización**: Fácil ordenar por fecha/hora
3. **Trazabilidad**: Información del usuario siempre presente
4. **Legibilidad**: IDs descriptivos en lugar de códigos aleatorios
5. **Sin duplicados**: Validación estricta de unicidad






















