# Arquitectura de NutriPlant PRO

## 🏗️ Visión General

NutriPlant PRO es una plataforma web dinámica para gestión de nutrición vegetal con arquitectura multi-usuario y multi-proyecto.

---

## 👥 Estructura de Usuarios

### Características:
- ✅ **Usuarios independientes**: Cada usuario puede estar en diferentes regiones o países
- ✅ **Autenticación**: Usuario y contraseña únicos por usuario
- ✅ **Aislamiento total**: Cada usuario solo accede a sus propios proyectos
- ✅ **Sin mezcla de información**: La información entre usuarios nunca se cruza

### Analogía: Sistema de Casilleros
```
Casillero NutriPlant PRO
  └── Cajones (Usuarios)
      └── Carpetas (Proyectos)
          └── Documentos (Pestañas/Secciones)
```

---

## 📁 Estructura de Proyectos

Cada proyecto es **independiente** dentro de un usuario. Cada proyecto tiene las siguientes **pestañas/secciones**:

### Pestañas Definidas:

1. **📍 Ubicación** - Georreferenciación del proyecto
2. **🚜 Enmienda** - Calculadora de enmiendas (ajuste de CIC del suelo)
3. **⚪ Nutrición Granular** - Programa de nutrición con fertilizantes granulares
4. **💧 Fertirriego** - Programa de nutrición con fertirriego (fertilizantes solubles)
5. **🌱 Hidroponía** - Sistema de nutrición hidropónica
6. **📊 Reporte** - Reportes y análisis del proyecto
7. **🧪 Análisis de Suelo** - Análisis y diagnóstico de suelo
8. **💊 Solución Nutritiva** - Formulación de soluciones nutritivas
9. **📋 Extracto de Pasta** - Análisis de extracto de pasta saturada
10. **💧 Agua** - Análisis de agua de riego
11. **🍃 Foliar** - Análisis foliar
12. **🍎 Fruta** - Análisis de fruta
13. **🌡️ Déficit de Presión de Vapor (VPD)** - Calculadora de VPD

### Características de Proyectos:
- ✅ **Independencia total**: Cada proyecto es una unidad separada
- ✅ **Múltiples pestañas**: Cada proyecto tiene todas las pestañas disponibles
- ✅ **Información aislada**: Los datos de un proyecto no se mezclan con otros
- ✅ **Guardado independiente**: Cada pestaña guarda su información por separado

---

## 🔐 Panel de Administración

### Funcionalidades:
- ✅ **Gestión de usuarios**: Ver, crear, editar, eliminar usuarios
- ✅ **Gestión de suscripciones**: Control de planes y suscripciones
- ✅ **Vista de proyectos por usuario**: Ver todos los proyectos de un usuario específico
- ✅ **Vista de información por proyecto**: Ver datos de cada pestaña de cada proyecto
- ✅ **Acceso privilegiado**: El admin puede ver toda la información sin restricciones

### Estructura de Navegación Admin:
```
Panel Admin
  └── Usuarios
      └── [Usuario X]
          └── Proyectos
              └── [Proyecto Y]
                  └── Pestañas
                      ├── Ubicación
                      ├── Enmienda
                      ├── Nutrición Granular
                      ├── Fertirriego
                      ├── Hidroponía
                      ├── Reporte
                      ├── Análisis de Suelo
                      ├── Solución Nutritiva
                      ├── Extracto de Pasta
                      ├── Agua
                      ├── Foliar
                      ├── Fruta
                      └── VPD
```

---

## 💾 Sistema de Almacenamiento

### Estado Actual:
- ✅ **Guardado en segundo plano**: La información se guarda automáticamente mientras el usuario trabaja
- ✅ **Almacenamiento local**: Actualmente usando localStorage (navegador)
- ✅ **Formato de datos**: Estructura JSON organizada por usuario/proyecto/pestaña

### Estructura de Almacenamiento Actual:
```
localStorage:
  nutriplant_user_[userId]
    nutriplant_project_[projectId]
      ├── location
      ├── enmienda
      ├── nutricion_granular
      ├── fertirriego
      ├── hidroponia
      ├── reporte
      ├── analisis_suelo
      ├── solucion_nutritiva
      ├── extracto_pasta
      ├── agua
      ├── foliar
      ├── fruta
      └── vpd
```

### Futuro (Nube):
- ⏳ **Migración a nube**: Se implementará después de completar la estructura
- ⏳ **Prioridad**: Terminar la estructura de la herramienta primero
- ⏳ **Estrategia**: Una vez definida la estructura completa, migrar a base de datos en la nube

---

## 🎯 Principios de Diseño

### 1. **Aislamiento Total**
- Cada usuario solo ve sus proyectos
- Cada proyecto es independiente
- Cada pestaña guarda información por separado
- No hay cruce de información entre usuarios o proyectos

### 2. **Modularidad**
- Cada pestaña es un módulo independiente
- Cada sección puede desarrollarse y mantenerse por separado
- Cambios en una pestaña no afectan a otras

### 3. **Guardado Automático**
- Guardado en segundo plano (background)
- No requiere acción explícita del usuario
- Persistencia inmediata de cambios

### 4. **Escalabilidad**
- Estructura preparada para múltiples usuarios
- Preparada para migración a nube
- Flexible para agregar nuevas pestañas

---

## 📋 Checklist de Desarrollo

### Estructura Base: ✅
- [x] Sistema de usuarios
- [x] Sistema de proyectos
- [x] Panel de administración
- [x] Sistema de guardado (localStorage)

### Pestañas Implementadas: ✅
- [x] Ubicación
- [x] Enmienda
- [x] Nutrición Granular
- [x] Fertirriego
- [ ] Hidroponía (¿implementada?)
- [ ] Reporte (¿implementada?)
- [ ] Análisis de Suelo (¿implementada?)
- [ ] Solución Nutritiva (¿implementada?)
- [ ] Extracto de Pasta (¿implementada?)
- [ ] Agua (¿implementada?)
- [ ] Foliar (¿implementada?)
- [ ] Fruta (¿implementada?)
- [ ] VPD (¿implementada?)

### Pestañas con Correcciones Recientes: ✅
- [x] Fertirriego - IDs independientes (completado)
- [x] Nutrición Granular - Independiente de Fertirriego (confirmado)

### Futuro:
- [ ] Migración a nube
- [ ] Optimización de rendimiento
- [ ] Sincronización multi-dispositivo

---

## 🤝 Trabajo en Equipo

**Tú (Usuario)**: Experto en nutrición vegetal + Visión de la plataforma NutriPlant PRO

**Yo (Asistente)**: Experto en programación + Implementación técnica

**Enfoque**: Ajustes graduales y construcción progresiva de la plataforma

---

## 📝 Notas Importantes

1. **Prioridad**: Completar la estructura de todas las pestañas antes de migrar a nube
2. **Independencia**: Cada sección debe funcionar de forma completamente independiente
3. **Consistencia**: Mantener estándares de código y estructura entre todas las pestañas
4. **Testing**: Verificar que no hay interferencias entre pestañas o proyectos

---

## ✅ Estado Actual Confirmado

Basado en el trabajo reciente:
- ✅ **Fertirriego**: Completamente independiente (IDs únicos prefijados)
- ✅ **Nutrición Granular**: Independiente (IDs propios)
- ✅ **Aislamiento**: Garantizado entre secciones
- ✅ **Guardado**: Sistema funcionando correctamente

---

*Documento actualizado para mantener sintonía en el desarrollo de NutriPlant PRO*


