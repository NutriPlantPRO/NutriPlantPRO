/**
 * SCRIPT DE DIAGNÓSTICO COMPLETO - NutriPlant PRO
 * Ejecuta este script en la consola del navegador para verificar todos los avances
 */

(function() {
  console.log('%c🔍 DIAGNÓSTICO COMPLETO DE NUTRIPLANT PRO', 'color: #2563eb; font-size: 16px; font-weight: bold;');
  console.log('='.repeat(60));
  
  const resultados = {
    exitosos: [],
    fallidos: [],
    advertencias: []
  };
  
  // 1. VERIFICAR ELEMENTOS DEL DOM
  console.log('\n📋 1. VERIFICANDO ELEMENTOS DEL DOM...');
  
  const elementos = {
    'Botón Usuario (hamburger)': document.getElementById('btn-user-info'),
    'Modal Usuario': document.getElementById('userInfoModal'),
    'Contenido Modal Usuario': document.getElementById('userInfoContent'),
    'Botón Calculadora Óxido': document.getElementById('btn-conversion-calculator'),
    'Botón Calculadora Unidades': document.getElementById('btn-nutrient-units-calculator'),
    'Footer Copyright': document.querySelector('.footer-info'),
    'Footer Email': document.querySelector('.contact-email'),
    'Footer WhatsApp': document.querySelector('.contact-whatsapp'),
    'Sidebar': document.getElementById('sidebar'),
    'Menu': document.getElementById('menu'),
    'View': document.getElementById('view')
  };
  
  Object.keys(elementos).forEach(nombre => {
    const elemento = elementos[nombre];
    if (elemento) {
      resultados.exitosos.push(`✅ ${nombre}: Encontrado`);
      console.log(`✅ ${nombre}:`, elemento);
    } else {
      resultados.fallidos.push(`❌ ${nombre}: NO encontrado`);
      console.error(`❌ ${nombre}: NO encontrado`);
    }
  });
  
  // 2. VERIFICAR FUNCIONES JAVASCRIPT
  console.log('\n🔧 2. VERIFICANDO FUNCIONES JAVASCRIPT...');
  
  const funciones = {
    'showUserInfoModal': window.showUserInfoModal,
    'closeUserInfoModal': window.closeUserInfoModal,
    'loadUserInfo': typeof loadUserInfo !== 'undefined' ? loadUserInfo : null,
    'showConversionCalculator': window.showConversionCalculator,
    'showNutrientUnitsCalculator': window.showNutrientUnitsCalculator,
    'np_loadProjects': window.np_loadProjects,
    'np_saveProjects': window.np_saveProjects,
    'projectStorage': window.projectStorage
  };
  
  Object.keys(funciones).forEach(nombre => {
    const funcion = funciones[nombre];
    if (typeof funcion === 'function') {
      resultados.exitosos.push(`✅ Función ${nombre}: Disponible`);
      console.log(`✅ Función ${nombre}:`, typeof funcion);
    } else if (funcion !== null && funcion !== undefined) {
      resultados.exitosos.push(`✅ ${nombre}: Disponible`);
      console.log(`✅ ${nombre}:`, typeof funcion);
    } else {
      resultados.fallidos.push(`❌ Función ${nombre}: NO disponible`);
      console.error(`❌ Función ${nombre}: NO disponible`);
    }
  });
  
  // 3. VERIFICAR DATOS DE USUARIO
  console.log('\n👤 3. VERIFICANDO DATOS DE USUARIO...');
  
  try {
    const sessionData = localStorage.getItem('np_user');
    if (sessionData) {
      const session = JSON.parse(sessionData);
      resultados.exitosos.push(`✅ Sesión de usuario: Encontrada`);
      console.log('✅ Sesión:', session);
      
      const userId = session.userId || session.user_id;
      if (userId) {
        const userKey = `nutriplant_user_${userId}`;
        const userData = localStorage.getItem(userKey);
        if (userData) {
          const user = JSON.parse(userData);
          resultados.exitosos.push(`✅ Datos completos de usuario: Encontrados`);
          console.log('✅ Datos de usuario:', {
            nombre: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            subscription_status: user.subscription_status
          });
        } else {
          resultados.advertencias.push(`⚠️ Datos completos de usuario: NO encontrados (solo sesión)`);
          console.warn('⚠️ Datos completos de usuario NO encontrados');
        }
      }
    } else {
      resultados.fallidos.push(`❌ Sesión de usuario: NO encontrada`);
      console.error('❌ Sesión de usuario NO encontrada');
    }
  } catch (e) {
    resultados.fallidos.push(`❌ Error leyendo datos de usuario: ${e.message}`);
    console.error('❌ Error:', e);
  }
  
  // 4. VERIFICAR PROYECTOS
  console.log('\n📁 4. VERIFICANDO PROYECTOS...');
  
  try {
    const currentProjectId = localStorage.getItem('currentProjectId');
    if (currentProjectId) {
      resultados.exitosos.push(`✅ Proyecto actual: ${currentProjectId}`);
      console.log('✅ Proyecto actual:', currentProjectId);
    } else {
      resultados.advertencias.push(`⚠️ No hay proyecto seleccionado`);
      console.warn('⚠️ No hay proyecto seleccionado');
    }
    
    // Contar proyectos
    let projectCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('nutriplant_project_') || key.startsWith('nutriplant_user_') && key.includes('_project_'))) {
        projectCount++;
      }
    }
    resultados.exitosos.push(`✅ Proyectos encontrados: ${projectCount}`);
    console.log(`✅ Proyectos encontrados: ${projectCount}`);
  } catch (e) {
    resultados.fallidos.push(`❌ Error verificando proyectos: ${e.message}`);
    console.error('❌ Error:', e);
  }
  
  // 5. VERIFICAR ESTILOS CSS
  console.log('\n🎨 5. VERIFICANDO ESTILOS CSS...');
  
  const estilos = {
    'btn-user': document.querySelector('.btn-user'),
    'btn-calculator': document.querySelector('.btn-calculator'),
    'modal': document.querySelector('.modal'),
    'footer': document.querySelector('.site-footer')
  };
  
  Object.keys(estilos).forEach(nombre => {
    const elemento = estilos[nombre];
    if (elemento) {
      const estilosAplicados = window.getComputedStyle(elemento);
      resultados.exitosos.push(`✅ Estilos ${nombre}: Aplicados`);
      console.log(`✅ Estilos ${nombre}:`, {
        display: estilosAplicados.display,
        visibility: estilosAplicados.visibility
      });
    } else {
      resultados.advertencias.push(`⚠️ Elemento con clase ${nombre}: NO encontrado`);
    }
  });
  
  // 6. VERIFICAR ERRORES EN CONSOLA
  console.log('\n🚨 6. VERIFICANDO ERRORES...');
  
  // Capturar errores recientes (si es posible)
  const errorCount = resultados.fallidos.length;
  if (errorCount > 0) {
    resultados.advertencias.push(`⚠️ Se encontraron ${errorCount} elementos/funciones faltantes`);
  }
  
  // RESUMEN FINAL
  console.log('\n' + '='.repeat(60));
  console.log('%c📊 RESUMEN DEL DIAGNÓSTICO', 'color: #16a34a; font-size: 14px; font-weight: bold;');
  console.log('='.repeat(60));
  console.log(`✅ Exitosos: ${resultados.exitosos.length}`);
  console.log(`❌ Fallidos: ${resultados.fallidos.length}`);
  console.log(`⚠️ Advertencias: ${resultados.advertencias.length}`);
  
  if (resultados.fallidos.length > 0) {
    console.log('\n❌ ELEMENTOS FALTANTES:');
    resultados.fallidos.forEach(item => console.error(item));
  }
  
  if (resultados.advertencias.length > 0) {
    console.log('\n⚠️ ADVERTENCIAS:');
    resultados.advertencias.forEach(item => console.warn(item));
  }
  
  console.log('\n✅ ELEMENTOS ENCONTRADOS:');
  resultados.exitosos.forEach(item => console.log(item));
  
  // RECOMENDACIONES
  console.log('\n💡 RECOMENDACIONES:');
  if (resultados.fallidos.length > 0) {
    console.log('1. Recarga la página con Ctrl+Shift+R (o Cmd+Shift+R en Mac)');
    console.log('2. Limpia la caché del navegador');
    console.log('3. Verifica que todos los archivos .js se estén cargando correctamente');
  } else {
    console.log('✅ Todo parece estar funcionando correctamente!');
    console.log('Si no ves los elementos, puede ser un problema de caché.');
    console.log('Intenta: Ctrl+Shift+R (o Cmd+Shift+R en Mac)');
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Retornar resultados para uso programático
  return resultados;
})();






























