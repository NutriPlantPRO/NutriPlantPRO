# 🔍 ANÁLISIS EXTREMADAMENTE DETALLADO - SECCIÓN REQUERIMIENTOS

## 📋 RESUMEN EJECUTIVO

Esta sección analiza en profundidad los problemas en la sección de REQUERIMIENTOS (Granular y Fertirriego), que fue creada durante actualizaciones de Cursor y contiene múltiples fallos arquitectónicos.

---

## 🚨 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. **MÚLTIPLES FUNCIONES DE GUARDADO (DUPLICACIÓN MASIVA)**

#### GRANULAR:
- ✅ `saveGranularRequirements()` - Función principal (nutricion-granular-requerimiento-functions.js:815)
- ❌ `saveGranularRequirementsImmediate()` - Wrapper inmediato (nutricion-granular-requerimiento-functions.js:1242)
- ❌ `np_snapshotGranularRequirements()` - Snapshot legacy (dashboard.js:8179)
- ❌ `getGranularDataForSave()` - Helper en collectCurrentData (dashboard.js:7254)
- ❌ `saveProjectData()` - Recopila datos y puede sobrescribir (dashboard.js:6488)
- ❌ `saveBeforeTabChange()` - Guarda antes de cambiar pestaña (dashboard.js:8301)
- ❌ `collectCurrentData()` - Llama saveGranularRequirements + getGranularDataForSave (dashboard.js:8752)

**TOTAL: 7 lugares diferentes donde se puede guardar Granular**

#### FERTIRRIEGO:
- ✅ `saveFertirriegoRequirements()` - Función principal (fertirriego-functions.js:1263)
- ❌ `saveFertirriegoRequirementsImmediate()` - Wrapper inmediato (fertirriego-functions.js:1691)
- ❌ `np_snapshotFertirriegoRequirements()` - Snapshot legacy (dashboard.js:8239)
- ❌ `saveProjectData()` - Recopila datos y puede sobrescribir (dashboard.js:6697)
- ❌ `saveBeforeTabChange()` - Guarda antes de cambiar pestaña (dashboard.js:8407)
- ❌ `collectCurrentData()` - Puede guardar Fertirriego (dashboard.js:8788)

**TOTAL: 6 lugares diferentes donde se puede guardar Fertirriego**

### 2. **CONFLICTOS DE GUARDADO (RACE CONDITIONS)**

#### Escenario 1: `selectSection()` llama múltiples guardados
```javascript
// dashboard.js:1177-1212
selectSection() {
  // 1. Llama saveGranularRequirementsImmediate()
  // 2. Llama saveFertirriegoRequirementsImmediate()
  // 3. Llama saveProjectData() (que también recopila datos)
}
```

#### Escenario 2: `collectCurrentData()` guarda múltiples veces
```javascript
// dashboard.js:8752-8784
collectCurrentData() {
  // 1. Llama saveGranularRequirementsImmediate()
  // 2. Llama getGranularDataForSave() y saveSection() EXPLÍCITAMENTE
  // 3. Esto guarda DOS VECES el mismo dato
}
```

#### Escenario 3: `saveProjectData()` recopila del DOM
```javascript
// dashboard.js:6697-6727
saveProjectData() {
  // Recopila datos directamente del DOM
  // Puede sobrescribir datos guardados por saveGranularRequirements()
  // NO preserva extractionOverrides correctamente
}
```

### 3. **MÚLTIPLES FORMATOS DE STORAGE (LEGACY + NUEVO)**

#### Formatos detectados:
1. **NUEVO (correcto)**: `nutriplant_project_<id>.granular.requirements`
2. **LEGACY (incorrecto)**: `nutriplant_project_<id>.granularRequirements`
3. **LEGACY (incorrecto)**: `nutriplant_project_<id>.granularLastUI`
4. **LEGACY (incorrecto)**: `nutriplant_project_<id>.fertirriegoRequirements`
5. **LEGACY (incorrecto)**: `nutriplant_project_<id>.fertirriegoLastUI`

#### Funciones que usan formato LEGACY:
- ❌ `np_snapshotGranularRequirements()` - Guarda en `.granularRequirements` (dashboard.js:8201)
- ❌ `np_snapshotFertirriegoRequirements()` - Guarda en `.fertirriegoRequirements` (dashboard.js:8259)
- ❌ `saveBeforeTabChange()` - Usa formato legacy (dashboard.js:8333-8435)
- ❌ `loadGranularRequirements()` - Busca en formato legacy como fallback (dashboard.js:1544)
- ❌ `loadFertirriegoRequirements()` - Busca en formato legacy como fallback (fertirriego-functions.js:1814)

### 4. **PROBLEMAS CON extractionOverrides**

#### GRANULAR - Problemas identificados:

1. **`saveProjectData()` NO guarda extractionOverrides**:
   ```javascript
   // dashboard.js:6697-6727
   // Recopila adjustment y efficiency del DOM
   // PERO NO recopila extractionOverrides
   // Esto puede SOBRESCRIBIR extractionOverrides con datos vacíos
   ```

2. **`np_snapshotGranularRequirements()` NO guarda extractionOverrides**:
   ```javascript
   // dashboard.js:8197-8210
   // Solo guarda cropType, targetYield, adjustment, efficiency
   // NO guarda extractionOverrides
   ```

3. **`getGranularDataForSave()` SÍ guarda extractionOverrides**:
   ```javascript
   // dashboard.js:7254-7351
   // Esta función SÍ preserva extractionOverrides
   // PERO solo se llama desde collectCurrentData()
   ```

4. **`saveBeforeTabChange()` NO guarda extractionOverrides correctamente**:
   ```javascript
   // dashboard.js:8392-8443
   // Usa IDs SIN prefijo: `extract-${n}` en lugar de `granular-extract-${n}`
   // Esto NO funciona para Granular
   ```

#### FERTIRRIEGO - Problemas identificados:

1. **`saveProjectData()` NO guarda extractionOverrides**:
   ```javascript
   // dashboard.js:6697-6727
   // Mismo problema que Granular
   ```

2. **`np_snapshotFertirriegoRequirements()` NO guarda extractionOverrides**:
   ```javascript
   // dashboard.js:8240-8298
   // Solo guarda cropType, targetYield, adjustment, efficiency
   // NO guarda extractionOverrides
   ```

3. **`saveBeforeTabChange()` usa IDs incorrectos**:
   ```javascript
   // dashboard.js:8418
   // Usa `extract-${n}` en lugar de `ferti-extract-${n}`
   // Esto NO funciona correctamente
   ```

### 5. **PROBLEMAS DE CARGA (ORDEN Y TIMING)**

#### GRANULAR - Orden de carga problemático:

1. **`selectGranularSubTab()` carga en este orden**:
   ```javascript
   // dashboard.js:4615-4630
   // 1. loadCustomGranularCrops()
   // 2. loadProjectData() → actualiza currentProject.granular
   // 3. setTimeout(() => loadGranularRequirements(), 200)
   // 4. applyProjectDataToUI() se llama desde loadProjectData()
   //    → Puede establecer valores ANTES de loadGranularRequirements()
   ```

2. **`loadGranularRequirements()` tiene múltiples fallbacks**:
   ```javascript
   // nutricion-granular-requerimiento-functions.js:1448-1547
   // PRIORIDAD 1: projectStorage.loadSection('granular')
   // PRIORIDAD 2: localStorage directo (formato nuevo)
   // PRIORIDAD 3: projectManager.getCurrentProject()
   // PRIORIDAD 4: projectManager.loadProjectData()
   // PRIORIDAD 5: localStorage directo (formato legacy)
   // 
   // PROBLEMA: Si PRIORIDAD 1 falla pero tiene datos en memoria incorrectos,
   // nunca llega a PRIORIDAD 2-5 que tienen los datos correctos
   ```

3. **`applyProjectDataToUI()` YA NO establece valores (CORREGIDO)**:
   ```javascript
   // dashboard.js:8041-8064 (CORREGIDO)
   // Ahora solo agrega opciones, NO establece valores
   // PERO el código legacy puede tener otros lugares que sí establecen valores
   ```

#### FERTIRRIEGO - Orden de carga problemático:

1. **`selectSection()` carga en este orden**:
   ```javascript
   // dashboard.js:1304-1346
   // 1. loadProjectData() → actualiza currentProject.fertirriego
   // 2. setTimeout(() => loadFertirriegoRequirements(), 0)
   // 3. applyProjectDataToUI() se llama desde loadProjectData()
   //    → YA NO establece valores (CORREGIDO en dashboard.js:8066-8092)
   ```

2. **`loadFertirriegoRequirements()` tiene múltiples fallbacks**:
   ```javascript
   // fertirriego-functions.js:1745-1817
   // Similar a Granular - múltiples fallbacks
   // Mismo problema potencial
   ```

### 6. **FUNCIONES SNAPSHOT LEGACY (PELIGROSAS)**

#### `np_snapshotGranularRequirements()` (dashboard.js:8179):
- ✅ Se llama desde algunos lugares legacy
- ❌ NO guarda extractionOverrides
- ❌ Guarda en formato legacy (`.granularRequirements`)
- ❌ Puede sobrescribir datos guardados por `saveGranularRequirements()`

#### `np_snapshotFertirriegoRequirements()` (dashboard.js:8239):
- ✅ Se llama desde algunos lugares legacy
- ❌ NO guarda extractionOverrides
- ❌ Guarda en formato legacy (`.fertirriegoRequirements`)
- ❌ Puede sobrescribir datos guardados por `saveFertirriegoRequirements()`

### 7. **CONFLICTOS ENTRE GRANULAR Y FERTIRRIEGO**

#### ID Conflictos (YA RESUELTOS):
- ✅ Granular usa prefijo `granular-` (granular-extract-N, granular-adj-N, etc.)
- ✅ Fertirriego usa prefijo `ferti-` (ferti-extract-N, ferti-adj-N, etc.)
- ❌ PERO `saveBeforeTabChange()` usa IDs SIN prefijo (`extract-${n}`)

#### Storage Conflictos:
- ✅ Usan secciones diferentes: `granular` vs `fertirriego`
- ❌ PERO `saveProjectData()` puede hacer merge incorrecto

### 8. **CÓDIGO LEGACY QUE INTERFIERE**

#### `saveBeforeTabChange()` (dashboard.js:8301):
- ❌ Función legacy que guarda datos antes de cambiar pestaña
- ❌ Usa IDs incorrectos para extracción
- ❌ NO preserva extractionOverrides correctamente
- ❌ Puede ejecutarse DESPUÉS de `saveGranularRequirements()`

#### `saveProjectData()` (dashboard.js:6488):
- ❌ Función general que recopila TODOS los datos
- ❌ Recopila datos del DOM directamente
- ❌ NO preserva extractionOverrides
- ❌ Se llama desde múltiples lugares
- ❌ Puede sobrescribir datos guardados por funciones específicas

---

## 🔧 SOLUCIONES PROPUESTAS

### SOLUCIÓN 1: ELIMINAR FUNCIONES DUPLICADAS

#### Eliminar completamente:
1. ❌ `np_snapshotGranularRequirements()` - Reemplazada por `saveGranularRequirements()`
2. ❌ `np_snapshotFertirriegoRequirements()` - Reemplazada por `saveFertirriegoRequirements()`
3. ❌ `saveBeforeTabChange()` - Lógica movida a `selectSection()`

#### Deprecar (mantener por compatibilidad pero no usar):
1. ⚠️ `getGranularDataForSave()` - Ya no necesario si `saveGranularRequirements()` funciona correctamente
2. ⚠️ `saveProjectData()` recopilación de Granular/Fertirriego - Dejar que funciones específicas se encarguen

### SOLUCIÓN 2: UNIFICAR FORMATO DE STORAGE

#### Eliminar formato legacy:
1. ✅ Ya NO guardar en `.granularRequirements` (legacy)
2. ✅ Ya NO guardar en `.fertirriegoRequirements` (legacy)
3. ✅ SOLO usar `.granular.requirements` (nuevo)
4. ✅ SOLO usar `.fertirriego.requirements` (nuevo)

#### Actualizar funciones de carga:
1. ✅ Eliminar fallbacks a formato legacy
2. ✅ Solo cargar desde formato nuevo

### SOLUCIÓN 3: SIMPLIFICAR FLUJO DE GUARDADO

#### Flujo propuesto:
```
Usuario modifica valor
  ↓
onchange/oninput dispara
  ↓
saveGranularRequirements() / saveFertirriegoRequirements()
  ↓
projectStorage.saveSection()
  ↓
localStorage (formato nuevo)
```

#### NO llamar múltiples funciones:
- ❌ NO llamar `saveProjectData()` para Granular/Fertirriego
- ❌ NO llamar funciones snapshot
- ❌ NO llamar `collectCurrentData()` para guardar (solo para recopilar para export)

### SOLUCIÓN 4: SIMPLIFICAR FLUJO DE CARGA

#### Flujo propuesto:
```
Usuario selecciona sección
  ↓
selectSection() / selectGranularSubTab()
  ↓
loadProjectData() (solo para actualizar currentProject)
  ↓
loadGranularRequirements() / loadFertirriegoRequirements()
  ↓
calculateGranularNutrientRequirements() / calculateNutrientRequirements()
  ↓
renderGranularNutrientTable() / renderNutrientTable()
```

#### NO establecer valores múltiples veces:
- ✅ `applyProjectDataToUI()` YA NO establece valores (CORREGIDO)
- ❌ Eliminar cualquier otro lugar que establezca valores

### SOLUCIÓN 5: ASEGURAR extractionOverrides

#### En saveGranularRequirements():
- ✅ YA preserva extractionOverrides (CORREGIDO)
- ✅ Carga existingData SIEMPRE
- ✅ Inicializa extractionOverrides con existingData

#### En saveProjectData():
- ❌ NO recopilar datos de Granular/Fertirriego
- ✅ Dejar que funciones específicas se encarguen

#### En funciones snapshot:
- ❌ ELIMINAR completamente

---

## 📊 RESUMEN DE PROBLEMAS

### Por Severidad:

#### 🔴 CRÍTICO (Causan pérdida de datos):
1. Múltiples funciones de guardado (race conditions)
2. `saveProjectData()` sobrescribe extractionOverrides
3. Funciones snapshot legacy sobrescriben datos
4. Formato legacy causa conflictos
5. `loadSection()` no devuelve extractionOverrides (problema en projectStorage)

#### 🟡 ALTO (Causan inconsistencias):
1. Múltiples formatos de storage
2. Múltiples fallbacks en carga (pueden cargar datos incorrectos)
3. `saveBeforeTabChange()` usa IDs incorrectos
4. Timing issues (loadProjectData vs loadGranularRequirements)

#### 🟢 MEDIO (Causan confusión pero no pérdida de datos):
1. Código duplicado
2. Logs excesivos (no es problema funcional)
3. Funciones helper innecesarias

---

## 🎯 PLAN DE ACCIÓN RECOMENDADO

### FASE 1: ELIMINAR CÓDIGO LEGACY (Prioridad Alta)
1. Eliminar `np_snapshotGranularRequirements()`
2. Eliminar `np_snapshotFertirriegoRequirements()`
3. Eliminar llamadas a funciones snapshot
4. Eliminar `saveBeforeTabChange()` (mover lógica a `selectSection()`)

### FASE 2: SIMPLIFICAR GUARDADO (Prioridad Alta)
1. Eliminar recopilación de Granular/Fertirriego en `saveProjectData()`
2. Eliminar `getGranularDataForSave()` de `collectCurrentData()`
3. Asegurar que SOLO `saveGranularRequirements()` y `saveFertirriegoRequirements()` guarden

### FASE 3: UNIFICAR FORMATO (Prioridad Media)
1. Eliminar soporte para formato legacy en carga
2. Actualizar cualquier código que use formato legacy
3. Eliminar fallbacks a formato legacy

### FASE 4: VERIFICAR CARGA (Prioridad Media)
1. Verificar que `loadSection()` devuelva extractionOverrides correctamente
2. Simplificar fallbacks en `loadGranularRequirements()` / `loadFertirriegoRequirements()`
3. Eliminar código que establezca valores múltiples veces

---

## ✅ CAMBIOS YA APLICADOS (QUE ESTÁN BIEN)

1. ✅ `applyProjectDataToUI()` NO establece valores (CORREGIDO)
2. ✅ `saveGranularRequirements()` preserva extractionOverrides (CORREGIDO)
3. ✅ `saveFertirriegoRequirements()` preserva extractionOverrides (CORREGIDO)
4. ✅ Fix automático en `loadGranularRequirements()` para extractionOverrides (CORREGIDO)
5. ✅ Fix automático en `loadFertirriegoRequirements()` para extractionOverrides (CORREGIDO)
6. ✅ Logs detallados agregados (CORRECTO)

---

## 🔍 CONCLUSIÓN

La sección de REQUERIMIENTOS tiene **ARQUITECTURA DEFICIENTE** causada por:
1. Código legacy acumulado
2. Múltiples funciones que hacen lo mismo
3. Formato de storage inconsistente
4. Race conditions entre funciones
5. Lógica duplicada y contradictoria

**RECOMENDACIÓN**: Refactorizar completamente siguiendo el plan de acción propuesto.
