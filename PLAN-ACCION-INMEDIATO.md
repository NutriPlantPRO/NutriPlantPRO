# 🎯 PLAN DE ACCIÓN INMEDIATO - REQUERIMIENTOS

## ⚠️ PROBLEMA PRINCIPAL IDENTIFICADO

**La "Extracción por tonelada" se pierde porque múltiples funciones están guardando al mismo tiempo, causando race conditions y sobrescritura de datos.**

---

## 🔴 PASO 1: ELIMINAR RECOPILACIÓN EN `saveProjectData()` (CRÍTICO - HACER PRIMERO)

### Problema:
`saveProjectData()` recopila datos de Granular/Fertirriego directamente del DOM **DESPUÉS** de que `saveGranularRequirements()` ya guardó. Esto **SOBRESCRIBE** `extractionOverrides` con datos vacíos.

### Solución:
**ELIMINAR completamente** la recopilación de Granular/Fertirriego en `saveProjectData()`. Dejar que SOLO `saveGranularRequirements()` y `saveFertirriegoRequirements()` guarden.

### Archivo: `dashboard.js`
### Líneas a MODIFICAR:

#### GRANULAR (líneas ~6646-6687):
```javascript
// ❌ ELIMINAR ESTO COMPLETAMENTE:
// GRANULAR - Recopilar SOLO si está visible Y tiene datos válidos
const gCrop = document.getElementById('granularRequerimientoCropType');
const gYield = document.getElementById('granularRequerimientoTargetYield');
const gTableContainer = document.getElementById('granularRequerimientoTableContainer');

if (gCrop && gYield && gTableContainer && gTableContainer.offsetParent !== null) {
  sectionData.granular = sectionData.granular || {};
  sectionData.granular.requirements = sectionData.granular.requirements || {};
  // ... todo el código de recopilación ...
}

// ✅ REEMPLAZAR CON:
// GRANULAR - NO recopilar aquí - saveGranularRequirements() ya se encarga
// Las funciones específicas (saveGranularRequirements, saveFertirriegoRequirements)
// ya guardan correctamente con extractionOverrides
```

#### FERTIRRIEGO (líneas ~6689-6727):
```javascript
// ❌ ELIMINAR ESTO COMPLETAMENTE:
// FERTIRRIEGO - Recopilar SOLO si está visible Y tiene datos válidos
const fCrop = document.getElementById('fertirriegoCropType');
const fYield = document.getElementById('fertirriegoTargetYield');
const fTableContainer = document.getElementById('fertirriegoTableContainer');

if (fCrop && fYield && fTableContainer && fTableContainer.offsetParent !== null) {
  sectionData.fertirriego = sectionData.fertirriego || {};
  sectionData.fertirriego.requirements = sectionData.fertirriego.requirements || {};
  // ... todo el código de recopilación ...
}

// ✅ REEMPLAZAR CON:
// FERTIRRIEGO - NO recopilar aquí - saveFertirriegoRequirements() ya se encarga
```

### Por qué esto es crítico:
1. `selectSection()` llama `saveGranularRequirements()` ANTES de `saveProjectData()`
2. `saveGranularRequirements()` guarda CORRECTAMENTE con `extractionOverrides`
3. PERO luego `saveProjectData()` recopila del DOM y SOBRESCRIBE sin `extractionOverrides`
4. Resultado: `extractionOverrides` se pierde

---

## 🔴 PASO 2: ELIMINAR GUARDADO DUPLICADO EN `collectCurrentData()` (CRÍTICO)

### Problema:
`collectCurrentData()` guarda Granular **DOS VECES**:
1. Llama `saveGranularRequirementsImmediate()`
2. Luego llama `getGranularDataForSave()` y `saveSection()` EXPLÍCITAMENTE

Esto causa race conditions y puede sobrescribir datos.

### Solución:
**ELIMINAR** el guardado explícito con `getGranularDataForSave()`. Dejar SOLO `saveGranularRequirementsImmediate()`.

### Archivo: `dashboard.js`
### Líneas a MODIFICAR (~8752-8784):

```javascript
// ❌ ELIMINAR ESTO:
// 🚀 CRÍTICO: Guardar Requerimientos de Granular INMEDIATAMENTE antes de recopilar datos
if (isGranularActive) {
  if (typeof window.saveGranularRequirementsImmediate === 'function') {
    window.saveGranularRequirementsImmediate();
  }
  
  // ❌ ELIMINAR ESTE BLOQUE COMPLETO:
  // 🚀 CRÍTICO: Guardar explícitamente usando saveSection con datos completos
  try {
    const projectId = currentProject.id;
    if (projectId && window.projectStorage) {
      const existingGranular = window.projectStorage.loadSection('granular', projectId) || {};
      const granularData = getGranularDataForSave(existingGranular);
      if (granularData && granularData.requirements) {
        const success = window.projectStorage.saveSection('granular', granularData, projectId);
        // ...
      }
    }
  } catch (e) { /* ... */ }
}

// ✅ REEMPLAZAR CON:
// Guardar Requerimientos de Granular (las funciones específicas ya se encargan)
if (isGranularActive) {
  if (typeof window.saveGranularRequirementsImmediate === 'function') {
    window.saveGranularRequirementsImmediate();
  }
}
// NO hacer guardado explícito aquí - saveGranularRequirements() ya lo hace correctamente
```

---

## 🟡 PASO 3: ELIMINAR FUNCIONES SNAPSHOT LEGACY (LIMPIEZA)

### Problema:
Las funciones `np_snapshotGranularRequirements()` y `np_snapshotFertirriegoRequirements()`:
- NO guardan `extractionOverrides`
- Guardan en formato legacy (`.granularRequirements` en lugar de `.granular.requirements`)
- Pueden sobrescribir datos guardados correctamente

### Solución:
**ELIMINAR completamente** estas funciones y todas sus llamadas.

### Archivos a modificar:

1. **`dashboard.js`** - Eliminar funciones (~8179-8238):
   - `np_snapshotGranularRequirements()` - ELIMINAR
   - `np_snapshotFertirriegoRequirements()` - ELIMINAR

2. **`dashboard.js`** - Eliminar llamadas (~8489-8490):
   ```javascript
   // ❌ ELIMINAR:
   try { np_snapshotFertirriegoRequirements(); } catch {}
   try { np_snapshotGranularRequirements(); } catch {}
   ```

3. **`dashboard.js`** - Verificar otras llamadas:
   - Buscar todas las referencias a `np_snapshot*` y eliminarlas

---

## 🟡 PASO 4: ELIMINAR `saveBeforeTabChange()` O CORREGIR (LIMPIEZA)

### Problema:
`saveBeforeTabChange()` usa IDs incorrectos para extracción:
- Usa `extract-${n}` en lugar de `granular-extract-${n}` o `ferti-extract-${n}`
- NO funciona correctamente

### Solución:
**ELIMINAR** completamente o mover la lógica a `selectSection()` (que ya llama las funciones correctas).

### Archivo: `dashboard.js`
### Líneas a ELIMINAR (~8301-8507):
- Eliminar función completa `saveBeforeTabChange()`
- Eliminar todas las llamadas a `saveBeforeTabChange()`

---

## 📋 RESUMEN DE PRIORIDADES

### 🔴 HACER PRIMERO (CRÍTICO - Causa pérdida de datos):
1. ✅ **PASO 1**: Eliminar recopilación en `saveProjectData()` - **ESTE ES EL PROBLEMA PRINCIPAL**
2. ✅ **PASO 2**: Eliminar guardado duplicado en `collectCurrentData()`

### 🟡 HACER DESPUÉS (LIMPIEZA - Mejora código):
3. ✅ **PASO 3**: Eliminar funciones snapshot legacy
4. ✅ **PASO 4**: Eliminar `saveBeforeTabChange()`

---

## 🎯 RESULTADO ESPERADO

Después de aplicar estos cambios:

1. ✅ SOLO `saveGranularRequirements()` y `saveFertirriegoRequirements()` guardan
2. ✅ NO hay race conditions
3. ✅ NO hay sobrescritura de `extractionOverrides`
4. ✅ Los valores se mantienen después de recargar
5. ✅ Código más limpio y mantenible

---

## ✅ VERIFICACIÓN

Después de aplicar los cambios:

1. Modifica un valor de "Extracción por tonelada" (ej: N = 24.50)
2. Guarda (o cambia de pestaña)
3. Recarga la página
4. ✅ Debería mantener el valor 24.50 (no el precargado)

---

## 📝 NOTAS IMPORTANTES

- Estos cambios son **SEGUROS** porque:
  - Solo eliminamos código que SOBRESCRIBE datos
  - Las funciones específicas (`saveGranularRequirements`, `saveFertirriegoRequirements`) ya funcionan correctamente
  - NO estamos cambiando la lógica de guardado principal

- Si algo sale mal:
  - Los cambios son fáciles de revertir (solo comentar/descomentar)
  - Las funciones principales siguen intactas
