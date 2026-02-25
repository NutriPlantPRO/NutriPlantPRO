# Plan de Corrección: IDs Independientes para Fertirriego

## 🎯 Objetivo
Hacer que la sección Fertirriego sea **completamente independiente** de Nutrición Granular, prefijando todos los IDs con "ferti" o "fertiProg".

## 📋 Cambios a Realizar

### 1. IDs en dashboard.js (Template HTML - Programa de Nutrición)

#### Requerimientos:
- `id="reqN"` → `id="fertiReqN"`
- `id="reqP2O5"` → `id="fertiReqP2O5"`
- `id="reqK2O"` → `id="fertiReqK2O"`
- `id="reqCaO"` → `id="fertiReqCaO"`
- `id="reqMgO"` → `id="fertiReqMgO"`
- `id="reqS"` → `id="fertiReqS"`
- `id="reqSO4"` → `id="fertiReqSO4"`
- `id="reqFe"` → `id="fertiReqFe"`
- `id="reqMn"` → `id="fertiReqMn"`
- `id="reqB"` → `id="fertiReqB"`
- `id="reqZn"` → `id="fertiReqZn"`
- `id="reqCu"` → `id="fertiReqCu"`
- `id="reqMo"` → `id="fertiReqMo"`
- `id="reqSiO2"` → `id="fertiReqSiO2"`

#### Diferencias:
- `id="diffN"` → `id="fertiDiffN"`
- `id="diffP2O5"` → `id="fertiDiffP2O5"`
- `id="diffK2O"` → `id="fertiDiffK2O"`
- `id="diffCaO"` → `id="fertiDiffCaO"`
- `id="diffMgO"` → `id="fertiDiffMgO"`
- `id="diffS"` → `id="fertiDiffS"`
- `id="diffSO4"` → `id="fertiDiffSO4"`
- `id="diffFe"` → `id="fertiDiffFe"`
- `id="diffMn"` → `id="fertiDiffMn"`
- `id="diffB"` → `id="fertiDiffB"`
- `id="diffZn"` → `id="fertiDiffZn"`
- `id="diffCu"` → `id="fertiDiffCu"`
- `id="diffMo"` → `id="fertiDiffMo"`
- `id="diffSiO2"` → `id="fertiDiffSiO2"`

#### Labels:
- `id="reqLabelP2O5"` → `id="fertiReqLabelP2O5"`
- `id="reqLabelK2O"` → `id="fertiReqLabelK2O"`
- `id="reqLabelCaO"` → `id="fertiReqLabelCaO"`
- `id="reqLabelMgO"` → `id="fertiReqLabelMgO"`
- `id="reqLabelSiO2"` → `id="fertiReqLabelSiO2"`
- `id="diffLabelP2O5"` → `id="fertiDiffLabelP2O5"`
- `id="diffLabelK2O"` → `id="fertiDiffLabelK2O"`
- `id="diffLabelCaO"` → `id="fertiDiffLabelCaO"`
- `id="diffLabelMgO"` → `id="fertiDiffLabelMgO"`
- `id="diffLabelSiO2"` → `id="fertiDiffLabelSiO2"`

#### Resumen:
- `id="totalApplications"` → `id="fertiTotalApplications"`
- `id="totalDoseKgHa"` → `id="fertiTotalDoseKgHa"`

#### Gráficas:
- `id="macroChart"` → `id="fertiMacroChart"`
- `id="microChart"` → `id="fertiMicroChart"`

### 2. Referencias en fertirriego-program-functions.js

#### En función `updateFertiSummary()`:
- `getElementById('totalApplications')` → `getElementById('fertiTotalApplications')`
- `getElementById('totalDoseKgHa')` → `getElementById('fertiTotalDoseKgHa')`
- `set('reqN', ...)` → `set('fertiReqN', ...)`
- `set('reqP2O5', ...)` → `set('fertiReqP2O5', ...)`
- (y todos los demás req*, diff*)

#### En función `updateFertiCharts()`:
- `getElementById('macroChart')` → `getElementById('fertiMacroChart')`
- `getElementById('microChart')` → `getElementById('fertiMicroChart')`

#### En función `updateFertiSummary()` - lectura de requerimientos:
- `getElementById('req-${n}')` → Este está bien porque busca en la tabla de requerimientos de Fertirriego (que usa `req-${n}` en la tabla dinámica)

## ✅ Verificación Final

Después de los cambios, verificar:
1. ✅ No hay IDs duplicados entre Fertirriego y Granular
2. ✅ Todas las referencias JavaScript están actualizadas
3. ✅ Las gráficas funcionan correctamente
4. ✅ El resumen se actualiza correctamente
5. ✅ No hay errores en consola

## 📝 Notas

- Los IDs de la tabla de requerimientos (`req-N`, `req-P2O5`, etc. generados dinámicamente) NO se cambian porque están dentro de un contenedor específico (`fertirriegoTableContainer`) y no colisionan con Granular.
- Los IDs de la pestaña "Programa" SÍ se deben cambiar porque están en el mismo nivel de DOM y pueden colisionar.


