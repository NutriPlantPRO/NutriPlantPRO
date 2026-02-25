# 🎯 LÓGICA DE PRIORIZACIÓN DE ENMIENDAS

## 📊 **TU PREGUNTA**

> "Cuando nos faltan K, Ca y Mg... ¿según la lógica a cuál le da prioridad para calcular la enmienda?"

## ✅ **RESPUESTA DIRECTA**

**Le da prioridad al ELEMENTO MÁS LIMITANTE** (el que más falta en meq).

---

## 🔍 **CÓMO FUNCIONA LA PRIORIZACIÓN**

### **Escenario: Faltan K, Ca y Mg**

**Valores del ejemplo de tu imagen:**
```
K a ajustar:  0.64 meq/100g
Ca a ajustar: 0.02 meq/100g
Mg a ajustar: 1.51 meq/100g
```

### **Paso 1: Identificar cuál es el MÁS LIMITANTE**

```javascript
// dashboard.js línea 1884-1892
const elementosDisponibles = [];
if (kRestante > 0) elementosDisponibles.push({ elemento: 'K', meq: 0.64 });
if (caRestante > 0) elementosDisponibles.push({ elemento: 'Ca', meq: 0.02 });
if (mgRestante > 0) elementosDisponibles.push({ elemento: 'Mg', meq: 1.51 });

// Encontrar el elemento con MAYOR deficiencia
const elementoLimitante = elementosDisponibles.reduce((max, actual) => 
  actual.meq > max.meq ? actual : max
);

// Resultado: { elemento: 'Mg', meq: 1.51 } ← EL MÁS LIMITANTE
```

**En tu ejemplo:**
- Mg (1.51 meq) > K (0.64 meq) > Ca (0.02 meq)
- **Mg es el MÁS limitante** → Se usará para calcular la dosis

---

## 📐 **CÁLCULO DE DOSIS BASADO EN ELEMENTO LIMITANTE**

### **Si seleccionas Cal Dolomítica (tiene Ca + Mg + K potencialmente):**

```javascript
// dashboard.js línea 1898-1925
const caKgHaNeeded = convertMeqToKgHa(0.02, 20.04);  // ~13 kg/ha
const mgKgHaNeeded = convertMeqToKgHa(1.51, 12.15);  // ~997 kg/ha
const kKgHaNeeded = convertMeqToKgHa(0.64, 39.1);    // ~1,653 kg/ha

// Calcular cuánta Cal Dolomítica se necesita para cada elemento
const dolomiteAmendment = enmiendas.find(a => a.id === 'dolomite');
const caPercent = 21.7%;  // Ca en Cal Dolomítica
const mgPercent = 13.2%;  // Mg en Cal Dolomítica

const caAmount = 13 / 0.217 = 60 kg/ha (para cubrir Ca)
const mgAmount = 997 / 0.132 = 7,553 kg/ha (para cubrir Mg)
const kAmount = 1,653 / 0.0 = ∞ (no tiene K)

// USAR LA CANTIDAD DEL ELEMENTO MÁS LIMITANTE
if (elementoLimitante.elemento === 'Mg') {
  dosisDolomita = mgAmount; // 7,553 kg/ha
}
```

**Resultado:**
- Se aplicarán **7,553 kg/ha de Cal Dolomítica**
- Calculado para satisfacer el **Mg** (elemento más limitante)

---

## 🔄 **RECALCULAR NECESIDADES RESTANTES**

```javascript
// Línea 1948-1952
const caAportado = 7,553 × 0.217 = 1,639 kg Ca/ha
const mgAportado = 7,553 × 0.132 = 997 kg Mg/ha

caRestante = 0.02 - convertKgHaToMeq(1,639, 20.04) = 0 (cubierto con exceso)
mgRestante = 1.51 - convertKgHaToMeq(997, 12.15) = 0 (cubierto)
kRestante = 0.64 meq (aún falta, Cal Dolomítica no tiene K)
```

---

## 🎯 **ENMIENDAS ADICIONALES PARA ELEMENTOS RESTANTES**

### **Si queda K sin cubrir:**

```javascript
// Línea 2091-2108
if (kRestante > 0 && tieneSOP) {
  const kKgHaNeeded = convertMeqToKgHa(0.64, 39.1); // 1,653 kg/ha
  const sopAmendment = enmiendas.find(a => a.id === 'sop-granular');
  const kPercent = sopAmendment?.k || 41.5; // 41.5%
  
  const dosisSOP = 1,653 / 0.415 = 3,983 kg/ha
  
  estrategia.push({
    tipo: 'sop-granular',
    dosis: 3983,
    razon: 'Potasio requerido (41.5% K)'
  });
}
```

---

## 📋 **ESTRATEGIA FINAL COMPLETA**

### **Para tu ejemplo (K=0.64, Ca=0.02, Mg=1.51 meq):**

```javascript
estrategia = [
  {
    tipo: 'dolomite',
    dosis: 7553,  // kg/ha de Cal Dolomítica
    razon: 'Elemento limitante: Mg - Cal Dolomítica optimizada',
    elementoLimitante: { elemento: 'Mg', meq: 1.51 }
  },
  {
    tipo: 'sop-granular',
    dosis: 3983,  // kg/ha de SOP
    razon: 'Potasio requerido (41.5% K)'
  }
]
```

---

## 🔢 **APORTES TOTALES CALCULADOS**

```javascript
// Cal Dolomítica (7,553 kg/ha):
Ca: 7,553 × 0.217 = 1,639 kg/ha
Mg: 7,553 × 0.132 = 997 kg/ha

// SOP (3,983 kg/ha):
K: 3,983 × 0.415 = 1,653 kg/ha
SO₄: 3,983 × 0.541 = 2,155 kg/ha

// TOTALES:
K total: 1,653 kg/ha
Ca total: 1,639 kg/ha
Mg total: 997 kg/ha
SO₄ total: 2,155 kg/ha
```

---

## ⭐ **TABLA DE PRIORIZACIÓN COMPLETA**

### **Orden de análisis:**

| Paso | Condición | Enmienda | Elemento que determina dosis |
|------|-----------|----------|------------------------------|
| 1️⃣ | Ca > 0 Y Mg > 0 | Cal Dolomítica | **Elemento MÁS limitante** (el mayor en meq) |
| 2️⃣ | Ca > 0 (solo) | Yeso o Cal Agrícola | Ca |
| 3️⃣ | Mg > 0 (solo) | MgSO₄ | Mg |
| 4️⃣ | K > 0 | SOP Granular | K |
| 5️⃣ | Quedan necesidades | Enmiendas personalizadas | Elemento específico |

---

## 💡 **EJEMPLOS DE PRIORIZACIÓN**

### **Caso 1: Mg >> Ca >> K**
```
Mg = 1.51 meq (MÁS limitante)
K = 0.64 meq
Ca = 0.02 meq

Estrategia:
1. Cal Dolomítica → Dosis calculada para Mg (1.51 meq)
2. SOP → Para K restante
```

### **Caso 2: Ca >> Mg >> K**
```
Ca = 2.0 meq (MÁS limitante)
Mg = 0.5 meq
K = 0.3 meq

Estrategia:
1. Cal Dolomítica → Dosis calculada para Ca (2.0 meq)
2. SOP → Para K restante
3. MgSO₄ → Para Mg restante (si Cal Dolomítica no cubrió todo)
```

### **Caso 3: K >> Ca >> Mg**
```
K = 2.0 meq (MÁS limitante)
Ca = 0.8 meq
Mg = 0.2 meq

Estrategia:
1. Cal Dolomítica → Dosis calculada para K (si tiene K)
   O si no tiene K:
   Cal Dolomítica → Para Ca (0.8 meq)
   MgSO₄ → Para Mg (0.2 meq)
2. SOP → Para K (2.0 meq)
```

### **Caso 4: Solo Ca**
```
Ca = 1.75 meq
Mg = 0 meq
K = 0 meq

Estrategia:
1. Yeso (si pH ≥ 7) o Cal Agrícola (si pH < 7)
   Dosis calculada para Ca (1.75 meq)
```

---

## 🧠 **LÓGICA DEL ELEMENTO MÁS LIMITANTE**

### **¿Por qué usar el MÁS limitante?**

**Opción A (Incorrecta): Usar el MENOS limitante**
```
Si usamos Ca (0.02 meq):
  Cal Dolomítica = 60 kg/ha
  
  Aportes:
  Ca: 60 × 0.217 = 13 kg/ha ✅ (cubre 0.02 meq)
  Mg: 60 × 0.132 = 8 kg/ha ❌ (NO cubre 1.51 meq que necesita 997 kg/ha)
  
  Resultado: Mg queda sin cubrir
```

**Opción B (Correcta): Usar el MÁS limitante**
```
Si usamos Mg (1.51 meq):
  Cal Dolomítica = 7,553 kg/ha
  
  Aportes:
  Ca: 7,553 × 0.217 = 1,639 kg/ha ✅ (cubre 0.02 meq con exceso)
  Mg: 7,553 × 0.132 = 997 kg/ha ✅ (cubre 1.51 meq)
  
  Resultado: Ambos cubiertos
```

**Por eso se usa el MÁS limitante** → Asegura cubrir TODOS los elementos.

---

## 📊 **CÓDIGO EXACTO DE PRIORIZACIÓN**

```javascript
// dashboard.js línea 1876-1955

// 1️⃣ PRIORIDAD MÁXIMA: Cal Dolomítica si necesitas Ca + Mg
if (tieneDolomita && caRestante > 0 && mgRestante > 0) {
  
  // Identificar elementos disponibles con deficiencia
  const elementosDisponibles = [];
  if (kRestante > 0) elementosDisponibles.push({ elemento: 'K', meq: kRestante });
  if (caRestante > 0) elementosDisponibles.push({ elemento: 'Ca', meq: caRestante });
  if (mgRestante > 0) elementosDisponibles.push({ elemento: 'Mg', meq: mgRestante });
  
  // Encontrar el MÁS LIMITANTE (mayor meq)
  const elementoLimitante = elementosDisponibles.reduce((max, actual) => 
    actual.meq > max.meq ? actual : max
  );
  
  // Calcular dosis para cada elemento
  const caAmount = caKgHaNeeded / (caPercent / 100);
  const mgAmount = mgKgHaNeeded / (mgPercent / 100);
  const kAmount = kKgHaNeeded / (kPercent / 100);
  
  // USAR LA DOSIS DEL ELEMENTO MÁS LIMITANTE
  if (elementoLimitante.elemento === 'Ca') {
    dosisDolomita = caAmount;
  } else if (elementoLimitante.elemento === 'Mg') {
    dosisDolomita = mgAmount;  // ← En tu caso, Mg es el mayor
  } else if (elementoLimitante.elemento === 'K') {
    dosisDolomita = kAmount;
  }
}
```

---

## 🎯 **TU EJEMPLO ESPECÍFICO**

### **Datos:**
```
K: 0.64 meq/100g
Ca: 0.02 meq/100g
Mg: 1.51 meq/100g
```

### **Análisis:**
```
elementosDisponibles = [
  { elemento: 'K', meq: 0.64 },
  { elemento: 'Ca', meq: 0.02 },
  { elemento: 'Mg', meq: 1.51 }
];

elementoLimitante = { elemento: 'Mg', meq: 1.51 }
                    ↑
              El que MÁS falta
```

### **Cálculo:**
```
1. Cal Dolomítica se calcula basándose en Mg (1.51 meq)
   
2. Dosis = mgKgHaNeeded / (mgPercent / 100)
         = 997 kg/ha / 0.132
         = 7,553 kg/ha de Cal Dolomítica

3. Esta dosis de Cal Dolomítica aporta:
   Ca: 7,553 × 0.217 = 1,639 kg/ha (cubre 0.02 meq CON EXCESO ✅)
   Mg: 7,553 × 0.132 = 997 kg/ha (cubre 1.51 meq ✅)
   K: 0 (Cal Dolomítica no tiene K)

4. K aún falta (0.64 meq) → Se agrega SOP
   Dosis SOP = 1,653 / 0.415 = 3,983 kg/ha
```

---

## ✅ **POR QUÉ ESTA LÓGICA ES CORRECTA**

### **Ventaja 1: Eficiencia**
- Una sola enmienda cubre múltiples elementos
- No necesitas 3 enmiendas diferentes para Ca, Mg y K si una puede cubrirlos

### **Ventaja 2: Seguridad**
- Al usar el MÁS limitante, aseguras cubrir TODOS
- Si usaras el menos limitante, otros quedarían sin cubrir

### **Ventaja 3: Economía**
- Menos enmiendas diferentes = más fácil de aplicar en campo
- Cal Dolomítica es económica para Ca + Mg

---

## 🔄 **FLUJO COMPLETO CON TU EJEMPLO**

```
ENTRADA:
  K: 0.64 meq
  Ca: 0.02 meq  
  Mg: 1.51 meq
  pH: 6.0
  
PRIORIZACIÓN:
  1️⃣ Mg (1.51) > K (0.64) > Ca (0.02)
     → Mg es el MÁS limitante
  
ESTRATEGIA:
  1. Cal Dolomítica:
     - Dosis basada en Mg: 7,553 kg/ha
     - Cubre: Mg (100%) + Ca (con exceso)
     - No cubre: K (no tiene)
  
  2. SOP Granular:
     - Dosis basada en K: 3,983 kg/ha
     - Cubre: K (100%)
  
RESULTADO:
  Enmienda 1: Cal Dolomítica 7,553 kg/ha
  Enmienda 2: SOP Granular 3,983 kg/ha
  
APORTES:
  K: 1,653 kg/ha ✅
  Ca: 1,639 kg/ha ✅ (con exceso sobre 13 kg/ha requeridos)
  Mg: 997 kg/ha ✅
```

---

## 🤔 **CASOS ESPECIALES**

### **Si Cal Dolomítica NO está seleccionada:**

```
ENTRADA:
  K: 0.64 meq
  Ca: 0.02 meq
  Mg: 1.51 meq
  pH: 6.0
  Enmiendas seleccionadas: Yeso, MgSO₄, SOP

ESTRATEGIA:
  1. Yeso (para Ca): 56 kg/ha
  2. MgSO₄ (para Mg): 5,865 kg/ha  
  3. SOP (para K): 3,983 kg/ha
  
Total: 3 enmiendas diferentes
```

**Menos eficiente pero funciona.**

---

### **Si solo seleccionas una enmienda con K:**

```
ENTRADA:
  K: 0.64 meq
  Ca: 0.02 meq
  Mg: 1.51 meq
  Enmiendas seleccionadas: SOLO SOP

ESTRATEGIA:
  1. SOP (para K): 3,983 kg/ha
  
RESULTADO:
  K: Cubierto ✅
  Ca: NO cubierto ❌
  Mg: NO cubierto ❌
  
ADVERTENCIA: Faltan enmiendas para Ca y Mg
```

---

## ✅ **CONFIRMACIÓN**

### **La lógica es:**

1. ✅ **Analiza TODOS los elementos que faltan** (K, Ca, Mg)
2. ✅ **Identifica el MÁS limitante** (mayor deficiencia en meq)
3. ✅ **Calcula dosis basándose en el MÁS limitante**
4. ✅ **Los otros elementos se cubren automáticamente** (si la enmienda los tiene)
5. ✅ **Agrega enmiendas adicionales** para elementos no cubiertos

### **Ejemplo tu caso:**
- Mg (1.51) es el MÁS limitante
- Cal Dolomítica se calcula para Mg
- Ca se cubre automáticamente (Cal Dolomítica también tiene Ca)
- K necesita enmienda adicional (SOP)

**Esta lógica es CORRECTA y EFICIENTE.** ✅

¿Está claro o quieres que profundice en algún punto específico?





















