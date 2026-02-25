/**
 * SCRIPT DE VERIFICACIÓN PASO A PASO
 * Ejecuta esto en la consola del navegador para verificar cada elemento
 */

(function() {
  console.log('%c🔍 VERIFICACIÓN PASO A PASO', 'color: #2563eb; font-size: 18px; font-weight: bold;');
  console.log('='.repeat(70));
  
  const resultados = [];
  
  // PASO 1: Verificar elementos básicos del DOM
  console.log('\n📋 PASO 1: ELEMENTOS BÁSICOS DEL DOM');
  console.log('-'.repeat(70));
  
  const elementosBasicos = {
    'Formulario de Login': document.getElementById('loginForm'),
    'Botón "Crear Nueva Cuenta"': document.querySelector('a[onclick*="showRegistrationModal"]'),
    'Modal de Registro': document.getElementById('registrationModal'),
    'Botón Acceso Privado': document.querySelector('button[onclick*="admin/index.html"]'),
    'Footer Copyright': Array.from(document.querySelectorAll('strong')).find(el => el.textContent.includes('© 2026')) || document.querySelector('.footer-info') || document.querySelector('strong'),
    'Footer Email': document.querySelector('a[href^="mailto:admin@nutriplantpro.com"]'),
    'Footer WhatsApp': document.querySelector('a[href*="wa.me"]'),
  };
  
  Object.keys(elementosBasicos).forEach(nombre => {
    const elemento = elementosBasicos[nombre];
    const existe = !!elemento;
    resultados.push({ elemento: nombre, existe, tipo: 'DOM' });
    
    if (existe) {
      console.log(`✅ ${nombre}: ENCONTRADO`);
      if (elemento.style && elemento.style.display === 'none') {
        console.log(`   ⚠️  Pero está oculto (display: none)`);
      }
    } else {
      console.log(`❌ ${nombre}: NO ENCONTRADO`);
    }
  });
  
  // PASO 2: Verificar funciones JavaScript
  console.log('\n🔧 PASO 2: FUNCIONES JAVASCRIPT');
  console.log('-'.repeat(70));
  
  const funciones = {
    'showRegistrationModal': typeof window.showRegistrationModal === 'function',
    'closeRegistrationModal': typeof window.closeRegistrationModal === 'function',
    'showUserInfoModal': typeof window.showUserInfoModal === 'function',
    'showConversionCalculator': typeof window.showConversionCalculator === 'function',
    'showNutrientUnitsCalculator': typeof window.showNutrientUnitsCalculator === 'function',
    'activatePayPalSubscription': typeof window.activatePayPalSubscription === 'function',
    'NUTRIPLANT_CONFIG': typeof window.NUTRIPLANT_CONFIG !== 'undefined',
  };
  
  Object.keys(funciones).forEach(nombre => {
    const existe = funciones[nombre];
    resultados.push({ elemento: `Función ${nombre}`, existe, tipo: 'JS' });
    
    if (existe) {
      console.log(`✅ Función ${nombre}: DISPONIBLE`);
    } else {
      console.log(`❌ Función ${nombre}: NO DISPONIBLE`);
    }
  });
  
  // PASO 3: Verificar campos del formulario de registro
  console.log('\n📝 PASO 3: CAMPOS DEL FORMULARIO DE REGISTRO');
  console.log('-'.repeat(70));
  
  const camposRegistro = {
    'Nombre': document.getElementById('reg-name'),
    'Email': document.getElementById('reg-email'),
    'Código de País': document.getElementById('reg-phone-code'),
    'Teléfono': document.getElementById('reg-phone'),
    'País': document.getElementById('reg-country'),
    'Estado': document.getElementById('reg-state'),
    'Ciudad': document.getElementById('reg-city'),
    'Código Postal': document.getElementById('reg-postal'),
    'Profesión': document.getElementById('reg-profession'),
    'Cultivos (checkboxes)': document.querySelectorAll('input[name="crops"]').length,
    'Contraseña': document.getElementById('reg-password'),
    'Confirmar Contraseña': document.getElementById('reg-password-confirm'),
  };
  
  Object.keys(camposRegistro).forEach(nombre => {
    const campo = camposRegistro[nombre];
    const existe = campo !== null && campo !== undefined;
    resultados.push({ elemento: `Campo ${nombre}`, existe, tipo: 'Form' });
    
    if (typeof campo === 'number') {
      console.log(`✅ ${nombre}: ${campo} checkboxes encontrados`);
    } else if (existe) {
      console.log(`✅ ${nombre}: ENCONTRADO`);
    } else {
      console.log(`❌ ${nombre}: NO ENCONTRADO`);
    }
  });
  
  // PASO 4: Verificar calculadoras
  console.log('\n🧮 PASO 4: CALCULADORAS');
  console.log('-'.repeat(70));
  
  const calculadoras = {
    'Input S → SO₃': document.getElementById('s-so3-input'),
    'Output SO₃': document.getElementById('so3-output'),
    'Input SO₃ → S': document.getElementById('so3-input'),
    'Output S (SO₃)': document.getElementById('s-so3-output'),
    'Boro valencia en datos': null, // Verificar en código
  };
  
  Object.keys(calculadoras).forEach(nombre => {
    const elemento = calculadoras[nombre];
    if (elemento === null && nombre.includes('Boro')) {
      // Verificar en el código JavaScript
      const scriptContent = document.documentElement.innerHTML;
      const tieneBoroValencia1 = scriptContent.includes("'b': { mw: 10.81, valence: 1") || 
                                 scriptContent.includes('valence: 1') && scriptContent.includes('10.81');
      resultados.push({ elemento: nombre, existe: tieneBoroValencia1, tipo: 'Calc' });
      if (tieneBoroValencia1) {
        console.log(`✅ ${nombre}: Configurado con valencia 1`);
      } else {
        console.log(`❌ ${nombre}: NO configurado correctamente`);
      }
    } else {
      const existe = !!elemento;
      resultados.push({ elemento: nombre, existe, tipo: 'Calc' });
      if (existe) {
        console.log(`✅ ${nombre}: ENCONTRADO`);
      } else {
        console.log(`❌ ${nombre}: NO ENCONTRADO`);
      }
    }
  });
  
  // PASO 5: Verificar datos de usuario
  console.log('\n👤 PASO 5: DATOS DE USUARIO');
  console.log('-'.repeat(70));
  
  try {
    const session = localStorage.getItem('np_user');
    if (session) {
      const sessionData = JSON.parse(session);
      console.log(`✅ Sesión activa: ${sessionData.email || 'N/A'}`);
      
      const userId = sessionData.userId || sessionData.user_id;
      if (userId) {
        const userKey = `nutriplant_user_${userId}`;
        const userData = localStorage.getItem(userKey);
        if (userData) {
          const user = JSON.parse(userData);
          console.log(`✅ Datos de usuario completos encontrados`);
          console.log(`   - Nombre: ${user.name || 'N/A'}`);
          console.log(`   - Email: ${user.email || 'N/A'}`);
          console.log(`   - Suscripción: ${user.subscription_status || 'N/A'}`);
          console.log(`   - Monto: $${user.subscription_amount || 0} USD`);
        } else {
          console.log(`⚠️  Datos completos de usuario NO encontrados`);
        }
      }
    } else {
      console.log(`ℹ️  No hay sesión activa`);
    }
  } catch (e) {
    console.log(`❌ Error leyendo datos: ${e.message}`);
  }
  
  // RESUMEN
  console.log('\n' + '='.repeat(70));
  console.log('%c📊 RESUMEN', 'color: #16a34a; font-size: 16px; font-weight: bold;');
  console.log('='.repeat(70));
  
  const exitosos = resultados.filter(r => r.existe).length;
  const fallidos = resultados.filter(r => !r.existe).length;
  
  console.log(`✅ Exitosos: ${exitosos}`);
  console.log(`❌ Faltantes: ${fallidos}`);
  console.log(`📊 Total verificado: ${resultados.length}`);
  
  if (fallidos > 0) {
    console.log('\n❌ ELEMENTOS FALTANTES:');
    resultados.filter(r => !r.existe).forEach(r => {
      console.log(`   - ${r.elemento} (${r.tipo})`);
    });
  }
  
  console.log('\n💡 SIGUIENTE PASO:');
  console.log('1. Revisa los elementos marcados como ❌');
  console.log('2. Recarga la página con Ctrl+Shift+R (Mac: Cmd+Shift+R)');
  console.log('3. Si persisten, ejecuta este script de nuevo');
  
  return {
    exitosos,
    fallidos,
    total: resultados.length,
    detalles: resultados
  };
})();






























