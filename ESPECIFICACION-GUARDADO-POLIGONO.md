# 📋 ESPECIFICACIÓN COMPLETA: GUARDADO DE POLÍGONO

## 🎯 REQUERIMIENTOS DEL USUARIO

### 1. **UN SOLO POLÍGONO POR PROYECTO**
- Cada proyecto tiene EXACTAMENTE UN polígono
- Si el usuario intenta dibujar otro, el anterior se elimina automáticamente
- No se permiten múltiples polígonos visibles simultáneamente

### 2. **GUARDADO INMEDIATO Y CONFIABLE**
- Cuando el usuario hace clic en "Guardar Predio", se guarda INMEDIATAMENTE
- El guardado debe ser persistente (sobrevive recargas de página)
- El guardado debe ser confiable (no se pierde información)

### 3. **CARGA CORRECTA**
- Al abrir un proyecto que tiene polígono guardado, debe aparecer automáticamente
- El polígono debe ser visible en el mapa
- Los datos (superficie, perímetro, coordenadas) deben mostrarse correctamente

### 4. **LIMPIEZA EN PROYECTOS NUEVOS**
- Al crear un proyecto nuevo, NO debe aparecer ningún polígono
- El mapa debe estar completamente limpio
- Los datos deben mostrar valores en 0 o "No seleccionadas"

### 5. **NAVEGACIÓN ENTRE PESTAÑAS**
- Al cambiar de pestaña y regresar, el polígono debe seguir visible
- No debe perderse al cambiar de pestaña
- Debe cargarse rápidamente (desde caché en memoria)

## 🔄 FLUJO COMPLETO ESPERADO

### **FLUJO 1: Usuario dibuja y guarda polígono**
```
1. Usuario hace clic en el mapa
   → Sistema verifica: ¿Hay polígono existente?
   → Si SÍ: Elimina el anterior automáticamente
   → Si NO: Permite dibujar

2. Usuario dibuja polígono (múltiples clics)
   → Sistema guarda puntos temporalmente en memoria
   → Muestra polígono en tiempo real

3. Usuario completa polígono (cierra el polígono)
   → Sistema calcula área y perímetro
   → Muestra datos en la UI

4. Usuario hace clic en "Guardar Predio"
   → Sistema valida: ¿Hay proyecto seleccionado?
   → Sistema valida: ¿Polígono tiene mínimo 3 puntos?
   → Sistema guarda en formato estándar con projectId
   → Sistema actualiza caché en memoria
   → Sistema guarda en localStorage
   → Polígono permanece visible en el mapa
   → Muestra mensaje de confirmación
```

### **FLUJO 2: Usuario abre proyecto con polígono guardado**
```
1. Usuario selecciona proyecto desde Inicio
   → Sistema carga proyecto
   → Sistema limpia mapa completamente
   → Sistema resetea todas las variables

2. Usuario abre pestaña "Ubicación"
   → Sistema verifica: ¿Hay proyecto seleccionado?
   → Sistema carga datos desde localStorage
   → Sistema valida: ¿projectId coincide?
   → Sistema valida: ¿Polígono tiene mínimo 3 puntos?
   → Si TODO es válido:
     → Sistema crea polígono en el mapa
     → Sistema muestra polígono visible
     → Sistema muestra datos (superficie, perímetro, coordenadas)
     → Sistema muestra mensaje "Predio cargado"
   → Si NO es válido:
     → Sistema NO carga nada
     → Sistema muestra valores en 0
     → Sistema muestra mensaje "Haz clic para trazar"
```

### **FLUJO 3: Usuario crea proyecto nuevo**
```
1. Usuario crea proyecto nuevo
   → Sistema limpia caché en memoria
   → Sistema limpia mapa completamente
   → Sistema resetea todas las variables
   → Sistema limpia display (valores en 0)

2. Usuario abre pestaña "Ubicación"
   → Sistema verifica: ¿Hay proyecto seleccionado?
   → Sistema intenta cargar datos
   → Sistema NO encuentra datos (proyecto nuevo)
   → Sistema NO carga nada
   → Sistema muestra valores en 0
   → Sistema muestra mensaje "Haz clic para trazar"
```

### **FLUJO 4: Usuario intenta dibujar otro polígono cuando ya hay uno**
```
1. Usuario tiene polígono guardado y visible
   → Sistema detecta polígono existente (múltiples verificaciones)
   → Usuario hace clic en el mapa

2. Sistema detecta polígono existente
   → Verifica en memoria (this.polygon, this.savedPolygon)
   → Verifica en mapa (getMap())
   → Verifica coordenadas (this.coordinates.length >= 3)
   → Verifica en localStorage (si hay polígono guardado)

3. Si detecta polígono existente:
   → Elimina polígono del mapa
   → Limpia variables internas
   → Limpia display
   → Espera 50ms (para asegurar limpieza)
   → Permite dibujar nuevo polígono

4. Usuario dibuja nuevo polígono
   → Solo hay UN polígono visible (el nuevo)
```

## 📐 FORMATO ESTÁNDAR DE GUARDADO

```javascript
{
  // METADATOS (SIEMPRE REQUERIDOS - Validación crítica)
  projectId: "proj_1234567890_abc123",  // REQUERIDO - String
  projectName: "Proyecto 1",             // REQUERIDO - String
  lastUpdated: "2025-01-15T10:30:00.000Z", // REQUERIDO - ISO String
  
  // POLÍGONO (REQUERIDO - Mínimo 3 puntos)
  polygon: [                              // REQUERIDO - Array de [lat, lng]
    [19.4326, -99.1332],                 // Punto 1
    [19.4330, -99.1335],                 // Punto 2
    [19.4328, -99.1340],                 // Punto 3
    // ... más puntos (mínimo 3)
  ],
  
  // CÁLCULOS (para evitar recalcular)
  area: 105000,                           // Number (m²)
  areaHectares: 10.5,                     // Number
  areaAcres: 25.9,                        // Number
  perimeter: 500,                          // Number (metros)
  
  // CENTRO (para centrar mapa)
  center: {                               // Object
    lat: 19.4326,
    lng: -99.1332
  },
  
  // DISPLAY (opcional - para mostrar en UI)
  coordinates: "19.4326, -99.1332",       // String
  surface: "10.5 ha",                     // String
  perimeterDisplay: "500 m"               // String
}
```

## ✅ REGLAS DE VALIDACIÓN (SIEMPRE APLICAR)

### **Al GUARDAR:**
1. ✅ Debe haber proyecto seleccionado (`currentProject.id` existe)
2. ✅ Polígono debe tener mínimo 3 puntos (`polygon.length >= 3`)
3. ✅ Debe incluir `projectId` en los datos guardados
4. ✅ Debe incluir `lastUpdated` timestamp

### **Al CARGAR:**
1. ✅ Debe haber proyecto seleccionado (`currentProject.id` existe)
2. ✅ `locationData.projectId` DEBE coincidir con `currentProject.id`
3. ✅ Polígono debe tener mínimo 3 puntos (`polygon.length >= 3`)
4. ✅ Si CUALQUIERA de estas validaciones falla, NO cargar nada

### **Al DIBUJAR NUEVO:**
1. ✅ Verificar si hay polígono existente (múltiples formas)
2. ✅ Si hay polígono existente, eliminarlo ANTES de dibujar
3. ✅ Solo permitir UN polígono visible a la vez

## 🚫 CASOS QUE NO DEBEN OCURRIR

1. ❌ Múltiples polígonos visibles simultáneamente
2. ❌ Polígono de un proyecto apareciendo en otro proyecto
3. ❌ Polígono guardado que no aparece al cargar
4. ❌ Polígono visible en proyecto nuevo (sin datos guardados)
5. ❌ Datos residuales de proyectos anteriores
6. ❌ Permitir dibujar nuevo polígono sin eliminar el anterior

## 🎯 PUNTOS CRÍTICOS DE IMPLEMENTACIÓN

### **1. Guardado (map.js::saveLocation)**
- ✅ Validar proyecto seleccionado
- ✅ Validar polígono válido (mínimo 3 puntos)
- ✅ Incluir SIEMPRE projectId, projectName, lastUpdated
- ✅ Guardar en formato estándar
- ✅ Actualizar caché en memoria
- ✅ Guardar en localStorage
- ✅ Mantener polígono visible después de guardar

### **2. Carga (map.js::loadProjectLocation)**
- ✅ Limpiar TODO primero (polígonos, variables, display)
- ✅ Validar proyecto seleccionado
- ✅ Cargar desde localStorage (NO desde caché para evitar datos de otro proyecto)
- ✅ Validar projectId estrictamente
- ✅ Validar polígono válido (mínimo 3 puntos)
- ✅ Si TODO es válido: Cargar y mostrar
- ✅ Si NO es válido: NO cargar nada, mostrar valores en 0

### **3. Detección de Polígono Existente (setupEventListeners)**
- ✅ Verificar en memoria (this.polygon, this.savedPolygon)
- ✅ Verificar en mapa (getMap())
- ✅ Verificar coordenadas (this.coordinates.length >= 3)
- ✅ Verificar en localStorage (si hay polígono guardado para este proyecto)
- ✅ Si CUALQUIERA es verdadera: Eliminar antes de dibujar

### **4. Limpieza al Crear Proyecto Nuevo**
- ✅ Limpiar caché en memoria
- ✅ Limpiar mapa completamente
- ✅ Resetear todas las variables
- ✅ Limpiar display (valores en 0)
- ✅ Actualizar instrucciones

## 📊 RESUMEN EJECUTIVO

**OBJETIVO:** Sistema de guardado de polígono robusto, confiable y predecible.

**PRINCIPIOS:**
1. **Un polígono por proyecto** - Sin excepciones
2. **Validación estricta** - projectId siempre debe coincidir
3. **Limpieza agresiva** - Siempre limpiar antes de cargar
4. **Formato estándar** - Siempre el mismo formato
5. **Detección robusta** - Múltiples formas de verificar polígono existente

**GARANTÍAS:**
- ✅ Si guardas un polígono, se guarda correctamente
- ✅ Si cargas un proyecto con polígono, aparece correctamente
- ✅ Si creas un proyecto nuevo, no aparece ningún polígono
- ✅ Si intentas dibujar otro polígono, el anterior se elimina automáticamente























































