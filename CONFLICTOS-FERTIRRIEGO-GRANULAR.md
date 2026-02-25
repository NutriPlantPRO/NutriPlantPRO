# Conflictos y Llamados Duplicados entre Fertirriego y Nutrición Granular

## 🔴 PROBLEMAS CRÍTICOS ENCONTRADOS

### 1. **IDs Sin Prefijo en `renderTableImmediately` (dashboard.js)**

**Ubicación**: `dashboard.js` líneas 1350, 1354, 1342, 1358-1367

**Problema**: La función `renderTableImmediately` está usando IDs **SIN prefijo** que pueden entrar en conflicto:

```javascript
// ❌ PROBLEMA: IDs sin prefijo "ferti"
id="adj-${n}"        // Debería ser: id="ferti-adj-${n}" o no usarse
id="eff-${n}"        // Debería ser: id="ferti-eff-${n}" o no usarse  
id="extract-${n}"    // Debería ser: id="ferti-extract-${n}" o no usarse
id="req-${n}"        // Debería ser: id="ferti-req-${n}" o no usarse
```

**Conflicto**: Si ambas secciones (Fertirriego y Granular) están visibles o se renderizan, estos IDs entrarán en conflicto porque:
- Granular usa: `granular-adj-${n}`, `granular-eff-${n}`, etc.
- Fertirriego debería usar: `ferti-adj-${n}`, `ferti-eff-${n}`, etc. (en el código principal ya los tiene)
- PERO `renderTableImmediately` usa IDs sin prefijo

**Impacto**: Los event listeners y las funciones pueden capturar elementos de la sección incorrecta.

---

### 2. **Llamadas a Funciones Globales Sin Contexto**

**Ubicación**: `dashboard.js` líneas 1350, 1354, 1381, 1384

**Problema**: `renderTableImmediately` llama a funciones globales sin verificar el contexto:

```javascript
// ❌ PROBLEMA: Llama a window.updateAdjustment sin verificar contexto
onchange="if(window.updateAdjustment) window.updateAdjustment('${n}', this.value)"
onchange="if(window.updateEfficiency) window.updateEfficiency('${n}', this.value)"
```

**Conflicto**: 
- `window.updateAdjustment` es de **Fertirriego**
- `window.updateGranularAdjustment` es de **Granular**
- Pero `renderTableImmediately` solo verifica si existe `window.updateAdjustment`, no verifica si estamos en la sección correcta

**Impacto**: Si Granular está activa y `renderTableImmediately` se ejecuta, podría llamar a las funciones incorrectas.

---

### 3. **Funciones Globales Bien Diferenciadas (✅ CORRECTO)**

**Estado**: Las funciones principales están correctamente diferenciadas:

- **Fertirriego**:
  - `window.calculateNutrientRequirements`
  - `window.updateAdjustment`
  - `window.updateEfficiency`
  - `window.updateExtractionPerTon`

- **Granular**:
  - `window.calculateGranularNutrientRequirements`
  - `window.updateGranularAdjustment`
  - `window.updateGranularEfficiency`
  - `window.updateGranularExtractionPerTon`

**✅ Este diseño está CORRECTO y evita conflictos.**

---

### 4. **Event Listeners Globales (⚠️ POTENCIAL PROBLEMA)**

**Ubicación**: 
- `fertirriego-functions.js` línea 1989: `document.addEventListener('change', ...)`
- `nutricion-granular-requerimiento-functions.js` línea 1225: `document.addEventListener('change', ...)`

**Estado**: Ambos están **bien filtrados** por IDs específicos:

**Fertirriego**:
```javascript
document.addEventListener('change', (e) => {
  if (isFertirriegoLoading) { return; }
  const id = e.target && e.target.id;
  if (id === 'fertirriegoCropType' || id === 'fertirriegoTargetYield') {
    // Solo maneja IDs de Fertirriego
  }
});
```

**Granular**:
```javascript
document.addEventListener('change', (e) => {
  if (isGranularLoading) { return; }
  const id = e.target && e.target.id;
  if (id && (id.startsWith('granular-extract-') || id.startsWith('granular-adj-') || id.startsWith('granular-eff-'))) {
    // Solo maneja IDs de Granular
  }
});
```

**✅ Estos event listeners están BIEN FILTRADOS y NO causan conflictos.**

---

### 5. **Llamadas Duplicadas a `loadProjectData`**

**Ubicación**: `dashboard.js` líneas 1206-1214, 1255

**Estado**: 
- Línea 1206: `loadProjectData()` solo se llama para `'Ubicacion'` y `'Nutricion Granular'` (Fertirriego está **excluido**)
- Línea 1255: `loadProjectData()` se llama específicamente para Fertirriego

**✅ NO hay duplicación** - cada sección tiene su propia llamada.

---

### 6. **Llamadas a `applyProjectDataToUI`**

**Ubicación**: `dashboard.js` líneas 1212, 8000-8027

**Estado**:
- Línea 1212: `applyProjectDataToUI()` solo se llama para `'Ubicacion'` y `'Nutricion Granular'` (Fertirriego está **excluido**)
- Líneas 8000-8027: `applyProjectDataToUI()` tiene código **comentado** que evita aplicar valores de Fertirriego aquí porque `selectSection()` ya lo maneja

**✅ NO hay duplicación** - está correctamente manejado.

---

## ✅ SOLUCIÓN RECOMENDADA

### Problema Principal: `renderTableImmediately` usa IDs sin prefijo

**Opción 1 (RECOMENDADA)**: Eliminar `renderTableImmediately` completamente porque `loadFertirriegoRequirements()` ya renderiza la tabla correctamente.

**Opción 2**: Si es necesario mantener `renderTableImmediately` como fallback, usar IDs con prefijo:
- Cambiar `adj-${n}` → no usar (dejar que `loadFertirriegoRequirements` maneje)
- O cambiar a IDs con prefijo si realmente se necesita

**Recomendación**: **Eliminar `renderTableImmediately`** porque:
1. Ya no se usa (solo como fallback si `loadFertirriegoRequirements` no está disponible)
2. Usa IDs sin prefijo que causan conflictos
3. `loadFertirriegoRequirements()` ya maneja la renderización correctamente

---

## 📋 RESUMEN

| Problema | Ubicación | Severidad | Estado |
|----------|-----------|-----------|--------|
| IDs sin prefijo en `renderTableImmediately` | `dashboard.js` líneas 1350, 1354 | 🔴 CRÍTICO | Necesita corrección |
| Llamadas a funciones sin contexto | `dashboard.js` líneas 1381, 1384 | 🟡 MEDIO | Necesita corrección |
| Funciones globales diferenciadas | Ambos archivos | ✅ CORRECTO | OK |
| Event listeners globales | Ambos archivos | ✅ CORRECTO | Bien filtrados |
| Llamadas duplicadas a `loadProjectData` | `dashboard.js` | ✅ CORRECTO | No hay duplicación |
| Llamadas a `applyProjectDataToUI` | `dashboard.js` | ✅ CORRECTO | Bien manejado |

---

## 🎯 ACCIÓN REQUERIDA

1. **Eliminar o corregir `renderTableImmediately`** en `dashboard.js`
2. Verificar que todas las funciones llamadas desde `renderTableImmediately` estén correctamente contextualizadas


