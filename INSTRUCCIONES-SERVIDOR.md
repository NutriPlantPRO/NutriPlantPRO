# 🚀 INSTRUCCIONES PARA INICIAR EL SERVIDOR

**Resumen rápido:** Ver **QUÉ-TENER-PARA-QUE-TODO-FUNCIONE.md** (archivos + un comando + URLs).

## ⚠️ IMPORTANTE

El chat de IA de NutriPlant PRO requiere que el servidor esté corriendo con `server.py` (NO con `python3 -m http.server`).

## 📋 Pasos para iniciar el servidor correctamente:

### Opción 1: Usando el script (Recomendado)
```bash
cd "/Users/jesusavila/Desktop/MI PROYECTO"
./start_server.sh
```

### Opción 2: Directamente con Python
```bash
cd "/Users/jesusavila/Desktop/MI PROYECTO"
python3 server.py
```

## ✅ Verificación

Cuando el servidor esté corriendo correctamente, deberías ver en la terminal:
```
Servidor corriendo en http://localhost:8000
Presiona Ctrl+C para detener
```

## 🔧 Solución de problemas

### Error: "501 Unsupported method"
- **Causa:** El servidor HTTP simple no maneja las rutas de API
- **Solución:** Asegúrate de usar `python3 server.py` (NO `python3 -m http.server`)

### Error: "Puerto 8000 en uso"
- **Causa:** Ya hay un servidor corriendo en el puerto 8000
- **Solución:** 
  1. Detén el servidor actual (Ctrl+C)
  2. O cambia el puerto en `server.py` (línea 21: `PORT = 8000`)

### El chat muestra "Error de conexión"
- **Causa:** El servidor no está corriendo o no es el correcto
- **Solución:** 
  1. Verifica que `server.py` esté corriendo
  2. Abre `http://localhost:8000/dashboard.html` en el navegador
  3. El chat debería funcionar correctamente

## 📝 Notas

- El servidor debe estar corriendo **antes** de usar el chat de IA
- Si cierras la terminal, el servidor se detendrá
- Para mantenerlo corriendo en segundo plano, puedes usar `nohup` o `screen`



























