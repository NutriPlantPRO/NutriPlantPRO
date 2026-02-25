#!/bin/bash
echo "🚀 Iniciando servidor para NutriPlant PRO..."
echo "📁 Directorio: $(pwd)"
echo "🌐 URL: http://localhost:8000/dashboard.html"
echo ""
echo "⚠️ IMPORTANTE: Este servidor maneja las rutas de API (/api/openai, /api/paypal)"
echo "Presiona Ctrl+C para detener el servidor"
echo ""

# Usar server.py que maneja las rutas de API correctamente
python3 server.py


