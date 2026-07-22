# Alertas Agroclimáticas NutriPlant

## Estado del documento

- Tipo: definición funcional y técnica inicial.
- Estado: borrador para validación antes de implementar.
- Fecha: 22 de julio de 2026.
- Nombre recomendado del servicio: **Alertas Agroclimáticas NutriPlant**.
- Asunto del correo: **Pronóstico Agroclimático NutriPlant — [nombre del predio]**.

## 1. Visión

Crear un servicio público de NutriPlant que permita registrar un predio por persona y, después de aprobación administrativa, recibir por correo electrónico un pronóstico agroclimático para ese predio.

Cada alerta incluirá un resumen de los próximos días y un enlace personal seguro a una página con tabla, gráfica, mapa, historial reciente y descarga en PDF.

El servicio también funcionará como entrada a NutriPlant PRO mediante una promoción breve dentro de la página web. WhatsApp se conservará como canal manual complementario desde el número actual de NutriPlant.

## 2. Decisiones confirmadas

1. Acceso sin contraseña mediante enlace personal seguro enviado por correo.
2. Máximo de un predio por usuario en esta primera versión.
3. Un correo automático por usuario y ciclo de alerta.
4. Un envío semanal los domingos a las 5:00 p. m. de la zona horaria del predio.
5. Los correos saldrán desde `notifications@nutriplantpro.com` (buzón compartido), autenticando SMTP con la cuenta existente `admin@nutriplantpro.com`.
6. Historial visible y almacenado durante 90 días.
7. La página será pública en su acceso inicial, pero los datos personales y predios solo se consultarán mediante un token seguro.
8. WhatsApp será manual mediante botones que abran el número y texto ya preparados; no se integrará Meta Cloud API en esta primera versión.
9. Registrarse no activa las alertas automáticamente: cada solicitud requerirá aprobación manual del administrador.
10. El panel administrativo registrará cuándo se consulta el enlace personal para poder identificar usuarios sin actividad y pausarlos manualmente.
11. La página se diseñará primero para celular y después se adaptará a computadora.
12. Cada solicitud deberá enviar por WhatsApp un folio alfanumérico de cuatro caracteres antes de la revisión administrativa.
13. La misma vista climática funcionará como herramienta gratuita en el login y como reporte personal desde el enlace del correo.
14. El PDF estará disponible en la vista personal abierta con el enlace seguro del usuario.

## 3. Rutas y modos propuestos

- `/pronosticoclimatico/`: herramienta pública y presentación del servicio.
- `/pronosticoclimatico/?embed=login`: herramienta gratuita embebida en un modal del login.
- `/pronosticoclimatico/?view=registro`: formulario de solicitud.
- `/pronosticoclimatico/?token=...`: reporte personal seguro enviado por correo.
- `/pronosticoclimatico/?demo=1`: demostración visual con datos de ejemplo durante la primera fase de desarrollo; deberá restringirse o eliminarse antes del lanzamiento.
- Se podrá conservar exactamente el nombre solicitado en el dominio: `nutriplantpro.com/pronosticoclimatico`.

El token no contendrá correo, teléfono, coordenadas ni otro dato personal. Debe poder revocarse y reemplazarse.

## 4. Entrada desde NutriPlant

En la lista de herramientas gratuitas del login se agregará un botón:

**🌤️ Pronóstico agroclimático**

Este botón abrirá un modal del mismo tipo que las demás herramientas gratuitas y cargará `/pronosticoclimatico/?embed=login`.

### 4.1 Herramienta gratuita

Cualquier visitante podrá:

- Elegir un punto en el mapa.
- Usar su ubicación por GPS.
- Escribir latitud y longitud.
- Introducir un Kc manual o elegirlo desde la referencia FAO.
- Generar bajo demanda la lectura agroclimática.
- Consultar siete días históricos y siete días de pronóstico.
- Ver las mismas tarjetas, tabla y gráfica definidas para el reporte.

El mapa reutilizará el mismo diseño y comportamiento de la herramienta gratuita VPD:

- Leaflet con vista satelital.
- Botón **Mi ubicación**.
- Campos editables de latitud y longitud.
- Marcador arrastrable.
- Clic o toque sobre el mapa para cambiar el punto.
- Actualización sincronizada entre marcador y coordenadas.
- Botón para obtener el clima y generar la lectura.

La consulta gratuita:

- No crea automáticamente un registro de alertas.
- No guarda coordenadas en la nube.
- Puede conservar temporalmente los últimos valores en el navegador, igual que otras herramientas gratuitas.
- Solo consulta el clima cuando la persona presiona el botón de generación.
- Reutiliza temporalmente una consulta reciente para la misma ubicación y periodo para evitar llamadas repetidas innecesarias.

Dentro de los resultados se mostrará un botón destacado:

**Solicitar mi alerta agroclimática semanal**

Este botón abrirá el formulario de registro. Las coordenadas, Kc y cultivo introducidos en la herramienta podrán pasarse al formulario para que el usuario no tenga que capturarlos nuevamente.

### 4.2 Una sola interfaz, dos presentaciones

La tabla, gráfica, tarjetas, mapa y cálculos pertenecerán a un componente compartido para evitar duplicar lógica.

**Modo herramienta gratuita dentro del login**

- Se muestra dentro del modal de herramientas.
- Usa el título exacto **Pronóstico agroclimático**.
- Conserva el mismo patrón visual de las demás ventanas de herramientas gratuitas: encabezado, icono o marca de agua, botón de cierre, cuerpo desplazable y adaptación móvil.
- Permite elegir libremente ubicación y Kc.
- Incluye el botón de solicitud de alertas.
- Oculta la cabecera pública extensa, redes sociales y promoción repetida porque el login ya contiene la identidad de NutriPlant.
- No muestra controles administrativos ni datos personales.

**Modo reporte personal desde el correo**

- Carga la ubicación, Kc y fotografía climática correspondientes al usuario.
- Muestra la cabecera con logotipo, redes sociales, Manual Técnico, ingreso y suscripción a NutriPlant PRO.
- Incluye el texto breve de promoción.
- Permite editar el predio, dejar de recibir alertas y contactar por WhatsApp.
- Incluye **Descargar reporte en PDF**.
- Registra el acceso al enlace personal.

Así, el contenido técnico será el mismo, pero el marco visual y las acciones dependerán del modo de entrada.

## 5. Registro

### 5.1 Datos personales

- Nombre completo.
- Correo electrónico.
- WhatsApp con selector de lada de país y almacenamiento en formato E.164.
- Ocupación:
  - Agrónomo.
  - Técnico agrícola.
  - Estudiante.
  - Agricultor.
  - Asesor.
  - Otro.
- País.
- Estado, provincia o región.
- Código postal o ZIP.
- Cultivo.
- Superficie aproximada del cultivo:
  - Menos de 1 ha.
  - 1 a 5 ha.
  - 5 a 20 ha.
  - 20 a 50 ha.
  - Más de 50 ha.
- Etapa actual del cultivo.
- Uso principal del pronóstico:
  - Programación del riego.
  - Seguimiento de VPD.
  - Planeación de aplicaciones.
  - Planeación de labores o cosecha.
  - Prevención de riesgos climáticos.
  - Otro.
- Pregunta corta obligatoria: **¿Qué decisión deseas mejorar con estas alertas?**

### 5.2 Consentimientos

Se usarán casillas independientes y sin marcar previamente:

1. Aceptación obligatoria de términos y política de privacidad.
2. Consentimiento obligatorio para recibir los pronósticos solicitados por correo electrónico.
3. Consentimiento opcional para recibir también alertas enviadas manualmente por WhatsApp.
4. Consentimiento comercial opcional para promociones distintas del pronóstico solicitado.

Se guardará evidencia del consentimiento: fecha y hora, texto y versión aceptada, origen del formulario, idioma, correo, teléfono cuando corresponda y dirección IP cuando legalmente corresponda.

### 5.3 Primer predio

En la misma pantalla de registro:

- Nombre del predio.
- Mapa Leaflet con vista satelital.
- Botón “Mi ubicación”.
- Marcador arrastrable.
- Campos de latitud y longitud editables.
- Zona horaria IANA calculada desde las coordenadas.
- Cultivo y etapa opcionales.
- Kc opcional:
  - Selección desde la referencia FAO ya existente.
  - Captura manual.

El Kc se guarda por predio. Si no existe Kc, se muestran ETo y lluvia, pero no se calcula ni grafica ETc.

### 5.4 Solicitud y aprobación

Después de guardar correctamente el formulario:

1. Se crea un identificador interno seguro y un folio visible de cuatro caracteres alfanuméricos, por ejemplo `K7M2`.
2. La solicitud queda con estado **Pendiente de WhatsApp** y todavía no recibe pronósticos.
3. Se muestra inmediatamente el botón **Solicitar activación por WhatsApp**.
4. El botón abre el WhatsApp actual de NutriPlant con un texto preparado:

```text
Hola NutriPlant. Me interesa registrarme para recibir Alertas Agroclimáticas.
Nombre: [nombre completo]
Folio: [K7M2]
```

5. La persona debe presionar “Enviar” desde su propio WhatsApp.
6. El administrador localiza el folio en el panel, confirma manualmente que recibió el mensaje, revisa los datos y decide **Aprobar**, **Mantener pendiente** o **Rechazar**.
7. Solo al aprobar se crea el acceso personal, se activa el predio y se envía la primera alerta.

El folio:

- Tendrá exactamente cuatro caracteres en mayúscula.
- Combinará números y letras aleatorios.
- Evitará caracteres fáciles de confundir, como `0/O` y `1/I`.
- Será único entre solicitudes pendientes y activas.
- Se guardará en el registro y será visible en el panel administrativo.
- No sustituirá al identificador interno seguro de la solicitud.
- No incluirá coordenadas, correo ni tokens de acceso.

El mensaje de WhatsApp ayuda a comprobar interés y número de contacto, pero la aprobación siempre será una decisión manual dentro del panel.

## 6. Predios

- Cada usuario puede registrar únicamente un predio.
- El predio tiene coordenadas, zona horaria, nombre, cultivo, etapa, Kc y estado de alerta.
- La hora de envío se calcula con la zona horaria de las coordenadas del predio, no solo con el país.
- Reducir a un predio simplifica la experiencia, limita consultas meteorológicas y facilita revisar personalmente cada solicitud.

## 7. Calendario de alertas

### 7.1 Envío semanal

**Domingo, 5:00 p. m. local**

- Correo automático:
  - Pronóstico de los siguientes siete días calendario completos: lunes a domingo.
  - Resumen y totales del periodo.
- Página:
  - Histórico de los siete días completos anteriores: domingo a sábado.
  - Pronóstico de los siete días completos siguientes: lunes a domingo.

La vista principal contiene catorce días en total:

- Siete días históricos.
- Siete días de pronóstico.

### 7.2 Primera alerta inmediata

Al aprobar la solicitud desde el panel administrativo se genera y envía la primera alerta en ese momento.

La primera alerta se limita a la semana calendario actual, de lunes a domingo:

- Los días completos anteriores a la activación se muestran como histórico.
- El día de activación y los días restantes hasta el domingo se muestran como pronóstico.
- La página contiene únicamente siete días visibles en esta primera entrega.
- El correo incluye solamente el pronóstico desde el día de activación hasta el domingo.

Ejemplo de activación en martes:

- Histórico: lunes.
- Pronóstico: martes, miércoles, jueves, viernes, sábado y domingo.
- Total en la página: siete días.

Si la aprobación ocurre el domingo antes de las 5:00 p. m., el reporte completo se envía a las 5:00 p. m. Si ocurre después, se envía inmediatamente el reporte completo que le habría correspondido ese domingo.

Después de esa primera entrega parcial, el siguiente domingo recibe el reporte completo normal: siete días históricos y siete días de pronóstico.

## 8. Variables meteorológicas

### 8.1 Tabla diaria

- Temperatura mínima y máxima, °C.
- Humedad relativa mínima y máxima, %.
- Punto de rocío mínimo y máximo, °C.
- Radiación solar:
  - Acumulado diario en MJ/m²/día.
  - Máximo horario en W/m² como dato complementario.
- VPD mínimo y máximo, kPa.
- ETo diaria, mm/día.
- ETc diaria, mm/día, cuando exista Kc.
- Precipitación diaria, mm.
- Totales del periodo para ETo, ETc y precipitación.

La radiación no se expresará en W/m³. Para un valor instantáneo u horario se usa W/m²; para el acumulado diario se usa MJ/m²/día.

### 8.2 Cálculo de VPD

Se reutilizará el método vigente de NutriPlant:

1. Obtener datos horarios de temperatura del aire, humedad relativa y radiación.
2. Estimar la temperatura de hoja con la fórmula vigente:
   - Si radiación ≤ 200 W/m²: T hoja = T aire.
   - Si radiación > 200 W/m²: T hoja = T aire + ((radiación - 200) × 0.6 / 100).
3. Calcular por hora:
   - Presión de saturación a temperatura de hoja.
   - Presión actual de vapor desde temperatura del aire y humedad.
   - VPD = presión de saturación de la hoja − presión actual del aire.
4. Obtener el mínimo y máximo diario de los cálculos horarios.

La interfaz indicará que la temperatura de hoja y el VPD son estimaciones meteorológicas y que el microclima real puede variar en campo.

### 8.3 ETc

`ETc = ETo × Kc`

El usuario podrá cambiar el Kc desde la parte superior de la tabla o desde la edición del predio. Al cambiarlo se actualizarán inmediatamente la tabla, gráfica y PDF, y se guardará el nuevo valor para consultas posteriores.

## 9. Correo automático y WhatsApp manual

Asunto:

```text
Pronóstico Agroclimático NutriPlant — [nombre del predio]
```

Cuerpo funcional propuesto:

```text
🌤️ Pronóstico Agroclimático NutriPlant
Predio: [nombre del predio]
Periodo: [fecha inicial] al [fecha final]

VER REPORTE COMPLETO
[enlace personal seguro]

RESUMEN DEL PERIODO
Temperatura prevista: [mínima del periodo] a [máxima del periodo] °C
Humedad relativa: [mínima del periodo] a [máxima del periodo] %
VPD: [mínimo del periodo] a [máximo del periodo] kPa
ETo acumulada: [x] mm
ETc acumulada: [x] mm con Kc [x] (si existe Kc)
Precipitación acumulada: [x] mm

PRONÓSTICO DIARIO

Lun 27
Temperatura: 18–31 °C | Humedad: 35–82 %
Punto de rocío: 12–17 °C
Radiación: 22.4 MJ/m²/día | Máxima: 780 W/m²
VPD: 0.4–2.3 kPa
ETo: 5.1 mm | ETc: 4.6 mm | Lluvia: 0 mm

Mar 28
Temperatura: 17–29 °C | Humedad: 42–88 %
Punto de rocío: 13–18 °C
Radiación: 18.7 MJ/m²/día | Máxima: 690 W/m²
VPD: 0.3–1.9 kPa
ETo: 4.6 mm | ETc: 4.1 mm | Lluvia: 3.2 mm

[días restantes]

PUNTOS IMPORTANTES
Mayor demanda atmosférica: [día y VPD máximo]
Mayor demanda hídrica: [día y ETo/ETc]
Lluvia prevista más alta: [día y milímetros]

Consulta en el enlace la tabla completa, gráfica, histórico reciente,
mapa del predio y descarga en PDF.

Pronóstico estimado para las coordenadas registradas. Valida las condiciones en campo.
Editar el predio o dejar de recibir alertas:
[enlace personal seguro]
```

El correo se enviará desde `notifications@nutriplantpro.com` en formato HTML adaptable a móvil, con una versión de texto plano. En HTML, el resumen se mostrará mediante tarjetas y el pronóstico diario mediante una tabla legible. El correo contendrá los días futuros; el histórico, la gráfica, el mapa y el PDF permanecerán en la página personal para evitar un mensaje excesivamente pesado.

La promoción breve de NutriPlant PRO podrá mostrarse al final del correo y dentro de la página.

En el panel administrativo, cada alerta tendrá un botón **Enviar por WhatsApp**. Este botón abrirá el WhatsApp actual de NutriPlant con el destinatario y el mismo resumen ya preparados. El administrador deberá presionar “Enviar”; no habrá bots ni automatización no oficial.

## 10. Vista compartida y página personal del pronóstico

### 10.0 Diseño adaptable y navegación

La experiencia será **móvil primero**, porque se espera que la mayoría de las consultas lleguen desde correo y WhatsApp en el celular.

En celular:

- Una sola columna.
- Tarjetas diarias en lugar de depender únicamente de una tabla ancha.
- Botones de al menos 44 px de alto.
- Texto y cifras legibles sin ampliar la pantalla.
- Mapa, gráfica y controles ocupando todo el ancho disponible.
- Tabla completa con desplazamiento horizontal como vista secundaria.
- Acciones importantes visibles sin recorrer toda la página.

En computadora:

- Contenido centrado con ancho máximo.
- Resumen y controles en dos columnas cuando exista espacio.
- Tabla completa visible.
- Gráfica y mapa con mayor altura.

En el modo personal abierto desde el correo, la cabecera permanecerá visible e incluirá:

- **Herramientas gratuitas**.
- **Ingresar**.
- **Suscribirme a NutriPlant PRO**.

En celular estos accesos se compactarán sin ocultarlos. El botón principal de NutriPlant PRO conservará buena visibilidad, pero no bloqueará la lectura del pronóstico. Esta cabecera no se duplicará cuando la vista esté embebida dentro del modal del login.

### 10.1 Encabezado fijo

Inspirado en la vista pública de reportes:

- Logotipo de NutriPlant.
- Enlace a redes sociales.
- Enlace al Manual Técnico.
- Botón “Ingresar a NutriPlant PRO”.
- Enlace o botón de soporte.

### 10.2 Promoción breve

Texto sugerido:

> Lleva el seguimiento nutricional, hídrico y agronómico de tus cultivos con NutriPlant PRO.

Botón:

**Conocer NutriPlant PRO**

### 10.3 Predio registrado

- Mostrar el predio actual.
- Estado de alertas del predio.
- Fecha y hora de actualización.
- Diferenciar visualmente “Histórico” y “Pronóstico”.

### 10.4 Control de Kc

Sobre la tabla:

- Campo de Kc manual.
- Botón para abrir la tabla FAO.
- Búsqueda por cultivo y etapa.
- Opción para aplicar y guardar el Kc en el predio.

### 10.5 Tabla

Una fila por día y columnas para todas las variables definidas en la sección 8.

La tabla tomará como referencia visual la tabla climática de **Lectura Satelital / Radar**:

- Contenedor blanco con borde, esquinas redondeadas y encabezados de color.
- Columnas agrupadas visualmente por tipo de información.
- Primera columna con fecha y distintivo **Histórico** o **Pronóstico**.
- Encabezados cortos con ayuda emergente para explicar cada variable y unidad.
- Valores centrados y unidades visibles.
- Colores discretos para diferenciar VPD, lluvia, ETo y ETc.
- Separador visual entre el último día histórico y el primer día pronosticado.
- Desplazamiento horizontal sin romper el ancho de la página.
- Fecha fija o fácilmente identificable mientras se desplaza la tabla.

Grupos propuestos:

1. **Ambiente:** temperatura mínima/máxima, humedad mínima/máxima y punto de rocío.
2. **Radiación y VPD:** radiación acumulada, radiación máxima y VPD mínimo/máximo.
3. **Agua:** ETo, ETc, precipitación y acumulados.

En celular se mostrará primero una tarjeta resumida por día. Un botón **Ver tabla completa** abrirá la tabla desplazable con todas las columnas, sin eliminar información.

### 10.6 Gráfica

Gráfica diaria combinada inspirada en la gráfica climática de **Lectura Satelital / Radar**:

- Precipitación, mm.
- ETo, mm.
- ETc, mm.
- VPD mínimo, kPa.
- VPD máximo, kPa.

Características:

- Eje horizontal con los días.
- Eje izquierdo para milímetros: precipitación, ETo y ETc.
- Eje derecho para kPa: VPD mínimo y máximo.
- Controles superiores para activar u ocultar cada serie, como en Lectura Radar.
- Colores y leyenda consistentes con los módulos climáticos existentes.
- Fondo o franja diferente para distinguir días históricos y pronosticados.
- Línea vertical en el cambio entre histórico y pronóstico.
- Altura adaptable: compacta en celular y ampliada en computadora.
- Mensajes y espacios vacíos claros cuando una variable no esté disponible.

Temperatura, humedad, punto de rocío y radiación permanecerán visibles en la tabla y tarjetas diarias para evitar saturar la gráfica principal. Podrá agregarse una segunda gráfica atmosférica posteriormente si el uso real demuestra que hace falta.

### 10.7 Mapa

- Mapa satelital.
- Marcador en las coordenadas guardadas.
- Nombre del predio.
- Latitud y longitud.
- Botón “Editar predio o ubicación”.

### 10.8 PDF

En el modo personal abierto desde el enlace del correo se mostrará el botón **Descargar pronóstico en PDF** con:

- Identidad NutriPlant.
- Predio y coordenadas.
- Fecha de generación.
- Periodo histórico y pronosticado.
- Tabla.
- Gráfica.
- Mapa o referencia de ubicación.
- Kc utilizado y fórmula ETc.
- Fuente meteorológica y aviso técnico.

### 10.9 Baja de alertas

Botón:

**Dejar de recibir alertas por correo**

El botón actualizará inmediatamente el estado del usuario o predio mediante el enlace personal seguro, mostrará una confirmación y registrará la fecha. Cada correo también incluirá este enlace de baja.

El administrador podrá confirmar o revertir una pausa accidental, pero una baja explícita no debe depender de una acción manual para detener el siguiente envío.

Se conservará aparte un botón de contacto por WhatsApp con el texto “Quiero ayuda con mis alertas agroclimáticas”.

## 11. Panel administrativo

Nueva sección: **Alertas agroclimáticas**.

### 11.1 Tabla de usuarios

- Nombre.
- Correo.
- WhatsApp.
- Ocupación.
- País, región y CP/ZIP.
- Predio y coordenadas.
- Cultivo, superficie, etapa y uso principal.
- Respuesta a “¿Qué decisión deseas mejorar?”.
- Folio de cuatro caracteres.
- Estado: pendiente de WhatsApp, pendiente de revisión, activo, pausado, rechazado o baja.
- WhatsApp confirmado manualmente: sí/no y fecha.
- Consentimiento y fecha.
- Última alerta.
- Próxima alerta.
- Errores de entrega.
- Último acceso al enlace personal.
- Número de accesos durante los últimos 30 y 90 días.
- Indicador **Nunca abrió el enlace**.

### 11.2 Acciones

- Ver y editar usuario.
- Ver y editar el predio.
- Buscar directamente por folio.
- Marcar que el mensaje de WhatsApp fue recibido.
- Aprobar, mantener pendiente o rechazar una solicitud.
- Activar, pausar o reactivar al usuario.
- Crear usuario y predio, siempre registrando la fuente del consentimiento.
- Reenviar enlace seguro.
- Regenerar o revocar enlace.
- Enviar alerta de prueba.
- Abrir el mensaje preparado en WhatsApp para enviarlo manualmente.
- Consultar historial de 90 días.
- Ver resultado SMTP: aceptado, rechazado o error de envío.
- Filtrar usuarios activos que nunca han abierto su enlace o llevan 7, 14 o 30 días sin consultarlo.

La edición administrativa permitirá corregir:

- Nombre completo.
- Correo.
- Número de WhatsApp y lada.
- Ocupación.
- País, estado, provincia o región y CP/ZIP.
- Cultivo, superficie y etapa.
- Uso principal y respuesta sobre la decisión que desea mejorar.
- Nombre del predio.
- Latitud y longitud mediante campos y marcador arrastrable.
- Kc y su origen manual o FAO.
- Estado de la solicitud y notas internas.

Al cambiar las coordenadas, el sistema recalculará la zona horaria y las siguientes consultas climáticas utilizarán la nueva ubicación. Los reportes históricos conservarán las coordenadas con las que fueron generados para no alterar el registro de lo que realmente se envió.

Antes de guardar coordenadas nuevas se mostrará una confirmación. La modificación registrará fecha, administrador y valores anteriores y nuevos. El folio, identificador interno, consentimientos originales y eventos históricos no serán campos de edición libre; tendrán acciones específicas de regeneración o corrección para no romper la trazabilidad.

La pausa por falta de uso será manual. El sistema mostrará la información para decidir, pero no desactivará automáticamente a una persona solo por no abrir el enlace.

### 11.3 Métricas de interés

El panel mostrará indicadores para ayudar a priorizar solicitudes, sin aprobar ni rechazar automáticamente:

- WhatsApp recibido.
- Predio marcado correctamente.
- Cultivo, superficie y etapa completos.
- Objetivo de uso seleccionado.
- Respuesta corta completada.
- Accesos a los primeros tres reportes.
- Último acceso y días sin actividad.

Puntuación orientativa propuesta:

- 30 puntos: envió el WhatsApp con folio.
- 20 puntos: guardó correctamente el predio.
- 20 puntos: completó cultivo, superficie y etapa.
- 20 puntos: explicó qué decisión desea mejorar.
- 10 puntos: completó todos los datos restantes.

La puntuación será una ayuda visual. No se utilizará para discriminar por profesión, nivel de estudios, forma de escribir o tamaño del predio.

También se mostrarán métricas generales del proceso:

- Solicitudes iniciadas.
- Mensajes de WhatsApp confirmados.
- Solicitudes pendientes de revisión.
- Usuarios aprobados y rechazados.
- Usuarios activos, pausados y dados de baja.
- Usuarios que abrieron 0, 1, 2 o 3 de sus primeros reportes.

### 11.4 Mapa administrativo de predios

En el apartado donde actualmente se encuentra **Mapa de conexiones** se agregará un segundo botón:

**🗺️ Predios con alertas agroclimáticas**

Este mapa será independiente del mapa de conexiones:

- **Mapa de conexiones:** ubicación aproximada obtenida por IP.
- **Mapa de predios agroclimáticos:** coordenadas exactas registradas para calcular el pronóstico.

El mapa reutilizará Leaflet y el patrón del mapa administrativo existente e incluirá:

- Vista de calles y vista satelital.
- Agrupación de marcadores cuando existan varios predios cercanos.
- Ajuste automático para mostrar todos los puntos.
- Filtros por estado: pendiente, activo, pausado, rechazado o baja.
- Colores diferentes de marcador según el estado.
- Búsqueda por nombre, correo, folio, cultivo, país o región.

Al tocar o hacer clic en un marcador se abrirá una ficha con:

- Nombre y folio.
- Correo y WhatsApp.
- Ocupación.
- Estado de la solicitud o alerta.
- Nombre del predio.
- Cultivo, superficie y etapa.
- Latitud y longitud.
- Última alerta.
- Último acceso al reporte.
- Botones **Ver ficha completa** y **Editar usuario/predio**.

El mapa y sus datos exactos serán visibles únicamente para administradores autorizados. En celular, la ficha se mostrará como panel inferior para que siga siendo fácil de usar.

## 12. Datos que se almacenarán

No es necesario guardar cada lectura horaria cruda indefinidamente.

Sí se almacenará:

- Perfil del usuario.
- Folio visible e identificador interno de la solicitud.
- Consentimientos y sus versiones.
- Predios, coordenadas, zona horaria, cultivo y Kc.
- Estado de suscripción a alertas.
- Token seguro o su hash.
- Una fotografía del pronóstico generado en cada alerta.
- Asunto, contenido y variables enviadas por correo.
- Registro de apertura manual de WhatsApp, sin afirmar que el mensaje fue entregado.
- Eventos de acceso al enlace personal, con fecha, usuario y predio.
- Estado de entrega, error y reintentos.
- Eventos de alta, pausa, reactivación y baja.
- Historial de cambios administrativos en datos personales, configuración y coordenadas.

Las fotografías de pronóstico y entregas se conservarán 90 días y después se eliminarán automáticamente, salvo registros mínimos que deban conservarse por seguridad, consentimiento o cumplimiento legal.

Guardar la fotografía es necesario para que el historial coincida con el mensaje realmente enviado, aunque el proveedor meteorológico actualice después su pronóstico.

## 13. Modelo de datos inicial

Tablas nuevas propuestas:

- `climate_alert_subscribers`
- `climate_alert_consents`
- `climate_alert_plots`
- `climate_alert_snapshots`
- `climate_alert_deliveries`
- `climate_alert_access_tokens`
- `climate_alert_events`

La regla de máximo un predio se validará tanto en el servidor como en la base de datos mediante una relación única por suscriptor.

El folio de cuatro caracteres tendrá una restricción de unicidad entre solicitudes pendientes y activas. Si el generador produce una colisión, deberá intentar otro folio antes de guardar.

Este registro será independiente de una suscripción PRO. Si el correo ya pertenece a NutriPlant PRO, podrá vincularse al perfil existente sin convertir automáticamente los predios de alertas en proyectos PRO.

## 14. Automatización

Un proceso programado se ejecutará periódicamente y:

1. Buscará predios activos cuya hora local corresponda al domingo a las 5:00 p. m.
2. Evitará duplicados mediante una clave única por predio, fecha y tipo de alerta.
3. Obtendrá los datos meteorológicos mediante un endpoint del servidor, nunca directamente desde el navegador para los envíos.
4. Calculará VPD, ETo, ETc y totales.
5. Guardará la fotografía del pronóstico.
6. Enviará el correo desde `notifications@nutriplantpro.com` mediante SMTP (autenticado con `admin@`).
7. Guardará el identificador del correo y el resultado informado por el servidor SMTP.
8. Reintentará únicamente errores temporales.

El sistema podrá confirmar que el servidor SMTP aceptó o rechazó el correo, pero no afirmará que fue leído salvo que en el futuro se incorpore un proveedor con eventos de entrega. Las bajas se procesarán directamente desde el enlace seguro incluido en cada correo.

El acceso al reporte se contará cuando la página personal valide el token y solicite sus datos. No se usarán píxeles invisibles dentro del correo. Este registro indica que el enlace fue consultado, pero no garantiza por sí solo que la persona haya leído todo el reporte.

La base actual ya contiene un patrón de `pg_cron` + Supabase Edge Function para tareas programadas. Puede reutilizarse como punto de partida, pero el motor de alertas, la cola, la deduplicación y los reintentos serán componentes nuevos.

## 15. Fuente meteorológica y licencia

La primera versión continuará usando el mismo endpoint gratuito de Open-Meteo que actualmente utiliza NutriPlant, sin crear una suscripción meteorológica adicional.

Antes de un lanzamiento comercial amplio se revisarán de nuevo sus condiciones, límites y atribución. Si el proveedor exige un cambio o el volumen supera sus límites, se podrá migrar posteriormente a un plan comercial o a otra fuente.

La capa de acceso meteorológico se diseñará como un adaptador para poder cambiar de proveedor sin reescribir la interfaz, cálculos, almacenamiento o correos.

## 16. Seguridad y privacidad

- No exponer credenciales SMTP ni claves de proveedores en el navegador.
- No guardar tokens personales en texto plano cuando pueda almacenarse su hash.
- Aplicar Row Level Security en Supabase.
- Separar endpoints públicos, personales y administrativos.
- La vista personal consultará los datos mediante endpoints de servidor que validen el token; las tablas de suscriptores y coordenadas no se expondrán directamente al cliente anónimo.
- Limitar intentos de registro y reenvío de enlaces.
- Proteger el endpoint de envío para impedir correos no autorizados o duplicados.
- Cifrar o proteger datos personales según la infraestructura disponible.
- No mostrar teléfonos, correos o coordenadas en registros públicos.
- Registrar acciones administrativas.
- Reforzar la autenticación del panel administrativo antes de agregar esta sección. El acceso actual basado en una clave dentro de la URL no es suficiente para administrar teléfonos, consentimientos y ubicaciones precisas; se requerirá sesión administrativa, autorización del lado del servidor y caducidad de sesión.
- Actualizar política de privacidad y términos para incluir ubicación precisa, mensajería, proveedor climático, retención y baja.

## 17. Componentes existentes que pueden reutilizarse

- Open-Meteo por coordenadas en `climate-functions.js`.
- Mapa Leaflet, geolocalización y marcador arrastrable de `vpd-free.html`.
- Fórmula vigente de temperatura de hoja y VPD de `vpd-free.html` y `dashboard.js`.
- Tabla de referencia Kc FAO de `climate-kc-fao-data.js`.
- Cálculo `ETc = ETo × Kc` de `assets/np-irrigation-balance-core.js`.
- Gráficas de clima con Chart.js en `climate-functions.js`.
- Estructura visual, token y descarga PDF de los reportes compartidos.
- Supabase, perfiles y patrones visuales del panel administrativo, después de reforzar su acceso.
- Envío de correo mediante el patrón SMTP existente en Plan PRO.
- Términos y política de privacidad actuales como base para una actualización.

## 18. Fases recomendadas

### Fase 0: prototipo visual revisable

- Construir la vista compartida con datos de demostración.
- Habilitar temporalmente `/pronosticoclimatico/?demo=1`.
- Revisar desde computadora y celular.
- Ajustar tabla, gráfica, tarjetas, mapa, cabecera y PDF antes de conectar automatizaciones.

### Fase 1: base funcional

- Herramienta gratuita dentro del login.
- Generación climática por mapa, GPS o coordenadas.
- Botón para solicitar alertas desde la herramienta.
- Registro y consentimientos.
- Un solo predio por usuario.
- Solicitud por WhatsApp y aprobación manual.
- Enlace personal seguro.
- Página con tabla, gráfica, mapa y Kc.
- Primera alerta al aprobar.

### Fase 2: automatización

- Programación por zona horaria.
- Envío automático por SMTP desde `notifications@nutriplantpro.com`.
- Botones de WhatsApp manual.
- Historial de 90 días.
- Baja automática.
- Registro de accesos al enlace personal.

### Fase 3: administración y PDF

- Panel administrativo completo.
- Monitoreo de entregas.
- PDF.
- Reintentos y depuración automática.

### Fase 4: lanzamiento y medición

- Revisión legal.
- Revisión de condiciones y límites del proveedor meteorológico.
- Revisión de capacidad, reputación y límites del correo emisor.
- Métricas de solicitudes, aprobaciones, correos aceptados o rechazados, accesos al enlace, pausas, bajas y conversión hacia NutriPlant PRO.

## 19. Criterios mínimos de aceptación

1. Un usuario puede registrarse y guardar un predio desde móvil.
2. No se puede registrar más de un predio.
3. La zona horaria se determina por coordenadas.
4. Cada registro genera y guarda un folio alfanumérico de cuatro caracteres sin colisiones activas.
5. Una solicitud nueva no recibe pronósticos antes de la aprobación administrativa.
6. Al aprobar entre lunes y sábado, la primera alerta muestra la semana actual con días anteriores históricos y los restantes hasta el domingo como pronóstico.
7. Cada alerta ordinaria se envía una sola vez el domingo a las 5:00 p. m. local.
8. El reporte dominical normal separa siete días históricos y siete días de pronóstico.
9. No se duplica una alerta ordinaria.
10. Cada correo contiene únicamente el predio correspondiente.
11. El enlace no revela datos personales.
12. La página funciona correctamente en celular y computadora.
13. Los accesos a herramientas gratuitas, ingreso y suscripción permanecen visibles.
14. La página distingue historia y pronóstico.
15. Cambiar Kc actualiza ETc en tabla, gráfica y PDF.
16. La baja detiene envíos inmediatamente.
17. El administrador puede buscar por folio, aprobar, rechazar, pausar y reactivar usuarios.
18. El panel muestra métricas de interés, último acceso y usuarios que nunca consultaron el enlace.
19. El administrador puede editar todos los datos corregibles y mover el marcador del predio.
20. Un cambio de coordenadas recalcula la zona horaria sin modificar reportes históricos.
21. El mapa administrativo muestra los predios por estado y permite abrir o editar su ficha desde cada marcador.
22. El historial mostrado coincide con las fotografías enviadas y se depura a los 90 días.
23. La herramienta gratuita permite generar la lectura sin registrarse ni guardar coordenadas en la nube.
24. La herramienta gratuita y el reporte personal reutilizan la misma tabla, gráfica y lógica de cálculo.
25. El botón de registro dentro de la herramienta conserva ubicación, cultivo y Kc ya capturados.
26. La cabecera, redes, promoción, controles personales y PDF aparecen únicamente en el modo personal correspondiente.
27. La herramienta se llama exactamente **Pronóstico agroclimático** y su mapa conserva la interacción de la herramienta gratuita VPD.

## 20. Pendientes antes de implementar

1. Confirmar SMTP de `admin@nutriplantpro.com` y permiso “Enviar como” hacia `notifications@nutriplantpro.com`.
2. Confirmar sus límites diarios y configurar SPF, DKIM y DMARC para reducir correos no deseados.
3. Aprobar el texto legal exacto de los consentimientos.
4. Validar si el mínimo diario de VPD puede mostrarse negativo cuando exista condensación o si se presentará como 0 kPa con una nota de riesgo de condensación.
5. Definir diseño visual final y comportamiento móvil de la tabla.
6. Definir el nombre visible del remitente, correo de respuesta y teléfono de soporte.

