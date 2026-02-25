# 🌡️ CLIMA PARA VPD (Déficit de Presión de Vapor)

## 🎯 PASOS RÁPIDOS: BAJAR VPD DEL CLIMA EN EL POLÍGONO

**La app usa Open-Meteo:** gratuito, **sin API key** y sin registro.

1. **Tener un proyecto con polígono**  
   En **Ubicación**, dibuja y guarda el polígono del predio. La herramienta usa el centro (o centroide) del polígono para pedir el clima.

2. **En NutriPlant**  
   Ve a **Análisis: Déficit de Presión de Vapor** → **Calculadora Ambiental Simple** → clic en **🌐 Obtener del Clima**.  
   Se obtienen temperatura y humedad para esa ubicación, se rellenan los campos y se calcula el VPD. Luego puedes pulsar **💾 Guardar Cálculo**.

3. **Si falla la red**  
   Verás: *"No se pudo obtener el clima automáticamente. Ingresa los datos manualmente."* Puedes escribir temperatura y humedad a mano y usar **📊 Calcular VPD** con normalidad.

**En la web:** La petición va directo a `api.open-meteo.com` desde el navegador; no hace falta configurar servidor ni API key.

---

## 📋 OPCIONAL: OPENWEATHERMAP (si quisieras usarla por servidor)

La app ya usa **Open-Meteo** (sin key). Si en el futuro quisieras usar OpenWeatherMap vía `server.py`, below es la referencia.

---

## 🔑 CÓMO OBTENER LA API KEY (GRATIS)

### **Paso 1: Crear cuenta**
1. Ve a: https://openweathermap.org/api
2. Haz clic en **"Sign Up"** (Registrarse)
3. Completa el formulario (es gratis)

### **Paso 2: Obtener tu API Key**
1. Una vez registrado, inicia sesión
2. Ve a tu **Dashboard** o **API Keys**
3. Verás tu **API Key** (o puedes generar una nueva)
4. **Copia tu API Key** (se verá algo como: `abc123def456ghi789...`)

### **Paso 3: Configurar en el código**

**Opción A: Variable de entorno (RECOMENDADO para producción)**
```bash
# En terminal (Mac/Linux):
export OPENWEATHER_API_KEY="tu_api_key_aqui"

# Luego ejecuta el servidor:
python3 server.py
```

**Opción B: Editar server.py directamente (RÁPIDO para pruebas)**
1. Abre `server.py`
2. Busca la línea que dice:
   ```python
   weather_api_key = os.environ.get('OPENWEATHER_API_KEY', 'TU_API_KEY_AQUI')
   ```
3. Reemplaza `'TU_API_KEY_AQUI'` con tu API Key real:
   ```python
   weather_api_key = os.environ.get('OPENWEATHER_API_KEY', 'abc123def456ghi789...')
   ```
4. Guarda el archivo
5. Reinicia el servidor (`python3 server.py`)

---

## 📊 LÍMITES GRATUITOS

### **Plan Gratuito:**
- ✅ **1,000 llamadas/día** (60 por minuto)
- ✅ **Clima actual** en tiempo real
- ✅ **Temperatura y humedad relativa**
- ✅ **Sin tarjeta de crédito**

### **Si excedes el límite:**
- El plan pago más económico es **$40 USD/mes**
- Incluye 300,000 llamadas/mes
- Sin límite diario

**Recomendación:** Para empezar, el plan gratuito es suficiente. Si llegas a tener muchos usuarios activos, entonces considera el plan pago.

---

## ✅ VERIFICACIÓN

Después de configurar la API Key:

1. **Abre un proyecto** en NutriPlant PRO
2. **Asegúrate de que tenga un polígono** (pestaña Ubicación)
3. **Ve a la sección VPD** (Análisis: Déficit de Presión de Vapor)
4. **Haz clic en "🌐 Obtener Datos del Clima Actual"**
5. Si funciona correctamente, verás:
   - Temperatura del aire (llenada automáticamente)
   - Humedad relativa (llenada automáticamente)
   - Resultados de VPD y HD calculados

Si ves un error, revisa:
- ✅ Que la API Key esté correctamente configurada
- ✅ Que el servidor se haya reiniciado después de cambiar la key
- ✅ Que el proyecto tenga un polígono definido

---

## 🔒 SEGURIDAD

⚠️ **IMPORTANTE:**
- **NO subas tu API Key a GitHub** o repositorios públicos
- Si usas Git, asegúrate de que `server.py` esté en `.gitignore` o que la key esté en una variable de entorno
- Para producción, siempre usa variables de entorno

---

## 💡 PREGUNTAS FRECUENTES

**P: ¿Necesito tarjeta de crédito?**
R: No, el plan gratuito no requiere tarjeta de crédito.

**P: ¿Puedo usar la misma API Key para todos los usuarios?**
R: Sí, la API Key es compartida. Todos los usuarios usan la misma key a través del servidor.

**P: ¿Qué pasa si excedo el límite?**
R: Las llamadas fallarán temporalmente. Deberás esperar hasta el siguiente día (se resetea a medianoche UTC) o actualizar a un plan pago.

**P: ¿Cómo sé cuántas llamadas he usado?**
R: En el dashboard de OpenWeatherMap verás el uso diario y mensual.

---

## 📝 NOTAS TÉCNICAS

- La API Key se usa solo en el **servidor** (`server.py`), nunca en el código del cliente
- Todas las llamadas pasan por el servidor para proteger la key
- El endpoint es: `/api/weather?lat=X&lon=Y`
- El servidor hace proxy de las llamadas a OpenWeatherMap

---

**¿Listo para configurarlo?** Sigue los pasos arriba y estarás funcionando en minutos. 🚀



















