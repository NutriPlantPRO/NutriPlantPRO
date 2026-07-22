# Alertas Agroclimáticas NutriPlant

## Estado del documento

- Tipo: definición funcional y técnica inicial.
- Estado: borrador para validación antes de implementar.
- Fecha: 22 de julio de 2026.
- Nombre recomendado del servicio: **Alertas Agroclimáticas NutriPlant**.
- Asunto del correo: **Pronóstico Agroclimático NutriPlant — [nombre del predio]**.

## 1. Visión

Crear un servicio público de NutriPlant que permita registrar hasta cuatro predios por persona y recibir por correo electrónico un pronóstico agroclimático por cada predio.

Cada alerta incluirá un resumen de los próximos días y un enlace personal seguro a una página con tabla, gráfica, mapa, historial reciente y descarga en PDF.

El servicio también funcionará como entrada a NutriPlant PRO mediante una promoción breve dentro de la página web. WhatsApp se conservará como canal manual complementario desde el número actual de NutriPlant.

## 2. Decisiones confirmadas

1. Acceso sin contraseña mediante enlace personal seguro enviado por correo.
2. Máximo de cuatro predios por usuario.
3. Un correo automático separado por cada predio.
4. Envíos ordinarios los lunes y jueves a las 8:00 a. m. de la zona horaria del predio.
5. Los correos saldrán desde `admin@nutriplantpro.com` mediante la configuración SMTP existente.
6. Historial visible y almacenado durante 90 días.
7. La página será pública en su acceso inicial, pero los datos personales y predios solo se consultarán mediante un token seguro.
8. WhatsApp será manual mediante botones que abran el número y texto ya preparados; no se integrará Meta Cloud API en esta primera versión.

## 3. Rutas propuestas

- `/pronosticoclimatico/`: presentación y registro.
- `/pronosticoclimatico/?token=...`: vista personal segura.
- Se podrá conservar exactamente el nombre solicitado en el dominio: `nutriplantpro.com/pronosticoclimatico`.

El token no contendrá correo, teléfono, coordenadas ni otro dato personal. Debe poder revocarse y reemplazarse.

## 4. Entrada desde NutriPlant

En el acceso de herramientas gratuitas se agregará un botón visible junto a “Registrarte”:

**Recibe alertas agroclimáticas**

Este botón abrirá `/pronosticoclimatico/`.

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

## 6. Predios

- Cada usuario puede crear, consultar, editar, activar o pausar hasta cuatro predios.
- Cada predio tiene coordenadas, zona horaria, nombre, cultivo, etapa, Kc y estado de alertas propios.
- La hora de envío se calcula por predio, no solo por país, porque un país puede contener varias zonas horarias.
- Si una persona registra predios en zonas horarias diferentes, cada correo se envía a las 8:00 a. m. local del predio correspondiente.

## 7. Calendario de alertas

### 7.1 Envíos ordinarios

**Lunes, 8:00 a. m. local**

- Correo automático: lunes, martes, miércoles y jueves.
- Página:
  - Historial: jueves, viernes, sábado y domingo anteriores.
  - Pronóstico: lunes, martes, miércoles y jueves.

**Jueves, 8:00 a. m. local**

- Correo automático: jueves, viernes, sábado, domingo y lunes.
- Página:
  - Historial: lunes, martes y miércoles anteriores.
  - Pronóstico: jueves, viernes, sábado, domingo y lunes.

Así, la página muestra el periodo comprendido entre la alerta anterior y la siguiente, separando claramente datos históricos y pronosticados.

### 7.2 Primera alerta inmediata

Al completar el registro y confirmar el consentimiento se genera y envía por correo una primera alerta en ese momento.

Esta alerta cubre desde el día de registro hasta el siguiente día ordinario de alerta, inclusive:

- Registro en martes: martes, miércoles y jueves.
- Registro en sábado: sábado, domingo y lunes.
- Registro en lunes después de las 8:00: lunes a jueves.
- Registro en jueves después de las 8:00: jueves a lunes.

Después de esa primera entrega, el predio entra al calendario normal de lunes y jueves.

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

Consulta la tabla, gráfica, mapa y PDF:
[enlace personal seguro]

Lun 27: T 18–31 °C | HR 35–82% | VPD 0.4–2.3 kPa | ETo 5.1 mm | Lluvia 0 mm
Mar 28: T 17–29 °C | HR 42–88% | VPD 0.3–1.9 kPa | ETo 4.6 mm | Lluvia 3.2 mm
[días restantes]

ETo del periodo: [x] mm
Lluvia del periodo: [x] mm

Pronóstico estimado para las coordenadas registradas. Valida las condiciones en campo.
Administrar predios o dejar de recibir alertas:
[enlace personal seguro]
```

El correo se enviará desde `admin@nutriplantpro.com` en formato HTML adaptable a móvil, con una versión de texto plano. La promoción breve de NutriPlant PRO podrá mostrarse al final del correo y dentro de la página.

En el panel administrativo, cada alerta tendrá un botón **Enviar por WhatsApp**. Este botón abrirá el WhatsApp actual de NutriPlant con el destinatario y el mismo resumen ya preparados. El administrador deberá presionar “Enviar”; no habrá bots ni automatización no oficial.

## 10. Página personal del pronóstico

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

### 10.3 Selector de predio

- Mostrar el predio actual.
- Cambiar entre los predios registrados.
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

En móvil se podrá usar una tabla desplazable o tarjetas diarias, sin eliminar variables.

### 10.6 Gráfica

Gráfica diaria combinada, inspirada en la sección Clima existente:

- Precipitación, mm.
- ETo, mm.
- ETc, mm.
- VPD mínimo, kPa.
- VPD máximo, kPa.

Se usarán ejes separados para milímetros y kPa. El usuario podrá activar u ocultar series.

### 10.7 Mapa

- Mapa satelital.
- Marcador en las coordenadas guardadas.
- Nombre del predio.
- Latitud y longitud.
- Botón “Editar predio o ubicación”.

### 10.8 PDF

Botón **Descargar pronóstico en PDF** con:

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
- Número de predios.
- Estado: pendiente, activo, pausado o baja.
- Consentimiento y fecha.
- Última alerta.
- Próxima alerta.
- Errores de entrega.

### 11.2 Acciones

- Ver y editar usuario.
- Ver y editar predios.
- Activar o pausar usuario completo.
- Activar o pausar un predio.
- Crear usuario y predio, siempre registrando la fuente del consentimiento.
- Reenviar enlace seguro.
- Regenerar o revocar enlace.
- Enviar alerta de prueba.
- Abrir el mensaje preparado en WhatsApp para enviarlo manualmente.
- Consultar historial de 90 días.
- Ver resultado SMTP: aceptado, rechazado o error de envío.

## 12. Datos que se almacenarán

No es necesario guardar cada lectura horaria cruda indefinidamente.

Sí se almacenará:

- Perfil del usuario.
- Consentimientos y sus versiones.
- Predios, coordenadas, zona horaria, cultivo y Kc.
- Estado de suscripción a alertas.
- Token seguro o su hash.
- Una fotografía del pronóstico generado en cada alerta.
- Asunto, contenido y variables enviadas por correo.
- Registro de apertura manual de WhatsApp, sin afirmar que el mensaje fue entregado.
- Estado de entrega, error y reintentos.
- Eventos de alta, pausa, reactivación y baja.

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

La regla de máximo cuatro predios se validará tanto en el servidor como en la base de datos.

Este registro será independiente de una suscripción PRO. Si el correo ya pertenece a NutriPlant PRO, podrá vincularse al perfil existente sin convertir automáticamente los predios de alertas en proyectos PRO.

## 14. Automatización

Un proceso programado se ejecutará periódicamente y:

1. Buscará predios activos cuya hora local corresponda al lunes o jueves a las 8:00.
2. Evitará duplicados mediante una clave única por predio, fecha y tipo de alerta.
3. Obtendrá los datos meteorológicos mediante un endpoint del servidor, nunca directamente desde el navegador para los envíos.
4. Calculará VPD, ETo, ETc y totales.
5. Guardará la fotografía del pronóstico.
6. Enviará el correo desde `admin@nutriplantpro.com` mediante SMTP.
7. Guardará el identificador del correo y el resultado informado por el servidor SMTP.
8. Reintentará únicamente errores temporales.

El sistema podrá confirmar que el servidor SMTP aceptó o rechazó el correo, pero no afirmará que fue leído salvo que en el futuro se incorpore un proveedor con eventos de entrega. Las bajas se procesarán directamente desde el enlace seguro incluido en cada correo.

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

### Fase 1: base funcional

- Registro y consentimientos.
- Un predio inicial.
- Enlace personal seguro.
- Página con tabla, gráfica, mapa y Kc.
- Primera alerta manual o de prueba.

### Fase 2: automatización

- Hasta cuatro predios.
- Programación por zona horaria.
- Envío automático por SMTP desde `admin@nutriplantpro.com`.
- Botones de WhatsApp manual.
- Historial de 90 días.
- Baja automática.

### Fase 3: administración y PDF

- Panel administrativo completo.
- Monitoreo de entregas.
- PDF.
- Reintentos y depuración automática.

### Fase 4: lanzamiento y medición

- Revisión legal.
- Revisión de condiciones y límites del proveedor meteorológico.
- Revisión de capacidad, reputación y límites del correo emisor.
- Métricas de registros, correos aceptados o rechazados, bajas y conversión hacia NutriPlant PRO.

## 19. Criterios mínimos de aceptación

1. Un usuario puede registrarse y guardar un predio desde móvil.
2. No se puede registrar más de cuatro predios.
3. La zona horaria se determina por coordenadas.
4. La primera alerta se genera inmediatamente con los días correctos.
5. No se duplica una alerta ordinaria.
6. Cada correo contiene únicamente el predio correspondiente.
7. El enlace no revela datos personales.
8. La página distingue historia y pronóstico.
9. Cambiar Kc actualiza ETc en tabla, gráfica y PDF.
10. La baja detiene envíos inmediatamente.
11. El administrador puede consultar usuarios, predios, estados y entregas.
12. El historial mostrado coincide con las fotografías enviadas y se depura a los 90 días.

## 20. Pendientes antes de implementar

1. Confirmar que `admin@nutriplantpro.com` permite autenticación SMTP para envíos automáticos.
2. Confirmar sus límites diarios y configurar SPF, DKIM y DMARC para reducir correos no deseados.
3. Aprobar el texto legal exacto de los consentimientos.
4. Validar si el mínimo diario de VPD puede mostrarse negativo cuando exista condensación o si se presentará como 0 kPa con una nota de riesgo de condensación.
5. Definir diseño visual final y comportamiento móvil de la tabla.
6. Definir el nombre visible del remitente, correo de respuesta y teléfono de soporte.

