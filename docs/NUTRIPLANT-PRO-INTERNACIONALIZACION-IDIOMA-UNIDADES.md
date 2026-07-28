# NutriPlant Pro internacional — Idiomas y sistemas de unidades

> **Estado:** Fase 0 — Auditoría concluida el 28 de julio de 2026.  
> Resultado detallado: `docs/AUDITORIA-INTERNACIONALIZACION-IDIOMA-UNIDADES.md`.

## 1. Visión

Convertir NutriPlant Pro, actualmente diseñado en español y con unidades del Sistema Internacional (SI), en una plataforma preparada para operar inicialmente en:

- Español + sistema métrico/SI.
- Inglés + sistema métrico/SI.
- Inglés + US customary.
- Español + US customary, si el usuario así lo decide.

El idioma y el sistema de unidades serán dos preferencias independientes. No se debe asumir que elegir inglés implica usar unidades imperiales ni que elegir español implica usar siempre el sistema métrico.

Esta evolución permitirá atender Norteamérica, Europa y otras regiones donde el inglés funciona como idioma técnico o comercial, respetando al mismo tiempo las unidades utilizadas localmente.

## 2. Contrato de experiencia para el usuario

### 2.1 Dos preferencias independientes y visibles

La pantalla de inicio de sesión y la de registro mostrarán dos selectores:

1. **Idioma de la interfaz**
   - Español
   - English

2. **Sistema de unidades**
   - Métrico / Sistema Internacional
   - US customary

Se utilizará el nombre **US customary** y no la palabra genérica “imperial”, porque el galón, la tonelada y otras unidades británicas no coinciden con las utilizadas en Estados Unidos.

Los dos selectores serán independientes y permitirán estas cuatro combinaciones:

- Español + métrico/SI.
- English + métrico/SI.
- English + US customary.
- Español + US customary.

Cambiar el idioma nunca cambiará automáticamente el sistema de unidades, ni viceversa.

### 2.2 Aplicación inmediata antes de iniciar sesión

Al cambiar el idioma en login o registro, los textos de esa misma pantalla se actualizarán inmediatamente. Al cambiar el sistema de unidades, quedará seleccionada la forma en que se capturarán y presentarán las cantidades después de entrar.

En una primera visita, la aplicación podrá sugerir:

- Idioma según el navegador, con español como fallback para idiomas no soportados.
- US customary cuando la región detectada sea Estados Unidos.
- Métrico/SI para las demás regiones.

La detección será únicamente una sugerencia inicial. La decisión visible del usuario siempre tendrá prioridad.

Las preferencias deben cargarse antes de renderizar la interfaz para evitar que aparezca brevemente el idioma o sistema equivocado.

### 2.3 Visitantes y calculadoras gratuitas

Una persona sin cuenta podrá usar los mismos selectores desde las calculadoras gratuitas y demás contenido interactivo público.

Para visitantes:

- La selección se guardará localmente en el navegador.
- Se conservará entre calculadoras y visitas posteriores.
- Entradas, resultados, validaciones, ayudas, gráficas y exportaciones respetarán la combinación elegida.
- No se exigirá iniciar sesión para utilizar idioma o unidades estadounidenses.

Todas las herramientas gratuitas deberán consumir el mismo núcleo de idioma y unidades. No se implementarán conversiones aisladas en cada página.

### 2.4 Precedencia y sincronización al autenticar

Antes de autenticar no es posible conocer con seguridad la preferencia remota del perfil. Por ello se aplicará esta regla:

1. El login inicia con la última selección guardada en el navegador o con la sugerencia inicial.
2. Si el usuario modifica alguno de los selectores durante el login actual, esa selección explícita gana.
3. Después de autenticar, las preferencias modificadas explícitamente se guardan en el perfil.
4. Si el usuario no tocó los selectores durante el login actual, prevalecen las preferencias existentes en su perfil.
5. La combinación finalmente resuelta se copia también al almacenamiento local para mantener coherencia con las herramientas públicas.

La implementación deberá registrar internamente si cada selector fue modificado durante el login, para no sobrescribir accidentalmente un perfil existente con una sugerencia automática.

Para usuarios existentes que todavía no tengan estas preferencias:

- `language = 'es'`
- `unit_system = 'metric'`

### 2.5 Preferencias dentro de la sesión

Después de entrar, las preferencias quedarán guardadas en el perfil y podrán modificarse en:

`Perfil > Idioma y unidades`

El cambio se aplicará sin cerrar sesión a:

- Navegación, menús, botones, mensajes, ayudas y validaciones.
- Formularios, nombres de campos, placeholders y selectores.
- Entradas numéricas, resultados y calculadoras.
- Gráficas, tablas, mapas, clima y paneles.
- Reportes, exportaciones, archivos PDF y documentos compartidos.
- Módulos PRO, calculadoras gratuitas y panel administrativo.
- Manual técnico, contenido de soporte y páginas públicas cuando estén traducidas.

Si una traducción todavía no existe, se utilizará el texto en español como fallback controlado y se registrará la clave faltante. Nunca se mostrará la clave interna al usuario final.

### 2.6 Cambio de unidades con datos abiertos

Cambiar el sistema de unidades no debe reinterpretar un número como si perteneciera a la nueva unidad. Debe conservar la misma cantidad física.

Ejemplo:

`100 kg/ha` debe mostrarse como aproximadamente `89.218 lb/acre`, no como `100 lb/acre`.

Reglas:

- Los campos numéricos válidos y completos se convertirán a la nueva unidad de presentación.
- Los campos vacíos permanecerán vacíos.
- Los valores incompletos o inválidos no se convertirán silenciosamente; se conservarán para corrección y se volverán a validar.
- Los cálculos se repetirán desde el valor canónico, nunca desde el valor presentado y redondeado.
- Los cambios de idioma solo modificarán textos y formatos; no alterarán cantidades.
- Todo valor visible deberá indicar su unidad.

### 2.7 Alcance de una combinación activa

La combinación activa de idioma y unidades representa una configuración transversal de toda la experiencia, no una preferencia exclusiva del dashboard.

Debe aplicarse igualmente en:

- Login, registro, recuperación de contraseña y perfil.
- Calculadoras gratuitas.
- Módulos agronómicos y módulos PRO.
- Resultados intermedios y finales.
- Tooltips, leyendas, ejes de gráficas y tablas.
- Mensajes de error y advertencias agronómicas.
- Impresiones, PDFs, CSV, Excel y reportes compartidos.

Los símbolos químicos, fórmulas, identificadores internos y códigos de productos no se traducirán.

## 3. Principio técnico central

NutriPlant Pro debe conservar internamente una sola unidad canónica, preferentemente SI, y convertir únicamente en las entradas y salidas visibles para el usuario.

Ejemplo:

1. El usuario introduce `10 lb/acre`.
2. La aplicación convierte y guarda el valor canónico cuando exista una equivalencia válida.
3. Los cálculos internos trabajan con SI.
4. La interfaz presenta el resultado en la unidad elegida por cada usuario.

Esto evita duplicar fórmulas, reduce errores de redondeo y permite que dos usuarios con preferencias diferentes consulten el mismo proyecto.

También deben guardarse, cuando sea necesario:

- Valor canónico.
- Unidad canónica.
- Valor y unidad originalmente capturados.
- Precisión o redondeo de presentación.

## 4. Distinción necesaria: idioma, unidades y región

Son configuraciones relacionadas, pero no equivalentes:

- **Idioma:** textos de la interfaz y contenido.
- **Sistema de unidades:** forma de capturar y mostrar magnitudes.
- **Región:** formatos de fecha, hora, separadores decimales, moneda y convenciones locales.

Ejemplos:

- Reino Unido: inglés con muchas unidades métricas.
- Estados Unidos: inglés con unidades US customary.
- Canadá: inglés o francés y uso mixto de unidades.
- Europa técnica: frecuentemente inglés con SI.
- Latinoamérica: español con SI.

En la primera fase se implementarán idioma y unidades. La región puede añadirse después sin acoplarla a esas dos preferencias.

## 5. Familias de magnitudes que debemos inventariar

Antes de programar conversiones se debe crear un catálogo completo de las unidades que hoy usa NutriPlant Pro.

### Longitud y profundidad

- mm, cm, m, km
- in, ft, mi

### Superficie

- m², ha, km²
- ft², acre

### Masa

- mg, g, kg, t
- oz, lb, short ton

### Volumen

- mL, L, m³
- fl oz, US pint, US quart, US gallon, ft³

Se debe especificar **US gallon**. El galón imperial británico no tiene el mismo volumen y no debe mezclarse con el galón estadounidense.

### Caudal

- L/s, L/min, m³/h
- US gal/min (gpm), US gal/h

### Presión

- Pa, kPa, bar
- psi

### Temperatura

- °C
- °F

### Precipitación, riego y lámina de agua

- mm
- in
- m³/ha
- US gal/acre
- acre-inch

### Concentración y solución nutritiva

- mg/L
- mmol/L
- meq/L
- mol/m³
- kg/m³
- g/L
- lb/1,000 US gal
- ppm, solo cuando su significado esté definido

### Aplicación por superficie

- kg/ha
- g/ha
- L/ha
- lb/acre
- oz/acre
- US gal/acre

### Conductividad, pH y otras variables

- pH no cambia de unidad.
- EC puede mostrarse en dS/m o mS/cm, que son numéricamente equivalentes.
- µS/cm requiere conversión de escala.
- Porcentajes y relaciones adimensionales no deben tratarse como unidades convertibles.

### Clima y producción

- velocidad: km/h, m/s, mph
- radiación y energía: revisar cada fórmula antes de convertir
- rendimiento: kg/ha, t/ha, lb/acre, short ton/acre
- evapotranspiración: mm/día, in/día

## 6. Regla agronómica crítica: no confundir concentración con dosis

Una conversión solo es directa cuando ambas unidades representan la misma magnitud.

### Conversión directa por volumen

Para soluciones nutritivas:

`1 kg/m³ = 1 g/L ≈ 8.3454 lb/1,000 US gal`

Por ejemplo:

`2 kg/m³ ≈ 16.6908 lb/1,000 US gal`

Esta conversión es válida porque ambos valores representan masa de fertilizante por volumen de agua.

### Conversión directa por superficie

Para una dosis aplicada al terreno:

`1 kg/ha ≈ 0.89218 lb/acre`

Por ejemplo:

`100 kg/ha ≈ 89.218 lb/acre`

### Conversión que necesita contexto

`kg/m³` no se puede convertir directamente a `lb/acre`.

Para hacerlo se necesita conocer el volumen de agua aplicado por superficie. La relación conceptual es:

`dosis por superficie = concentración × volumen de agua por superficie`

Por tanto, NutriPlant Pro debe pedir o conocer datos como:

- Concentración del fertilizante en el agua.
- Volumen total de riego.
- Superficie tratada.
- Lámina de riego o volumen aplicado por acre/hectárea.

Solo entonces podrá calcular una dosis equivalente en `kg/ha` o `lb/acre`.

La interfaz debe distinguir claramente:

- **Receta de tanque o concentración:** masa/volumen.
- **Dosis de campo:** masa/superficie.
- **Volumen de aplicación:** volumen/superficie.
- **Cantidad total:** masa o volumen total.

## 7. Decisiones de producto

### 7.1 Decisiones cerradas

1. Idioma y sistema de unidades serán preferencias independientes.
2. Los selectores estarán visibles en login, registro, perfil y herramientas públicas.
3. Los visitantes conservarán su selección localmente.
4. La preferencia explícitamente modificada durante el login tendrá prioridad y se sincronizará con el perfil.
5. Se usará **US customary** para Estados Unidos, sin mezclarlo con el sistema imperial británico.
6. El SI será el sistema canónico de cálculo y persistencia.
7. El usuario capturará y visualizará valores en el sistema elegido; la aplicación convertirá las entradas a canónico.
8. Los datos históricos se tratarán como SI legado y no se convertirán masivamente.
9. Las conversiones se centralizarán y rechazarán magnitudes incompatibles.
10. Las calculadoras gratuitas y los módulos autenticados compartirán la misma infraestructura.

### 7.2 Políticas recomendadas que debe concretar la matriz maestra

- **Precisión:** definir decimales y tolerancia por magnitud, no mediante una regla global.
- **Unidades alternativas:** no duplicarlas en todos los campos. Mostrarlas únicamente en ayudas, comparaciones técnicas o reportes donde aporten contexto.
- **Reportes estáticos y PDF:** conservar el idioma y las unidades seleccionados al generarlos, declarar ambos en el documento y no modificarlos posteriormente.
- **Reportes web compartidos:** permitir que el lector cambie la presentación cuando la fuente canónica esté disponible; si solo existe HTML congelado, mostrar claramente la configuración usada al generarlo.
- **Importaciones:** exigir unidad en el encabezado o pedir un mapeo explícito antes de importar. Nunca inferir silenciosamente una unidad ambigua.
- **Exportaciones:** incluir la unidad en cada encabezado de columna y, cuando corresponda, metadatos de idioma, sistema y fecha de generación.
- **Vocabulario:** mantener un glosario ES/EN revisado para fertilizantes, cultivos, etapas fenológicas, análisis y advertencias. Se traducirá el significado técnico, no solamente las palabras.
- **Conversiones contextuales:** solicitar los datos faltantes y explicar por qué son necesarios; no ofrecer una equivalencia aproximada entre magnitudes distintas.

## 8. Arquitectura funcional propuesta

### Preferencias del perfil

- `language`: inicialmente `es` o `en`.
- `unit_system`: inicialmente `metric` o `us_customary`.
- `locale`: opcional en una fase posterior, por ejemplo `es-MX`, `en-US` o `en-GB`.

Durante la etapa pública también existirá una copia local de `language` y `unit_system`. Esa copia no sustituye al perfil autenticado; permite aplicar la experiencia elegida antes del login y en herramientas gratuitas.

La resolución de preferencias debe ejecutarse en un único servicio y devolver tanto los valores como su procedencia:

- sugerencia del navegador;
- almacenamiento local;
- perfil autenticado;
- selección explícita de la sesión actual.

Esto permite aplicar la precedencia definida sin duplicar reglas entre páginas.

### Catálogo de magnitudes y unidades

Cada campo numérico convertible debe declarar:

- Magnitud física.
- Unidad canónica.
- Unidades permitidas.
- Fórmula de conversión.
- Precisión.
- Etiqueta traducida.
- Reglas de validación.

No conviene repartir fórmulas de conversión por distintas pantallas. Debe existir un servicio o módulo central de unidades.

### Traducciones

Los textos visibles deben reemplazarse por claves de traducción, por ejemplo:

- `common.save`
- `units.kilograms_per_hectare`
- `nutrition.tank_concentration`
- `validation.missing_application_volume`

Los valores guardados, identificadores internos y nombres de campos de base de datos no deben traducirse.

## 9. Plan de trabajo por fases

### Fase 0 — Auditoría concluida

1. Inventariar textos, campos, fórmulas y unidades.
2. Clasificar cada dato por magnitud física.
3. Detectar unidades implícitas en interfaz, código y archivos.
4. Revisar PDFs, gráficas, importaciones, exportaciones y herramientas gratuitas.
5. Identificar cálculos que necesitan contexto adicional.

**Entregable:** auditoría técnica y matriz maestra de unidades.

### Fase 1 — Fundamentos

1. Diseñar la migración de `language`, `unit_system` y `locale` en perfiles.
2. Crear el servicio único de resolución y sincronización de preferencias.
3. Implementar el núcleo de traducciones ES/EN.
4. Implementar el núcleo central de magnitudes y conversiones.
5. Crear formateadores comunes de cantidades, números, fechas y unidades.
6. Definir persistencia local para visitantes.
7. Crear pruebas unitarias para conversiones y precedencia de preferencias.

**Entregable:** infraestructura compartida y probada, sin migrar todavía todos los módulos.

### Fase 2 — Acceso y estructura común

1. Incorporar los dos selectores en login y registro.
2. Aplicar el idioma inmediatamente en las pantallas públicas.
3. Sincronizar la selección explícita después de autenticar.
4. Añadir `Perfil > Idioma y unidades`.
5. Migrar navegación, mensajes comunes, validaciones y recuperación de contraseña.
6. Crear el componente compartido para las calculadoras gratuitas.
7. Evitar parpadeos cargando preferencias antes del primer render.

**Entregable:** una experiencia coherente desde antes de iniciar sesión hasta el dashboard.

### Fase 3 — Piloto técnico controlado

Migrar primero la calculadora de solución nutritiva/hidroponía para validar:

- Traducciones técnicas.
- Entradas y resultados en ambos sistemas.
- Conversión `kg/m³ ↔ lb/1,000 US gal`.
- Masa, volumen y densidad de fertilizantes líquidos.
- Diferencia entre concentración y dosis por superficie.
- Cambio de unidades con datos abiertos.
- Persistencia canónica, reportes y exportaciones.

**Entregable:** una herramienta completa operando correctamente en las cuatro combinaciones.

### Fase 4 — Migración por módulos

Orden recomendado:

1. Calculadoras gratuitas.
2. Fertirriego y nutrición granular.
3. Enmiendas, suelo, agua, foliar y demás análisis.
4. Clima, riego y balance hídrico.
5. Programas de nutrición.
6. Reportes, PDFs, importaciones y exportaciones.
7. Chat y conocimiento agronómico.
8. Panel administrativo y Plan PRO.
9. Manual técnico, ayuda y contenido público.

Cada módulo deberá cerrar su inventario, traducción, conversiones y pruebas antes de pasar al siguiente.

### Fase 5 — Validación y lanzamiento gradual

1. Ejecutar pruebas unitarias, de integración y de ida y vuelta.
2. Comparar igualdad física de resultados SI y US customary.
3. Revisar el contenido con un agrónomo familiarizado con Estados Unidos.
4. Revisar el inglés con vocabulario agronómico profesional.
5. Validar móvil, escritorio, impresión, PDF y archivos.
6. Probar visitantes, usuarios existentes, proyectos históricos y reportes compartidos.
7. Activar para usuarios piloto y registrar errores de traducción o conversión.
8. Publicar documentación, videos y SEO internacional.
9. Abrir el acceso gradualmente por mercado.

## 10. Matriz mínima de pruebas

Cada flujo seleccionado debe probarse en:

1. Español + métrico.
2. Inglés + métrico.
3. Inglés + US customary.
4. Español + US customary.

También se deben probar:

- Primera visita en navegador español, inglés estadounidense y otro idioma.
- Persistencia local entre dos calculadoras gratuitas distintas.
- Cambio de idioma dentro del login antes de autenticar.
- Perfil existente sin tocar los selectores del login: debe conservarse el perfil.
- Selector modificado explícitamente en el login: debe actualizarse el perfil.
- Carga inicial sin parpadeo del idioma o sistema incorrecto.
- Cambio de sistema con un formulario abierto y valores válidos.
- Campos vacíos, incompletos o inválidos durante un cambio de sistema.
- Cambio de preferencias después de guardar datos.
- Dos usuarios viendo el mismo proyecto con unidades distintas.
- Exportación e importación sin perder la unidad original.
- Valores límite, negativos cuando sean válidos y campos vacíos.
- Redondeos y conversiones repetidas.
- Fórmulas dependientes de superficie, volumen o densidad.
- Fallback controlado cuando falte una traducción.
- Igualdad física del resultado en las cuatro combinaciones.

## 11. Riesgos principales

- Traducir etiquetas sin adaptar el vocabulario agronómico.
- Confundir galón estadounidense con galón imperial.
- Convertir unidades de distinta dimensión.
- Redondear antes de terminar los cálculos.
- Guardar únicamente el valor presentado y acumular errores.
- Dejar unidades ocultas en fórmulas, textos, PDFs o columnas de archivos.
- Suponer que todos los usuarios de habla inglesa trabajan en imperial.
- Interpretar `ppm` sin confirmar el contexto.
- Convertir masa de producto como si fuera masa de nutriente.
- No considerar densidad en fertilizantes líquidos.

## 12. Primer entregable recomendado

Antes de modificar la aplicación, preparar una **matriz maestra de unidades** con estas columnas:

- Módulo.
- Pantalla o cálculo.
- Campo.
- Significado agronómico.
- Magnitud física.
- Unidad SI actual.
- Unidad US customary propuesta.
- Conversión directa: sí/no.
- Datos adicionales requeridos.
- Precisión.
- Ejemplo validado.
- Observaciones y riesgo.

Con esta matriz podremos saber el alcance real, definir las conversiones correctas y evitar implementar equivalencias agronómicamente inválidas.

## 13. Criterio de éxito

NutriPlant Pro estará preparado para internacionalización cuando:

- Cada usuario pueda elegir idioma y unidades de manera independiente.
- Los selectores funcionen desde login, registro, perfil y calculadoras gratuitas.
- Visitantes y usuarios autenticados conserven correctamente sus preferencias.
- Los cálculos produzcan el mismo resultado físico sin importar cómo se presenten.
- Cambiar unidades nunca reinterprete ni altere la cantidad física.
- Toda cifra visible indique su unidad.
- Las conversiones sean centralizadas, verificadas y reproducibles.
- Los reportes expliquen claramente las unidades utilizadas.
- No se conviertan magnitudes incompatibles sin solicitar el contexto necesario.
- La experiencia en inglés sea técnica y naturalmente comprensible, no una traducción literal.

