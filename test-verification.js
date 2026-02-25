// ================================
// FUNCIÓN DE VERIFICACIÓN AUTOMÁTICA
// ================================

function verifyCalculations() {
  console.log('🧪 INICIANDO VERIFICACIÓN DE CÁLCULOS...');
  
  // Ejercicios de prueba
  const testCases = [
    {
      name: "Ejercicio 1: Suelo con exceso de K",
      input: { k: 2.00, ca: 6.00, mg: 1.00, na: 4.00, cic: 13.00 },
      expected: { k: -1.35, ca: 3.75, mg: 0.95, na: -4.00 }
    },
    {
      name: "Ejercicio 2: Suelo con exceso de Ca", 
      input: { k: 0.50, ca: 12.00, mg: 0.50, na: 0.00, cic: 13.00 },
      expected: { k: 0.15, ca: -2.25, mg: 1.45, na: 0.00 }
    },
    {
      name: "Ejercicio 3: Suelo equilibrado",
      input: { k: 0.65, ca: 9.75, mg: 1.95, na: 0.65, cic: 13.00 },
      expected: { k: 0.00, ca: 0.00, mg: 0.00, na: -0.65 }
    },
    {
      name: "Ejercicio 4: Suelo con CIC diferente",
      input: { k: 1.00, ca: 8.00, mg: 1.00, na: 3.00, cic: 20.00 },
      expected: { k: 0.00, ca: 7.00, mg: 2.00, na: -3.00 }
    }
  ];
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  testCases.forEach((testCase, index) => {
    console.log(`\n📊 ${testCase.name}`);
    console.log('📥 Datos de entrada:', testCase.input);
    
    // Simular la función calculateIdealValues
    const idealValues = calculateIdealValues(testCase.input.cic);
    console.log('🎯 Valores ideales:', idealValues);
    
    // Calcular ajustes esperados
    const calculatedAdjustments = {
      k: idealValues.k - testCase.input.k,
      ca: idealValues.ca - testCase.input.ca,
      mg: idealValues.mg - testCase.input.mg,
      na: idealValues.na - testCase.input.na
    };
    
    console.log('📤 Ajustes calculados:', calculatedAdjustments);
    console.log('✅ Ajustes esperados:', testCase.expected);
    
    // Verificar cada catión
    let testPassed = true;
    const tolerance = 0.01; // Tolerancia de 0.01 meq
    
    Object.keys(testCase.expected).forEach(cation => {
      const expected = testCase.expected[cation];
      const calculated = calculatedAdjustments[cation];
      const difference = Math.abs(expected - calculated);
      
      if (difference <= tolerance) {
        console.log(`✅ ${cation}: ${calculated} ≈ ${expected} (OK)`);
      } else {
        console.log(`❌ ${cation}: ${calculated} ≠ ${expected} (Diferencia: ${difference})`);
        testPassed = false;
      }
    });
    
    if (testPassed) {
      console.log('🎉 ¡EJERCICIO PASADO!');
      passedTests++;
    } else {
      console.log('💥 EJERCICIO FALLIDO');
    }
  });
  
  // Resumen final
  console.log('\n📋 RESUMEN DE VERIFICACIÓN:');
  console.log(`✅ Ejercicios pasados: ${passedTests}/${totalTests}`);
  console.log(`📊 Porcentaje de éxito: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ¡TODOS LOS CÁLCULOS ESTÁN CORRECTOS!');
  } else {
    console.log('⚠️ HAY ERRORES QUE CORREGIR');
  }
  
  return {
    passed: passedTests,
    total: totalTests,
    percentage: (passedTests / totalTests) * 100
  };
}

// Función auxiliar para calcular valores ideales (copiada del dashboard.js)
function calculateIdealValues(cic) {
  return {
    k: Math.round((cic * 0.05) * 100) / 100,   // 5% del CIC
    ca: Math.round((cic * 0.75) * 100) / 100,  // 75% del CIC (ideal)
    mg: Math.round((cic * 0.15) * 100) / 100,  // 15% del CIC (ideal)
    h: 0,   // Ideal = 0
    na: 0,  // Ideal = 0
    al: 0   // Ideal = 0
  };
}

// Función para probar cálculos de enmiendas
function verifyAmendmentCalculations() {
  console.log('\n🧪 VERIFICANDO CÁLCULOS DE ENMIENDAS...');
  
  // Ejemplo: 1.32 meq Ca + 1.86 meq Mg con densidad 1.1 y profundidad 30
  const testData = {
    caMeq: 1.32,
    mgMeq: 1.86,
    density: 1.1,
    depth: 30
  };
  
  console.log('📊 Datos de prueba:', testData);
  
  // Función de conversión (copiada del dashboard.js)
  function convertMeqToKgHa(meq, pesoEquivalente) {
    return (meq * pesoEquivalente * 100 * testData.density * testData.depth * 10000) / 1000000;
  }
  
  // Calcular kg/ha necesarios
  const caKgHa = convertMeqToKgHa(testData.caMeq, 20.04);
  const mgKgHa = convertMeqToKgHa(testData.mgMeq, 12.15);
  
  console.log('📤 Ca kg/ha calculado:', caKgHa.toFixed(2));
  console.log('📤 Mg kg/ha calculado:', mgKgHa.toFixed(2));
  
  // Valores esperados (calculados manualmente)
  const expectedCaKgHa = 872.9; // 1.32 × 20.04 × 100 × 1.1 × 30 × 10000 ÷ 1000000
  const expectedMgKgHa = 745.8; // 1.86 × 12.15 × 100 × 1.1 × 30 × 10000 ÷ 1000000
  
  console.log('✅ Ca kg/ha esperado:', expectedCaKgHa);
  console.log('✅ Mg kg/ha esperado:', expectedMgKgHa);
  
  // Verificar diferencias
  const caDifference = Math.abs(caKgHa - expectedCaKgHa);
  const mgDifference = Math.abs(mgKgHa - expectedMgKgHa);
  
  if (caDifference <= 1.0 && mgDifference <= 1.0) {
    console.log('🎉 ¡CÁLCULOS DE ENMIENDAS CORRECTOS!');
    return true;
  } else {
    console.log('❌ ERRORES EN CÁLCULOS DE ENMIENDAS');
    console.log(`Ca diferencia: ${caDifference.toFixed(2)}`);
    console.log(`Mg diferencia: ${mgDifference.toFixed(2)}`);
    return false;
  }
}

// Función principal de verificación completa
function runCompleteVerification() {
  console.log('🚀 INICIANDO VERIFICACIÓN COMPLETA DEL SISTEMA...');
  console.log('=' .repeat(60));
  
  const calculationResults = verifyCalculations();
  const amendmentResults = verifyAmendmentCalculations();
  
  console.log('\n' + '=' .repeat(60));
  console.log('📋 RESUMEN FINAL:');
  console.log(`✅ Cálculos de ajustes: ${calculationResults.passed}/${calculationResults.total} (${calculationResults.percentage.toFixed(1)}%)`);
  console.log(`✅ Cálculos de enmiendas: ${amendmentResults ? 'CORRECTO' : 'ERROR'}`);
  
  if (calculationResults.passed === calculationResults.total && amendmentResults) {
    console.log('🎉 ¡SISTEMA COMPLETAMENTE VERIFICADO!');
    return true;
  } else {
    console.log('⚠️ HAY PROBLEMAS QUE CORREGIR');
    return false;
  }
}

// Exportar funciones para uso en la consola
if (typeof window !== 'undefined') {
  window.verifyCalculations = verifyCalculations;
  window.verifyAmendmentCalculations = verifyAmendmentCalculations;
  window.runCompleteVerification = runCompleteVerification;
}

console.log('🔧 Funciones de verificación cargadas. Usa:');
console.log('- verifyCalculations() para verificar cálculos de ajustes');
console.log('- verifyAmendmentCalculations() para verificar cálculos de enmiendas');
console.log('- runCompleteVerification() para verificación completa');




























