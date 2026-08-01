# Auditoría de internacionalización — Idioma y unidades

**Proyecto:** NutriPlant Pro  
**Fecha:** 28 de julio de 2026  
**Alcance:** interfaz, cálculos agronómicos, persistencia, APIs, reportes, herramientas gratuitas, manual técnico y pruebas.

## 1. Resultado ejecutivo

NutriPlant Pro opera actualmente como una plataforma en español con unidades del Sistema Internacional implícitas en casi todo el producto.

La auditoría confirma:

- No existe una infraestructura global de internacionalización.
- No existen preferencias persistentes `language`, `unit_system` o `locale` en los perfiles de Supabase.
- Los proyectos guardan números en JSON sin metadatos explícitos de unidad.
- Los cálculos agronómicos están distribuidos en varios archivos y usan SI como supuesto implícito.
- No existe un servicio central para convertir entre SI y US customary.
- El inglés existe parcialmente en la generación de reportes PDF mediante reemplazos de texto.
- El mapa ya calcula hectáreas y acres, pero no responde a una preferencia del usuario.
- El conversor independiente contiene varias unidades estadounidenses, pero no participa en los cálculos ni en la persistencia de proyectos.
- La plataforma no tiene colaboración multiusuario sobre un mismo proyecto; los reportes compartidos son documentos HTML estáticos.

La internacionalización es viable, pero no debe comenzar traduciendo pantallas de forma aislada. Primero se necesitan preferencias persistentes, un núcleo de unidades, reglas de formato y pruebas automáticas.

## 2. Alcance técnico encontrado

### Aplicación principal

- `dashboard.js`: aproximadamente 23,300 líneas.
- `dashboard.html`: aproximadamente 8,100 líneas.
- `login.html`: aproximadamente 4,300 líneas.
- `admin/index.html`: aproximadamente 15,700 líneas.
- `planpro/index.html`: aproximadamente 36,200 líneas.
- Interfaz principal construida con HTML y JavaScript vanilla.
- No se encontró React, Vue ni una librería de i18n para la interfaz principal.

### Módulos productivos

- Autenticación, registro y perfil.
- Inicio y proyectos.
- Ubicación y radar satelital.
- Enmiendas.
- Nutrición granular.
- Fertirriego.
- Hidroponía y solución nutritiva.
- Reportes.
- Seis tipos de análisis de laboratorio.
- Clima, VPD y balance hídrico.
- Chat y conocimiento agronómico.
- Panel administrativo.
- Plan PRO.
- Manual técnico público.
- Aproximadamente 16 herramientas gratuitas independientes.

## 3. Estado actual por componente

| Componente | Estado actual | Brecha |
|---|---|---|
| Idioma de interfaz | Español hardcodeado | Falta catálogo ES/EN y función central `t()` |
| Idioma de PDF | ES/EN parcial | Traducción frágil por reemplazo de cadenas |
| Preferencia de idioma | `language: 'es'` solo local en un objeto | No se sincroniza con Supabase |
| Preferencia de unidades | No existe | Falta perfil, onboarding y selector |
| Configuración regional | Fechas frecuentes en `es-MX` | Falta `locale` y formateadores comunes |
| Unidades de proyectos | SI implícito | Números históricos sin metadatos |
| Conversión US | Conversor gratuito aislado | No se usa en módulos PRO |
| Superficie | Mapa calcula ha y acres | Falta elegir cuál es la presentación primaria |
| Backend/API | Mensajes y catálogos en español | Falta resolver idioma del usuario |
| Manual técnico | 25 capítulos en español | Requiere versión inglesa posterior |
| Pruebas | Casos métricos puntuales | Falta matriz ES/EN × métrico/US |

## 4. Hallazgos de interfaz e idioma

### 4.1 Textos visibles

Los textos aparecen en tres capas:

1. HTML estático.
2. Plantillas HTML construidas dentro de JavaScript.
3. Mensajes dinámicos como alertas, validaciones, tablas y gráficas.

Esto impide resolver la traducción únicamente cambiando archivos HTML.

### 4.2 Infraestructura parcial existente

- `config-no-traducir-terminos.js` y `apply-no-traducir.js` protegen símbolos técnicos frente a traductores automáticos.
- `translate="no"` y `notranslate` se usan en unidades y fórmulas.
- Los reportes utilizan un selector ES/EN y un helper parcial.
- Algunas herramientas detectan inglés mediante el texto del título.

Estas soluciones ayudan, pero no forman una infraestructura de internacionalización.

### 4.3 Formatos regionales

Se encontraron múltiples usos directos de:

- `toLocaleDateString('es-MX')`
- `toLocaleString('es-MX')`
- PayPal con locale español.
- Clima solicitado en español y unidades métricas.

Se requiere una capa común:

- `formatDate(value, locale)`
- `formatNumber(value, locale, precision)`
- `formatQuantity(value, magnitude, unitSystem, locale)`

### 4.4 Reportes

El reporte en inglés cambia títulos y textos, pero mantiene valores en unidades métricas. La traducción usa numerosos reemplazos de cadenas después de crear el HTML.

Riesgos:

- Cobertura incompleta.
- Reemplazos accidentales dentro de otros textos.
- Diferencias entre reporte local, reporte administrativo y reporte compartido.
- Apariencia de internacionalización aunque las unidades no hayan cambiado.

## 5. Hallazgos de perfiles y persistencia

### 5.1 Perfil

La tabla `profiles` no contiene:

- `language`
- `unit_system`
- `locale`

La autenticación y sincronización de perfil tampoco leen ni escriben estas preferencias.

### 5.2 Proyectos históricos

Los valores se guardan principalmente dentro de `projects.data` como números cuyo significado y unidad se infieren por la pantalla y el código.

Ejemplos:

- Rendimiento con opciones `t/ha` o `kg/ha`.
- Dosis en `kg/ha`.
- Precipitación y evapotranspiración en `mm`.
- Volumen de riego en `m³` o `m³/ha`.
- Densidad aparente en `g/cm³`.
- Profundidad en `cm`.
- Concentración en `ppm` o `meq/L`.

No se recomienda convertir masivamente el JSON histórico. Debe asumirse como SI legado y migrarse de manera gradual y explícita.

### 5.3 Reportes compartidos

Compartir un reporte genera un HTML congelado. No existe actualmente una vista dinámica del proyecto que se adapte a las preferencias de quien recibe el enlace.

La regla de “dos usuarios viendo el mismo proyecto con unidades distintas” corresponde a una posible colaboración futura, no al comportamiento actual.

## 6. Inventario prioritario de magnitudes

| Magnitud | Unidad actual principal | Presentación US propuesta | Conversión |
|---|---|---|---|
| Superficie | ha, m² | acre, ft² | Directa |
| Masa | kg, g, t métrica | lb, oz, short ton | Directa |
| Volumen | L, m³ | US gal, ft³ | Directa |
| Temperatura | °C | °F | Directa |
| Longitud/profundidad | mm, cm, m | in, ft | Directa |
| Precipitación/ET | mm | in | Directa |
| Dosis superficial | kg/ha | lb/acre | Directa |
| Volumen superficial | m³/ha | US gal/acre, acre-inch | Directa |
| Concentración de producto | kg/m³, g/L | lb/1,000 US gal | Directa |
| Rendimiento | t/ha | short ton/acre o bushel/acre | Directa o contextual |
| Densidad de suelo | g/cm³ | g/cm³ (equivalencia opcional lb/ft³) | Primaria fija; secundaria |
| Presión | bar, kPa | psi | Directa |
| Caudal absoluto | L/s, L/min, m³/h | gpm, US gal/h | Directa |
| Conductividad | dS/m, mS/cm | normalmente las mismas | No convertir o cambiar escala |
| pH | pH | pH | No convertir |
| CIC | meq/100g, cmol(+)/kg | normalmente las mismas | No convertir |
| Concentración iónica | ppm, mg/L, meq/L | normalmente las mismas | Contexto obligatorio |
| Composición elemental/óxido | %, factores químicos | igual | No convertir |

## 7. Conversiones directas confirmadas

### Dosis por superficie

`1 kg/ha ≈ 0.89218 lb/acre`

### Concentración masa/volumen

`1 kg/m³ = 1 g/L ≈ 8.3454 lb/1,000 US gal`

### Volumen de agua por superficie

`1 m³/ha ≈ 106.907 US gal/acre`

### Lámina de agua

`1 mm ≈ 0.0393701 in`

### Superficie

`1 ha ≈ 2.47105 acres`

Estas conversiones deben centralizarse y probarse. No deben copiarse de forma independiente en cada módulo.

## 8. Conversiones que requieren contexto

| Conversión solicitada | Motivo | Datos requeridos |
|---|---|---|
| kg/m³ o ppm → lb/acre | Concentración y dosis superficial son magnitudes diferentes | Volumen de agua aplicado por superficie |
| kg/ha → ppm de inyección | La concentración depende del agua aplicada | m³/ha o gal/acre |
| ppm de tanque → cantidad total | Falta el volumen total | m³, L o US gal |
| meq/100g → lb/acre | El análisis no expresa masa por superficie | Profundidad y densidad aparente |
| % materia orgánica → lb N/acre | Depende del volumen de suelo y mineralización | Profundidad, densidad y factor anual |
| t/ha → bushel/acre | El bushel depende del cultivo y humedad comercial | Cultivo, peso estándar y humedad |
| kg de fertilizante líquido → US gal | La masa no determina sola el volumen | Densidad del producto |
| tasa L/m³ → gpm | Una razón de inyección no es un caudal absoluto | Caudal principal y tiempo |

## 9. Riesgos agronómicos y numéricos

### P0 — Bloqueantes

1. Confundir concentración con dosis por superficie.
2. Interpretar `ppm` igual en suelo, agua, solución nutritiva y dureza.
3. Convertir fertilizante líquido sin densidad.
4. Usar bushel/acre sin tabla específica por cultivo.
5. Confundir tonelada métrica con short ton.
6. Guardar el valor presentado en vez del valor canónico.
7. Redondear antes de terminar los cálculos.
8. Mantener fórmulas duplicadas con factores diferentes.

### Inconsistencias encontradas

- Densidad aparente por defecto con valores diferentes en distintas fórmulas.
- Factores óxido/elemental duplicados en varios archivos.
- Uso alternado de `ton/ha` y `t/ha`.
- `ppm` utilizado para varias magnitudes relacionadas, pero no idénticas.
- Conversor independiente con galón estadounidense y galón británico.

Para el producto internacional se debe usar explícitamente **US gallon** y separar cualquier conversión británica como herramienta avanzada, no como parte de `us_customary`.

## 10. Mapa de módulos y prioridad

| Prioridad | Módulo | Motivo |
|---|---|---|
| P0 | Perfiles y Supabase | Sin preferencias no existe experiencia persistente |
| P0 | Núcleo de unidades | Evita fórmulas duplicadas y conversiones inválidas |
| P0 | Hidroponía/solución nutritiva | Piloto para concentración, masa y volumen |
| P0 | Fertirriego | Une dosis superficial, concentración y lámina |
| P0 | Enmiendas/suelo | Conversión depende de profundidad y densidad |
| P0 | Balance hídrico | Requiere mm, m³/ha, in y gal/acre coherentes |
| P1 | Shell, login y perfil | Selector de idioma y unidades |
| P1 | Nutrición granular | Principalmente kg/ha ↔ lb/acre |
| P1 | Agua y ácidos | Dureza, meq/L, mL/m³ y densidad |
| P1 | Reportes | Deben reflejar idioma y unidades |
| P1 | Clima y VPD | °C/°F, mm/in y formatos regionales |
| P2 | Herramientas gratuitas | Muchas páginas independientes |
| P2 | Chat y conocimiento | Traducción técnica, no literal |
| P3 | Admin, Plan PRO y manual | Gran volumen, posterior al núcleo |

## 11. Arquitectura mínima recomendada

### 11.1 Perfil

Agregar:

```text
language: 'es' | 'en'
unit_system: 'metric' | 'us_customary'
locale: string | null
```

Valores iniciales seguros para usuarios existentes:

```text
language = 'es'
unit_system = 'metric'
locale = null
```

### 11.2 Núcleo de unidades

Crear un módulo compartido, por ejemplo:

`assets/np-units-core.js`

Responsabilidades:

- Definir magnitudes.
- Definir unidad canónica SI.
- Convertir entrada a canónico.
- Convertir canónico a presentación.
- Formatear según locale.
- Definir precisión por magnitud.
- Rechazar conversiones entre dimensiones diferentes.
- Exigir contexto cuando corresponda.

### 11.3 Núcleo de idioma

Crear:

- `assets/np-i18n.js`
- `locales/es.json`
- `locales/en.json`

Responsabilidades:

- `t(key, params)`
- Carga de idioma.
- Fallback controlado al español.
- Paridad de claves entre catálogos.
- Formato de fechas y números.
- Traducción de mensajes dinámicos.

Los identificadores internos, claves de base de datos, símbolos químicos y códigos de fertilizantes no deben traducirse.

### 11.4 Persistencia

Regla:

- Cálculos y persistencia en SI canónico.
- Presentación según el perfil.
- Conservar la unidad original cuando sea relevante para importaciones o auditoría.
- Marcar como legado métrico los datos previos a la migración.

## 12. Piloto recomendado

El piloto debe ser **solución nutritiva/hidroponía**, incluyendo:

1. Selector global ES/EN.
2. Selector métrico/US customary.
3. Concentración `kg/m³ ↔ lb/1,000 US gal`.
4. Volumen `m³/L ↔ US gal`.
5. Masa total `kg ↔ lb`.
6. Fertilizantes líquidos con densidad.
7. Advertencia cuando se intente convertir concentración a `lb/acre`.
8. Persistencia SI canónica.
9. Reporte en las cuatro combinaciones.
10. Pruebas de ida y vuelta.

Después del piloto debe seguir fertirriego, porque permite validar la unión correcta entre concentración, volumen de agua y dosis por superficie.

## 13. Plan de ejecución actualizado

### Etapa 1 — Fundamentos

1. Migración de preferencias en Supabase.
2. Sincronización en autenticación y perfil.
3. Núcleo central de unidades.
4. Núcleo central de i18n.
5. Formateadores de fecha, número y cantidad.
6. Pruebas unitarias.

### Etapa 2 — Shell de aplicación

1. Registro y primer acceso.
2. Login.
3. Perfil.
4. Navegación y mensajes comunes.
5. Carga temprana de preferencias.

### Etapa 3 — Piloto técnico

1. Solución nutritiva/hidroponía.
2. Conversor de magnitudes integrado.
3. Reporte piloto.
4. Validación agronómica.

### Etapa 4 — Núcleo agronómico

1. Fertirriego.
2. Nutrición granular.
3. Enmiendas y fertilidad del suelo.
4. Análisis de agua.
5. Clima, riego y balance hídrico.
6. Otros análisis.

### Etapa 5 — Expansión

1. Herramientas gratuitas.
2. Reportes completos.
3. Chat y conocimiento.
4. Admin y Plan PRO.
5. Manual y contenido público en inglés.
6. SEO internacional.

## 14. Pruebas obligatorias

Cada flujo debe cubrir:

1. Español + métrico.
2. Inglés + métrico.
3. Inglés + US customary.
4. Español + US customary.

Pruebas adicionales:

- Conversión ida y vuelta con tolerancia definida.
- US gallon distinto de imperial gallon.
- Cambio de unidades después de guardar datos.
- Igualdad física del resultado en ambos sistemas.
- Reportes con todas las unidades visibles.
- Importación con unidad explícita.
- Datos históricos tratados como SI.
- Densidad obligatoria para líquidos.
- Contexto obligatorio para concentración ↔ superficie.
- Cultivo obligatorio para bushel/acre.

## 15. Decisiones cerradas por la auditoría

1. Idioma y unidades serán preferencias independientes.
2. El sistema interno permanecerá en SI.
3. El modo internacional será `us_customary`, no una mezcla ambigua llamada “imperial”.
4. Los galones se identificarán como US gal.
5. Los datos históricos no se convertirán masivamente.
6. La solución nutritiva será el primer piloto.
7. `lb/acre` no reemplazará automáticamente a unidades de concentración.
8. Las fórmulas de conversión se centralizarán.
9. Los reportes deberán declarar idioma y sistema de unidades.
10. La traducción será técnica y revisada, no traducción automática de toda la página.

## 16. Próximo paso autorizado recomendado

La auditoría concluye la Fase 0. El siguiente bloque de trabajo debe limitarse a los fundamentos:

1. Diseñar la migración SQL de preferencias.
2. Definir el contrato del núcleo de unidades.
3. Construir las pruebas de conversiones P0.
4. Implementar el selector en perfil y primer acceso.
5. Ejecutar el piloto de solución nutritiva.

No se recomienda traducir todavía el monolito completo de `dashboard.js` ni los 25 capítulos del manual.

