# Diferencias entre Nutrición Granular y Fertirriego - Requerimientos Nutricionales

## Estructura Similar

Ambas secciones tienen estructuras muy similares porque parten de la misma base conceptual para generar un programa de nutrición:

### Conceptos Compartidos:
1. **Extracción por tonelada**: Ambas usan una base de datos de extracción de nutrientes por tonelada de cultivo
2. **Rendimiento objetivo**: Ambas requieren un rendimiento objetivo (ton/ha)
3. **Extracción total**: Ambas calculan extracción total = extracción por tonelada × rendimiento objetivo
4. **Ajuste por niveles en suelo**: Ambas permiten ajustar los valores de extracción total según análisis de suelo
5. **Eficiencia**: Ambas usan valores de eficiencia para calcular requerimientos reales
6. **Requerimiento real**: Ambas calculan requerimiento real = ajuste / (eficiencia / 100)

## Diferencias Clave

### 1. **Base de Datos de Cultivos**

**Nutrición Granular:**
- Cultivos: maiz, cana, aguacate, limon, banano, trigo, sorgo, arroz, cebada
- Enfocado en cultivos extensivos y cereales
- Variable: `GRANULAR_CROP_EXTRACTION_DB`

**Fertirriego:**
- Cultivos: aguacate, fresa, frambuesa, tomate, chile, sandia, melon, banano, papaya, pepino, lechuga, cebolla, maiz, cana, arandano, limon, pimiento
- Enfocado en cultivos intensivos, hortícolas y frutales
- Variable: `CROP_EXTRACTION_DB`

### 2. **Eficiencias Predeterminadas**

**Nutrición Granular:**
```javascript
GRANULAR_DEFAULT_EFFICIENCY = {
  N: 65, P2O5: 40, K2O: 85, CaO: 85, MgO: 85, S: 85, SO4: 85, 
  Fe: 80, Mn: 80, B: 80, Zn: 80, Cu: 80, Mo: 80, SiO2: 85
}
```
- Eficiencias más bajas (fertilizantes sólidos/granulares)
- N: 65% vs 75% en fertirriego
- P2O5: 40% vs 50% en fertirriego

**Fertirriego:**
```javascript
DEFAULT_EFFICIENCY = {
  N: 75, P2O5: 50, K2O: 90, CaO: 90, MgO: 90, S: 90, SO4: 90, 
  Fe: 85, Mn: 85, B: 85, Zn: 85, Cu: 85, Mo: 85, SiO2: 90
}
```
- Eficiencias más altas (fertilizantes solubles)
- N: 75% (mayor disponibilidad)
- P2O5: 50% (mejor que granular pero aún baja)

### 3. **Estructura de Guardado**

**Nutrición Granular:**
- Ruta: `nutriplant_project_${projectId}.granular.requirements`
- O también: `nutriplant_project_${projectId}.granularRequirements`
- Función de guardado: `saveGranularRequirements()`
- Función de carga: `loadGranularRequirements()`

**Fertirriego:**
- Ruta: `nutriplant_project_${projectId}.fertirriego.requirements`
- Función de guardado: `saveFertirriegoRequirements()`
- Función de carga: `loadFertirriegoRequirements()`

### 4. **IDs de Elementos HTML**

**Nutrición Granular:**
- Cultivo: `granularRequerimientoCropType`
- Rendimiento: `granularRequerimientoTargetYield`
- Tabla: `granularRequerimientoTableContainer`
- Inputs de extracción: `granularExtract-${n}`
- Inputs de ajuste: `granularAdj-${n}`
- Inputs de eficiencia: `granularEff-${n}`

**Fertirriego:**
- Cultivo: `fertirriegoCropType`
- Rendimiento: `fertirriegoTargetYield`
- Tabla: `fertirriegoTableContainer`
- Inputs de extracción: `extract-${n}`
- Inputs de ajuste: `adj-${n}`
- Inputs de eficiencia: `eff-${n}`

### 5. **Funciones Principales**

**Nutrición Granular:**
- `calculateGranularNutrientRequirements(options)`
- `renderGranularNutrientTable(...)`
- `loadGranularRequirements()`
- `saveGranularRequirements()`
- `updateGranularAdjustment()`
- `updateGranularEfficiency()`
- `updateGranularExtractionPerTon()`

**Fertirriego:**
- `calculateNutrientRequirements(opts)` (sin prefijo "Granular")
- `renderNutrientTable(...)` (sin prefijo "Granular")
- `loadFertirriegoRequirements()`
- `saveFertirriegoRequirements()`
- `updateAdjustment()` (sin prefijo "Granular")
- `updateEfficiency()` (sin prefijo "Granular")
- `updateExtractionPerTon()` (sin prefijo "Granular")

### 6. **Variables de Estado Global**

**Nutrición Granular:**
- `isGranularRequerimientoElementalMode`
- `savedGranularAdjustments`
- `savedGranularEfficiencies`
- `lastGranularCalculatedCrop`
- `lastGranularCalculatedYield`

**Fertirriego:**
- `isFertirriegoElementalMode`
- `savedFertiAdjustments`
- `savedFertiEfficiencies`
- `lastFertiCrop`
- `lastFertiTargetYield`

### 7. **Flujo de Inicialización**

**Nutrición Granular:**
1. Se llama desde `selectGranularSubTab('requerimiento')`
2. Orden:
   - Cargar cultivos personalizados
   - Cargar datos del proyecto (`loadProjectData()`)
   - Cargar requerimientos guardados (`loadGranularRequirements()`)

**Fertirriego:**
1. Se llama desde `selectSection('Fertirriego')`
2. Orden actual (que parece tener problemas):
   - Cargar datos del proyecto (`loadProjectData()`)
   - Cargar cultivos personalizados
   - Cargar requerimientos guardados (`loadFertirriegoRequirements()`)

### 8. **Lógica de Carga de Valores**

**Ambas usan la misma lógica de prioridad:**
1. Valores pasados en `opts`/`options` (valores guardados)
2. Valores guardados desde storage
3. Valores del DOM (inputs actuales)
4. Valores predefinidos

## Problemas Identificados en Fertirriego

1. **Múltiples llamadas conflictuantes:**
   - `selectSection()` llama a `loadProjectData()` (línea 1255)
   - `selectSection()` también llama a `loadProjectData()` y `applyProjectDataToUI()` (líneas 1206-1214)
   - `applyProjectDataToUI()` también aplica valores y llama a `loadFertirriegoRequirements()` (líneas 8000-8036)

2. **Orden de ejecución:**
   - Se están aplicando valores predefinidos antes de que se carguen los valores guardados
   - `renderTableImmediately()` renderiza con valores predefinidos

3. **Falta de sincronización:**
   - No hay un único punto de entrada claro como en Granular (`selectGranularSubTab`)

## Recomendación

Fertirriego debería seguir el mismo patrón que Nutrición Granular:
1. Un único punto de entrada claro
2. Orden de ejecución: Cultivos personalizados → loadProjectData → loadRequirements
3. Evitar múltiples llamadas conflictuantes


