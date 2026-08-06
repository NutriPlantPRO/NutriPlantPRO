/**
 * Pronóstico agroclimático — i18n + unit display (es/en, metric/us_customary).
 * Prefs: URL ?lang=&units= → NpPrefs → localStorage nutriplant_ui_prefs_v1 → es+metric.
 */
(function (w) {
  'use strict';

  var PREFS_KEY = 'nutriplant_ui_prefs_v1';
  var reportOverride = null;

  var DICT = {
    doc_title: {
      es: 'Agroclimático | NutriPlant PRO',
      en: 'Agroclimate | NutriPlant PRO'
    },
    meta_description: {
      es: 'Pronóstico agroclimático NutriPlant por ubicación: VPD, ETo, ETc, precipitación, temperatura, humedad, radiación y punto de rocío.',
      en: 'NutriPlant agroclimate forecast by location: VPD, ETo, ETc, precipitation, temperature, humidity, radiation, and dew point.'
    },
    brand_aria: { es: 'NutriPlant PRO', en: 'NutriPlant PRO' },
    nav_aria: { es: 'Accesos NutriPlant', en: 'NutriPlant links' },
    go_platform: { es: 'Ir a NutriPlant PRO', en: 'Go to NutriPlant PRO' },
    social_aria: { es: 'Redes sociales', en: 'Social networks' },
    about_us: { es: 'Sobre Nosotros', en: 'About us' },
    whatsapp_channel: { es: 'Canal de WhatsApp', en: 'WhatsApp channel' },
    eyebrow: {
      es: 'NutriPlant PRO · información meteorológica por coordenadas',
      en: 'NutriPlant PRO · weather information by coordinates'
    },
    title: { es: 'Agroclimático', en: 'Agroclimate' },
    lead: {
      es: 'Consulta temperatura, humedad, punto de rocío, radiación, VPD, ETo, ETc y precipitación para tu ubicación.',
      en: 'Check temperature, humidity, dew point, radiation, VPD, ETo, ETc, and precipitation for your location.'
    },
    location_kicker: { es: 'Ubicación', en: 'Location' },
    location_h2: { es: 'Selecciona el punto del predio', en: 'Select the plot point' },
    location_help: {
      es: 'Usa tu ubicación, escribe coordenadas o mueve el marcador. La lectura representa un punto meteorológico y puede diferir del microclima dentro del dosel.',
      en: 'Use your location, enter coordinates, or move the marker. The reading represents a weather point and may differ from the microclimate inside the canopy.'
    },
    lat: { es: 'Latitud', en: 'Latitude' },
    lng: { es: 'Longitud', en: 'Longitude' },
    plot_name: { es: 'Nombre del predio', en: 'Plot name' },
    plot_placeholder: { es: 'Mi predio', en: 'My plot' },
    my_location: { es: '📍 Mi ubicación', en: '📍 My location' },
    generate: { es: '🌤️ Generar pronóstico', en: '🌤️ Generate forecast' },
    map_aria: { es: 'Mapa para seleccionar ubicación', en: 'Map to select location' },
    print_quick_title: {
      es: '<strong>Lectura rápida del pronóstico</strong> · comparado vs <strong>histórico, semana anterior</strong>',
      en: '<strong>Quick forecast readout</strong> · compared vs <strong>history, prior week</strong>'
    },
    print_tip_vpd: {
      es: '<strong>VPD 0.5–1.5 kPa</strong>: confort habitual. <strong>&lt;0.5</strong>: baja demanda atmosférica (más humedad / riesgo foliar). <strong>&gt;1.5</strong>: alta demanda (revisar riego).',
      en: '<strong>VPD 0.5–1.5 kPa</strong>: typical comfort. <strong>&lt;0.5</strong>: low atmospheric demand (more humidity / foliar risk). <strong>&gt;1.5</strong>: high demand (check irrigation).'
    },
    print_tip_eto: {
      es: '<strong>ETo</strong>: demanda hídrica del clima. <strong>ETc = ETo × Kc</strong>: estimación del cultivo.',
      en: '<strong>ETo</strong>: climate water demand. <strong>ETc = ETo × Kc</strong>: crop estimate.'
    },
    print_tip_rain: {
      es: '<strong>Lluvia vs ETc</strong>: lluvia muy por encima → posible saturación; muy por debajo → déficit y priorizar riego.',
      en: '<strong>Rain vs ETc</strong>: rain well above → possible saturation; well below → deficit and prioritize irrigation.'
    },
    print_tip_frost: {
      es: '<strong>Rocío ≤ {frost}</strong> con T mín baja → atención a heladas (revisar tabla).',
      en: '<strong>Dew ≤ {frost}</strong> with low T min → watch for frost (check the table).'
    },
    print_foot: {
      es: 'Orientación por coordenadas. Validar microclima y suelo en campo. Detalle diario → hoja siguiente.',
      en: 'Guidance by coordinates. Validate canopy microclimate and soil in the field. Daily detail → next page.'
    },
    daily_kicker: { es: 'Detalle diario', en: 'Daily detail' },
    daily_h2: { es: 'Histórico y pronóstico', en: 'History and forecast' },
    legend_history: { es: 'Histórico', en: 'History' },
    legend_forecast: { es: 'Pronóstico', en: 'Forecast' },
    history: { es: 'Histórico', en: 'History' },
    forecast: { es: 'Pronóstico', en: 'Forecast' },
    fao_ref: { es: 'Referencia FAO', en: 'FAO reference' },
    apply: { es: 'Aplicar', en: 'Apply' },
    kc_wa_html: {
      es: 'Cambiar Kc o coordenadas <strong>guardados</strong> (alerta) · WhatsApp',
      en: 'Change <strong>saved</strong> Kc or coordinates (alert) · WhatsApp'
    },
    kc_wa_title: {
      es: 'Pedir cambio del Kc o coordenadas guardados (valores permanentes de tu alerta)',
      en: 'Request a change to saved Kc or coordinates (permanent alert values)'
    },
    kc_wa_title_alert: {
      es: 'Pedir cambio del Kc o coordenadas guardados de tu alerta (valores permanentes)',
      en: 'Request a change to your alert’s saved Kc or coordinates (permanent values)'
    },
    etc_note_default: { es: 'ETc = ETo × Kc.', en: 'ETc = ETo × Kc.' },
    table_toggle_show: { es: 'Ver tabla completa', en: 'Show full table' },
    table_toggle_hide: { es: 'Ocultar tabla completa', en: 'Hide full table' },
    table_scroll: { es: 'Desliza a los lados para ver toda la tabla', en: 'Swipe sideways to see the full table' },
    scroll_left: { es: 'Desplazar tabla a la izquierda', en: 'Scroll table left' },
    scroll_right: { es: 'Desplazar tabla a la derecha', en: 'Scroll table right' },
    chart_kicker: { es: 'Comportamiento del periodo', en: 'Period behavior' },
    chart_h2: { es: 'Demanda atmosférica y agua', en: 'Atmospheric demand and water' },
    chart_period_default: {
      es: '7 d histórico + 7 d pronóstico',
      en: '7 d history + 7 d forecast'
    },
    axis_left: { es: '← Eje izq.: horas VPD (barras)', en: '← Left axis: VPD hours (bars)' },
    axis_right: {
      es: 'Eje der.: {u} de las líneas →',
      en: 'Right axis: {u} for lines →'
    },
    chart_legend_aria: { es: 'Leyenda de la gráfica', en: 'Chart legend' },
    legend_rain: { es: 'Lluvia', en: 'Rain' },
    chart_note_static: {
      es: '<strong>Periodo:</strong> 7 días de histórico + 7 de pronóstico (línea punteada los separa). <strong>Eje izquierdo (azul):</strong> horas VPD de las barras (24 h/día). <strong>Eje derecho (verde):</strong> {u} diarios de las líneas (lluvia, ETo y ETc).',
      en: '<strong>Period:</strong> 7 history days + 7 forecast days (dotted line separates them). <strong>Left axis (blue):</strong> VPD hours from bars (24 h/day). <strong>Right axis (green):</strong> daily {u} from lines (rain, ETo, and ETc).'
    },
    tips_title: {
      es: '<strong>Cómo interpretar (guía corta):</strong>',
      en: '<strong>How to read it (short guide):</strong>'
    },
    tip_vpd_opt: {
      es: '<strong>VPD 0.5–1.5 kPa</strong> → rango habitual de confort. La planta suele mantener estomas abiertos y una transpiración equilibrada.',
      en: '<strong>VPD 0.5–1.5 kPa</strong> → typical comfort range. Plants usually keep stomata open with balanced transpiration.'
    },
    tip_vpd_low: {
      es: '<strong>VPD &lt; 0.5</strong> → baja demanda atmosférica de vapor: el aire está muy húmedo y el gradiente hoja–aire es pequeño. Baja la transpiración y el follaje tarda más en secarse → mayor atención a enfermedades foliares.',
      en: '<strong>VPD &lt; 0.5</strong> → low atmospheric vapor demand: air is very humid and the leaf–air gradient is small. Transpiration drops and foliage dries slower → watch foliar disease risk.'
    },
    tip_vpd_high: {
      es: '<strong>VPD &gt; 1.5</strong> → alta demanda atmosférica: el aire seco aumenta la extracción de agua desde la hoja. Crece el riesgo de estrés hídrico y cierre estomático → revisa riego y evita aplicaciones foliares en las horas más críticas.',
      en: '<strong>VPD &gt; 1.5</strong> → high atmospheric demand: dry air increases water extraction from the leaf. Higher risk of water stress and stomatal closure → check irrigation and avoid foliar sprays in the most critical hours.'
    },
    tip_eto_etc: {
      es: '<strong>ETo</strong> = evapotranspiración de referencia (demanda hídrica del clima). <strong>ETc</strong> = ETo × Kc: estimación de la demanda del cultivo según su coeficiente Kc.',
      en: '<strong>ETo</strong> = reference evapotranspiration (climate water demand). <strong>ETc</strong> = ETo × Kc: crop demand estimate from its Kc coefficient.'
    },
    tip_rain_etc: {
      es: '<strong>Lluvia frente a ETc</strong>: si la precipitación supera claramente a ETc, puede haber saturación o encharcamiento en suelos de drenaje lento. Si queda muy por debajo, hay déficit hídrico y conviene priorizar riego.',
      en: '<strong>Rain vs ETc</strong>: if precipitation clearly exceeds ETc, saturation or ponding may occur on slow-draining soils. If far below, there is a water deficit and irrigation should be prioritized.'
    },
    tip_frost: {
      es: '<strong>Punto de rocío ≤ {frost}</strong> (o muy cercano) con temperatura mínima baja → atención a <strong>heladas</strong>; revise esos días en la tabla.',
      en: '<strong>Dew point ≤ {frost}</strong> (or very close) with low minimum temperature → watch for <strong>frost</strong>; check those days in the table.'
    },
    tips_foot: {
      es: 'Orientación meteorológica por coordenadas. La decisión final debe validarse con el microclima del dosel y las condiciones del suelo en campo.',
      en: 'Meteorological guidance by coordinates. Final decisions should be validated with canopy microclimate and soil conditions in the field.'
    },
    pdf_download: { es: '📥 Descargar reporte en PDF', en: '📥 Download PDF report' },
    pdf_hint: {
      es: 'En iPhone se crea el archivo PDF y puedes <strong>Guardar en Archivos</strong> o compartirlo. En computadora se abre la impresión → Guardar como PDF.',
      en: 'On iPhone a PDF file is created and you can <strong>Save to Files</strong> or share it. On desktop, print opens → Save as PDF.'
    },
    your_report: { es: 'Tu reporte', en: 'Your report' },
    manage_h2: { es: 'Administra tu pronóstico', en: 'Manage your forecast' },
    edit_plot: { es: '✏️ Editar predio', en: '✏️ Edit plot' },
    unsubscribe: { es: '🟢 Dejar de recibir alertas', en: '🟢 Stop receiving alerts' },
    weekly_kicker: { es: 'Alerta semanal', en: 'Weekly alert' },
    weekly_h2: { es: 'Recibe este pronóstico cada domingo', en: 'Get this forecast every Sunday' },
    weekly_lead: {
      es: 'Solicita tu alerta agroclimática semanal. Revisaremos personalmente tu registro antes de activarlo.',
      en: 'Request your weekly agroclimate alert. We will personally review your registration before activating it.'
    },
    request_alert: {
      es: 'Solicitar mi alerta agroclimática semanal',
      en: 'Request my weekly agroclimate alert'
    },
    promo_h2: {
      es: 'Lleva el seguimiento completo con NutriPlant PRO',
      en: 'Take full tracking with NutriPlant PRO'
    },
    promo_lead: {
      es: 'Integra clima, nutrición, riego, análisis y seguimiento agronómico en un solo lugar. Suscríbete y desbloquea la plataforma completa.',
      en: 'Integrate climate, nutrition, irrigation, analysis, and agronomic tracking in one place. Subscribe and unlock the full platform.'
    },
    promo_cta: { es: 'Suscribirme a NutriPlant PRO', en: 'Subscribe to NutriPlant PRO' },
    empty_strong: {
      es: 'Empieza seleccionando tu ubicación.',
      en: 'Start by selecting your location.'
    },
    empty_span: {
      es: 'Los datos se consultan únicamente al presionar “Generar pronóstico”.',
      en: 'Data is fetched only when you press “Generate forecast”.'
    },
    footer_rights: {
      es: 'Todos los derechos reservados • Marca registrada',
      en: 'All rights reserved • Registered trademark'
    },
    generated_by: { es: 'Generado por:', en: 'Generated by:' },
    kc_modal_kicker: {
      es: 'Referencia orientativa FAO-56',
      en: 'FAO-56 indicative reference'
    },
    kc_modal_title: { es: 'Selecciona cultivo y etapa', en: 'Select crop and stage' },
    close: { es: 'Cerrar', en: 'Close' },
    kc_search_ph: { es: 'Buscar cultivo o etapa', en: 'Search crop or stage' },
    register_kicker: {
      es: 'Solicitud sujeta a aprobación',
      en: 'Request subject to approval'
    },
    register_title: { es: 'Alertas agroclimáticas', en: 'Agroclimate alerts' },
    full_name: { es: 'Nombre completo', en: 'Full name' },
    email: { es: 'Correo electrónico', en: 'Email' },
    phone_code: { es: 'Lada', en: 'Country code' },
    phone_number: { es: 'Número', en: 'Number' },
    phone_other: { es: 'Otro (escribir lada)', en: 'Other (enter dial code)' },
    occupation: { es: 'Ocupación', en: 'Occupation' },
    select: { es: 'Seleccionar', en: 'Select' },
    occ_agronomist: { es: 'Agrónomo', en: 'Agronomist' },
    occ_tech: { es: 'Técnico agrícola', en: 'Agricultural technician' },
    occ_student: { es: 'Estudiante', en: 'Student' },
    occ_farmer: { es: 'Agricultor', en: 'Farmer' },
    occ_advisor: { es: 'Asesor', en: 'Advisor' },
    occ_other: { es: 'Otro', en: 'Other' },
    country: { es: 'País', en: 'Country' },
    region: { es: 'Estado, provincia o región', en: 'State, province, or region' },
    postal: { es: 'Código postal / ZIP', en: 'Postal / ZIP code' },
    crop: { es: 'Cultivo', en: 'Crop' },
    area: { es: 'Superficie aproximada', en: 'Approximate area' },
    area_lt1: { es: 'Menos de 1 ha', en: 'Less than 1 ha' },
    area_1_5: { es: '1 a 5 ha', en: '1 to 5 ha' },
    area_5_20: { es: '5 a 20 ha', en: '5 to 20 ha' },
    area_20_50: { es: '20 a 50 ha', en: '20 to 50 ha' },
    area_gt50: { es: 'Más de 50 ha', en: 'More than 50 ha' },
    crop_stage: { es: 'Etapa del cultivo', en: 'Crop stage' },
    primary_use: { es: 'Uso principal', en: 'Primary use' },
    use_irrigation: { es: 'Programación del riego', en: 'Irrigation scheduling' },
    use_vpd: { es: 'Seguimiento de VPD', en: 'VPD monitoring' },
    use_apps: { es: 'Planeación de aplicaciones', en: 'Application planning' },
    use_labors: { es: 'Planeación de labores o cosecha', en: 'Labor or harvest planning' },
    use_risk: { es: 'Prevención de riesgos climáticos', en: 'Climate risk prevention' },
    use_other: { es: 'Otro', en: 'Other' },
    decision_goal: {
      es: '¿Qué decisión deseas mejorar con estas alertas?',
      en: 'Which decision do you want to improve with these alerts?'
    },
    accept_terms_html: {
      es: 'Acepto los <a href="../terminos-condiciones.html" target="_blank">términos</a> y la <a href="../politicas-privacidad.html" target="_blank">política de privacidad</a>.',
      en: 'I accept the <a href="../terminos-condiciones.html" target="_blank">terms</a> and the <a href="../politicas-privacidad.html" target="_blank">privacy policy</a>.'
    },
    whatsapp_consent: {
      es: '🟢 Acepto recibir por WhatsApp mensajes de NutriPlant relacionados con esta solicitud (preferido).',
      en: '🟢 I agree to receive WhatsApp messages from NutriPlant related to this request (preferred).'
    },
    email_consent: {
      es: 'También solicito recibir el pronóstico agroclimático semanal por correo.',
      en: 'I also request to receive the weekly agroclimate forecast by email.'
    },
    save_request: { es: 'Guardar solicitud', en: 'Save request' },
    request_saved: { es: 'Solicitud guardada', en: 'Request saved' },
    your_folio_is: { es: 'Tu folio es', en: 'Your reference is' },
    send_wa_help: {
      es: 'Para que podamos revisar tu solicitud, envía el mensaje preparado desde tu WhatsApp.',
      en: 'So we can review your request, send the prepared message from your WhatsApp.'
    },
    send_wa: { es: 'Enviar solicitud por WhatsApp', en: 'Send request via WhatsApp' },
    about_title: { es: 'Nosotros', en: 'About us' },
    about_body: {
      es: '<strong>NutriPlant PRO</strong> es una plataforma técnica enfocada en mejorar la toma de decisiones en nutrición vegetal, integrando conocimiento agronómico, análisis y tecnología. Promovemos el criterio técnico, el aprendizaje continuo y una comunidad profesional que valore el rigor, la honestidad y la evolución constante.',
      en: '<strong>NutriPlant PRO</strong> is a technical platform focused on better plant-nutrition decisions, integrating agronomic knowledge, analysis, and technology. We promote technical judgment, continuous learning, and a professional community that values rigor, honesty, and steady improvement.'
    },
    vision: { es: '🎯 Visión', en: '🎯 Vision' },
    vision_text: {
      es: 'Ser la plataforma de referencia para el diseño, análisis y toma de decisiones en nutrición vegetal, integrando conocimiento agronómico, tecnología e inteligencia artificial, y formando una comunidad técnica global que valore el rigor, la precisión y la mejora continua.',
      en: 'To be the reference platform for design, analysis, and decision-making in plant nutrition, integrating agronomic knowledge, technology, and artificial intelligence, and building a global technical community that values rigor, precision, and continuous improvement.'
    },
    mission: { es: '🧩 Misión', en: '🧩 Mission' },
    mission_text: {
      es: 'Elevar el criterio técnico en la nutrición vegetal, proporcionando herramientas, conocimiento y análisis basados en fundamentos científicos, que permitan a agrónomos y técnicos tomar mejores decisiones en la formulación de programas nutricionales.',
      en: 'Raise technical judgment in plant nutrition by providing tools, knowledge, and science-based analysis so agronomists and technicians can make better decisions when designing nutrition programs.'
    },
    values: { es: '✅ Valores', en: '✅ Values' },
    value_judgment: {
      es: '<strong>Criterio:</strong> Pensar antes de aplicar. Decidir con fundamento.',
      en: '<strong>Judgment:</strong> Think before applying. Decide with foundations.'
    },
    value_respect: {
      es: '<strong>Respeto:</strong> Al cultivo, a las personas y al conocimiento en construcción.',
      en: '<strong>Respect:</strong> For the crop, for people, and for knowledge under construction.'
    },
    value_honesty: {
      es: '<strong>Honestidad:</strong> Hablar claro, sin promesas vacías ni verdades a medias.',
      en: '<strong>Honesty:</strong> Speak clearly, without empty promises or half-truths.'
    },
    value_evolution: {
      es: '<strong>Evolución:</strong> Aprender, ajustar y mejorar de forma continua.',
      en: '<strong>Evolution:</strong> Learn, adjust, and improve continuously.'
    },
    tech_manual: { es: 'Manual técnico', en: 'Technical manual' },
    authorship: { es: 'Autoría de NutriPlant PRO', en: 'NutriPlant PRO authorship' },
    privacy: { es: 'Políticas de privacidad', en: 'Privacy policy' },
    terms: { es: 'Términos y Condiciones', en: 'Terms and Conditions' },

    /* Dynamic / app.js */
    last_reading: { es: 'Última lectura: {when}', en: 'Last reading: {when}' },
    forecast_generated: { es: 'Pronóstico generado: {when}', en: 'Forecast generated: {when}' },
    report_ready: { es: 'Reporte listo', en: 'Report ready' },
    reading_updated: { es: 'Lectura actualizada', en: 'Reading updated' },
    kc_view_only: { es: '(solo esta vista)', en: '(this view only)' },
    kc_note_none_personal: {
      es: 'Sin Kc no hay ETc. Puedes probar un Kc aquí. El valor guardado de tu alerta se cambia por WhatsApp.',
      en: 'Without Kc there is no ETc. You can try a Kc here. Your alert’s saved value is changed via WhatsApp.'
    },
    kc_note_none_free: {
      es: 'Sin Kc no hay ETc. Usa Referencia FAO o escribe un Kc y pulsa Aplicar.',
      en: 'Without Kc there is no ETc. Use FAO reference or enter a Kc and press Apply.'
    },
    kc_note_view_only_html: {
      es: 'ETc de esta vista = <strong>ETo × {kc}</strong>. Valor <strong>guardado</strong> de tu alerta: <strong>{saved}</strong> (cámbialo por WhatsApp).',
      en: 'ETc for this view = <strong>ETo × {kc}</strong>. <strong>Saved</strong> alert value: <strong>{saved}</strong> (change it via WhatsApp).'
    },
    kc_note_personal_html: {
      es: 'ETc = <strong>ETo × {kc}</strong>. Aquí solo pruebas; el Kc/coordenadas <strong>guardados</strong> de tu alerta se piden por WhatsApp.',
      en: 'ETc = <strong>ETo × {kc}</strong>. This is only a test; your alert’s <strong>saved</strong> Kc/coordinates are requested via WhatsApp.'
    },
    kc_note_free_html: {
      es: 'ETc = <strong>ETo × {kc}</strong>. Puedes editar Kc aquí libremente (herramienta gratis; no hay alerta guardada).',
      en: 'ETc = <strong>ETo × {kc}</strong>. You can edit Kc freely here (free tool; no saved alert).'
    },
    kc_range_error: { es: 'El Kc debe estar entre 0 y 2.5.', en: 'Kc must be between 0 and 2.5.' },
    pdf_share_title: {
      es: 'Pronóstico agroclimático NutriPlant',
      en: 'NutriPlant agroclimate forecast'
    },
    pdf_share_text: { es: 'Reporte PDF NutriPlant', en: 'NutriPlant PDF report' },
    pdf_scan: { es: 'Escanea para visitar la plataforma', en: 'Scan to visit the platform' },
    chart_alt: { es: 'Gráfica del pronóstico', en: 'Forecast chart' },
    pdf_footer_rights: {
      es: '© 2026 NutriPlant PRO · Todos los derechos reservados',
      en: '© 2026 NutriPlant PRO · All rights reserved'
    },
    pdf_page: { es: 'Página {page} de {pages}', en: 'Page {page} of {pages}' },
    pdf_generating_btn: { es: 'Generando PDF…', en: 'Generating PDF…' },
    pdf_generating_hint: { es: 'Generando el PDF… un momento.', en: 'Generating the PDF… one moment.' },
    pdf_cancelled: {
      es: 'Descarga cancelada. Vuelve a pulsar si quieres el PDF.',
      en: 'Download cancelled. Tap again if you want the PDF.'
    },
    pdf_shared_ok: {
      es: 'PDF listo. En el menú elige Guardar en Archivos o compartirlo.',
      en: 'PDF ready. In the menu choose Save to Files or share it.'
    },
    pdf_opened_ok: {
      es: 'PDF generado. Si no se descargó, ábrelo y usa Compartir → Guardar en Archivos.',
      en: 'PDF generated. If it did not download, open it and use Share → Save to Files.'
    },
    pdf_generated: { es: 'PDF generado', en: 'PDF generated' },
    pdf_fallback_print: {
      es: 'No se pudo crear el archivo PDF. Abriendo la vista de impresión…',
      en: 'Could not create the PDF file. Opening print view…'
    },
    pdf_need_forecast: {
      es: 'Genera el pronóstico antes de descargar el PDF.',
      en: 'Generate the forecast before downloading the PDF.'
    },
    pdf_need_forecast_hint: {
      es: 'Primero genera el pronóstico y luego descarga el PDF.',
      en: 'Generate the forecast first, then download the PDF.'
    },
    pdf_print_hint: {
      es: 'Se abrirá la impresión del navegador: elige Guardar como PDF.',
      en: 'Browser print will open: choose Save as PDF.'
    },
    regenerate_hint: {
      es: 'Genera de nuevo para actualizar los datos.',
      en: 'Generate again to refresh the data.'
    },
    map_load_error: {
      es: 'No se pudo cargar el mapa. Recarga la página.',
      en: 'Could not load the map. Reload the page.'
    },
    geo_unsupported: {
      es: 'Tu navegador no permite geolocalización.',
      en: 'Your browser does not support geolocation.'
    },
    geo_requesting: { es: 'Solicitando ubicación…', en: 'Requesting location…' },
    geo_applied: {
      es: 'Ubicación aplicada. Puedes mover el marcador para afinarla.',
      en: 'Location applied. You can move the marker to fine-tune it.'
    },
    geo_denied: { es: 'Permiso de ubicación denegado.', en: 'Location permission denied.' },
    geo_failed: { es: 'No se pudo obtener la ubicación.', en: 'Could not get the location.' },
    coords_invalid: { es: 'Selecciona coordenadas válidas.', en: 'Select valid coordinates.' },
    fetching: {
      es: 'Consultando los últimos 7 días y el pronóstico…',
      en: 'Fetching the last 7 days and the forecast…'
    },
    generate_error: {
      es: 'No se pudo generar el pronóstico. {msg}',
      en: 'Could not generate the forecast. {msg}'
    },
    selected_location: { es: 'Ubicación seleccionada', en: 'Selected location' },
    change_saved_wa: {
      es: 'Para cambiar Kc o coordenadas guardadas, usa WhatsApp.',
      en: 'To change saved Kc or coordinates, use WhatsApp.'
    },
    no_history: {
      es: 'Sin histórico, semana anterior',
      en: 'No prior-week history'
    },
    history_cmp: {
      es: 'Histórico, semana anterior {val} · Δ {delta}',
      en: 'Prior-week history {val} · Δ {delta}'
    },
    history_vpd: {
      es: 'Histórico, semana anterior {min}–{max} kPa',
      en: 'Prior-week history {min}–{max} kPa'
    },
    card_temp: { es: 'Temperatura', en: 'Temperature' },
    card_eto: { es: 'ETo acumulada', en: 'Accumulated ETo' },
    card_etc: { es: 'ETc acumulada', en: 'Accumulated ETc' },
    card_rain: { es: 'Precipitación', en: 'Precipitation' },
    card_humidity: { es: 'Humedad', en: 'Humidity' },
    card_rad: { es: 'Rad máx', en: 'Max rad' },
    card_period: { es: 'Periodo', en: 'Period' },
    with_kc: { es: 'Con Kc {kc} (ETo × Kc)', en: 'With Kc {kc} (ETo × Kc)' },
    enter_kc: { es: 'Ingresa Kc para calcular', en: 'Enter Kc to calculate' },
    forecast_range: { es: 'Rango del pronóstico', en: 'Forecast range' },
    period_vs: {
      es: '{n} d pronóstico · vs semana anterior',
      en: '{n} d forecast · vs prior week'
    },
    temp_to: { es: '{min} a {max}', en: '{min} to {max}' },
    th_date: { es: 'Fecha', en: 'Date' },
    th_atmosphere: { es: 'Ambiente', en: 'Atmosphere' },
    th_rad_vpd: { es: 'Radiación y VPD', en: 'Radiation and VPD' },
    th_water: { es: 'Agua', en: 'Water' },
    th_tmin: { es: 'T mín {u}', en: 'T min {u}' },
    th_tmax: { es: 'T máx {u}', en: 'T max {u}' },
    th_rhmin: { es: 'HR mín %', en: 'RH min %' },
    th_rhmax: { es: 'HR máx %', en: 'RH max %' },
    th_dewmin: { es: 'Rocío mín {u}', en: 'Dew min {u}' },
    th_dewmax: { es: 'Rocío máx {u}', en: 'Dew max {u}' },
    th_rad: { es: 'Rad máx W/m²', en: 'Max rad W/m²' },
    th_vpdmin: { es: 'VPD mín', en: 'VPD min' },
    th_vpdmax: { es: 'VPD máx', en: 'VPD max' },
    th_eto: { es: 'ETo {u}', en: 'ETo {u}' },
    th_etc: { es: 'ETc {u}', en: 'ETc {u}' },
    th_rain: { es: 'Lluvia {u}', en: 'Rain {u}' },
    hours_vpd_low: { es: 'Horas VPD <0.5', en: 'VPD hours <0.5' },
    hours_vpd_opt: { es: 'Horas VPD 0.5–1.5', en: 'VPD hours 0.5–1.5' },
    hours_vpd_high: { es: 'Horas VPD >1.5', en: 'VPD hours >1.5' },
    precipitation: { es: 'Precipitación', en: 'Precipitation' },
    chart_load_error: {
      es: 'No se pudo cargar la gráfica. Recarga la página.',
      en: 'Could not load the chart. Reload the page.'
    },
    chart_hist_arrow: { es: '← Histórico', en: '← History' },
    chart_fc_arrow: { es: 'Pronóstico →', en: 'Forecast →' },
    axis_hours: { es: 'Horas VPD · barras', en: 'VPD hours · bars' },
    axis_depth: {
      es: '{u} · líneas (lluvia / ETo / ETc)',
      en: '{u} · lines (rain / ETo / ETc)'
    },
    chart_period: {
      es: '{h} d histórico + {f} d pronóstico',
      en: '{h} d history + {f} d forecast'
    },
    toggle_vpd_hours: { es: 'Horas VPD', en: 'VPD hours' },
    toggle_rain: { es: 'Lluvia', en: 'Rain' },
    etc_pending_kc: { es: 'ETc pendiente de Kc.', en: 'ETc pending Kc.' },
    etc_with_kc: {
      es: 'ETc con Kc {kc} (ETo × Kc).',
      en: 'ETc with Kc {kc} (ETo × Kc).'
    },
    chart_note_dynamic: {
      es: '<strong>Periodo:</strong> {h} d histórico + {f} d pronóstico (línea punteada los separa). <strong>Eje izquierdo (azul):</strong> horas VPD de las barras (total 24 h/día). <strong>Eje derecho (verde):</strong> {u} diarios de las líneas (lluvia, ETo y ETc). Rangos VPD: azul &lt;0.5, verde 0.5–1.5, tinto &gt;1.5. {kc}',
      en: '<strong>Period:</strong> {h} d history + {f} d forecast (dotted line separates them). <strong>Left axis (blue):</strong> VPD hours from bars (24 h/day total). <strong>Right axis (green):</strong> daily {u} from lines (rain, ETo, and ETc). VPD ranges: blue &lt;0.5, green 0.5–1.5, maroon &gt;1.5. {kc}'
    },
    plot: { es: 'Predio', en: 'Plot' },
    folio: { es: 'Folio {code}', en: 'Reference {code}' },
    use_kc: { es: 'Usar {kc}', en: 'Use {kc}' },
    kc_none: { es: 'No se encontraron coincidencias.', en: 'No matches found.' },
    phone_code_error: {
      es: 'Escribe una lada válida, por ejemplo +212.',
      en: 'Enter a valid dial code, for example +212.'
    },
    saving_request: { es: 'Guardando solicitud…', en: 'Saving request…' },
    save_failed: { es: 'No se pudo guardar.', en: 'Could not save.' },
    wa_register_msg: {
      es: 'Hola NutriPlant PRO. Me interesa registrarme para recibir Alertas Agroclimáticas.\nNombre: {name}\nFolio: {code}',
      en: 'Hello NutriPlant PRO. I want to register for Agroclimate Alerts.\nName: {name}\nReference: {code}'
    },
    demo_plot: { es: 'Predio demostrativo', en: 'Demo plot' },
    link_unavailable: {
      es: 'El enlace no está disponible.',
      en: 'The link is not available.'
    },
    historical_view: {
      es: 'Vista de reporte guardado (semana seleccionada)',
      en: 'Saved report view (selected week)'
    },
    open_report_error: {
      es: 'No se pudo abrir el reporte.',
      en: 'Could not open the report.'
    },
    unsubscribe_confirm: {
      es: 'Se abrirá WhatsApp para pedir que pausemos tus alertas. ¿Continuar?',
      en: 'WhatsApp will open to ask us to pause your alerts. Continue?'
    },
    generate_explore: {
      es: '🌤️ Ver pronóstico en este punto (no guarda)',
      en: '🌤️ View forecast at this point (does not save)'
    },
    generate_save: {
      es: '💾 Guardar ubicación y actualizar',
      en: '💾 Save location and refresh'
    },
    edit_explore_hint: {
      es: 'Puedes mover el marcador para explorar. Kc y coordenadas guardadas se cambian por WhatsApp.',
      en: 'You can move the marker to explore. Saved Kc and coordinates are changed via WhatsApp.'
    },
    wa_change_kc: {
      es: 'Hola NutriPlant PRO. Quiero cambiar el Kc y/o las coordenadas GUARDADOS de mi alerta agroclimática (valores por defecto del predio, no solo de una vista).{folio}{name} Kc guardado actual: {kc}.{coords} Nuevo Kc y/o nuevas coordenadas que solicito: ',
      en: 'Hello NutriPlant PRO. I want to change the SAVED Kc and/or coordinates of my agroclimate alert (default plot values, not just one view).{folio}{name} Current saved Kc: {kc}.{coords} New Kc and/or coordinates I am requesting: '
    },
    wa_folio: { es: ' Folio {code}.', en: ' Reference {code}.' },
    wa_plot_name: { es: ' Predio/nombre: {name}.', en: ' Plot/name: {name}.' },
    wa_coords: {
      es: ' Coordenadas guardadas actuales: {lat}, {lng}.',
      en: ' Current saved coordinates: {lat}, {lng}.'
    },
    wa_undefined: { es: 'sin definir', en: 'undefined' },
    wa_unsubscribe: {
      es: 'Hola NutriPlant PRO. Quiero dejar de recibir las alertas agroclimáticas.{folio}{name} Por favor páusenme desde administración.',
      en: 'Hello NutriPlant PRO. I want to stop receiving agroclimate alerts.{folio}{name} Please pause me from administration.'
    },
    wa_name: { es: ' Nombre: {name}.', en: ' Name: {name}.' },
    day_temp: { es: 'Temperatura', en: 'Temperature' },
    day_humidity: { es: 'Humedad', en: 'Humidity' },
    day_rain: { es: 'Lluvia', en: 'Rain' },
    day_rad: { es: 'Rad máx', en: 'Max rad' },
    day_eto_etc: { es: 'ETo / ETc', en: 'ETo / ETc' },
    max_suffix: { es: ' máx', en: ' max' },
    no_daily_data: {
      es: 'La fuente no devolvió datos diarios.',
      en: 'The source returned no daily data.'
    }
  };

  function interpolate(str, vars) {
    if (!vars) return str;
    return String(str).replace(/\{(\w+)\}/g, function (_, key) {
      return vars[key] != null ? String(vars[key]) : '';
    });
  }

  function readStoragePrefs() {
    try {
      var raw = w.localStorage && w.localStorage.getItem(PREFS_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function readNpPrefs() {
    try {
      if (w.NpPrefs && typeof w.NpPrefs.get === 'function') return w.NpPrefs.get();
    } catch (e) { /* ignore */ }
    return w.NP_PREFS_BOOTSTRAP || null;
  }

  function urlParam(name) {
    try {
      return new URLSearchParams(w.location.search).get(name);
    } catch (e) {
      return null;
    }
  }

  function resolvePrefs() {
    var lang = null;
    var units = null;
    var locale = null;

    if (reportOverride) {
      if (reportOverride.language === 'en' || reportOverride.language === 'es') lang = reportOverride.language;
      if (reportOverride.unit_system === 'metric' || reportOverride.unit_system === 'us_customary') {
        units = reportOverride.unit_system;
      }
      if (typeof reportOverride.locale === 'string' && reportOverride.locale) locale = reportOverride.locale;
    }

    var qLang = urlParam('lang');
    var qUnits = urlParam('units') || urlParam('unit_system');
    if (!lang && (qLang === 'en' || qLang === 'es')) lang = qLang;
    if (!units && (qUnits === 'metric' || qUnits === 'us_customary')) units = qUnits;

    var prefs = readNpPrefs() || readStoragePrefs() || {};
    if (!lang && (prefs.language === 'en' || prefs.language === 'es')) lang = prefs.language;
    if (!units && (prefs.unit_system === 'metric' || prefs.unit_system === 'us_customary')) {
      units = prefs.unit_system;
    }
    if (!locale && typeof prefs.locale === 'string' && prefs.locale) locale = prefs.locale;

    lang = lang === 'en' ? 'en' : 'es';
    units = units === 'us_customary' ? 'us_customary' : 'metric';
    if (!locale) locale = lang === 'en' ? 'en-US' : 'es-MX';
    return { language: lang, unit_system: units, locale: locale };
  }

  function getLanguage() { return resolvePrefs().language; }
  function getUnitSystem() { return resolvePrefs().unit_system; }
  function getLocale() { return resolvePrefs().locale; }

  function t(key, vars) {
    var row = DICT[key];
    var lang = getLanguage();
    var str = row ? (row[lang] != null ? row[lang] : row.es) : key;
    if (str == null) str = key;
    if (key === 'print_tip_frost' || key === 'tip_frost') {
      vars = Object.assign({ frost: fmtTemp(0, getUnitSystem() === 'us_customary' ? 0 : 0) }, vars || {});
    }
    if (key === 'axis_right' || key === 'chart_note_static' || key === 'chart_note_dynamic' || key === 'axis_depth') {
      vars = Object.assign({ u: depthUnit() }, vars || {});
    }
    if (key.indexOf('th_t') === 0 || key.indexOf('th_dew') === 0) {
      vars = Object.assign({ u: tempUnit() }, vars || {});
    }
    if (key === 'th_eto' || key === 'th_etc' || key === 'th_rain') {
      vars = Object.assign({ u: depthUnit() }, vars || {});
    }
    return interpolate(str, vars);
  }

  function convertTempFromC(celsius) {
    var v = Number(celsius);
    if (!Number.isFinite(v)) return null;
    return getUnitSystem() === 'us_customary' ? (v * 9 / 5) + 32 : v;
  }

  function convertDepthFromMm(mm) {
    var v = Number(mm);
    if (!Number.isFinite(v)) return null;
    return getUnitSystem() === 'us_customary' ? v / 25.4 : v;
  }

  function tempUnit() {
    return getUnitSystem() === 'us_customary' ? '°F' : '°C';
  }

  function depthUnit() {
    return getUnitSystem() === 'us_customary' ? 'in' : 'mm';
  }

  function fmtNumber(value, digits) {
    var v = Number(value);
    if (!Number.isFinite(v)) return '—';
    var d = digits == null ? 1 : digits;
    return v.toFixed(d);
  }

  function fmtTemp(celsius, digits) {
    var v = convertTempFromC(celsius);
    if (v == null) return '—';
    var d = digits != null ? digits : (getUnitSystem() === 'us_customary' ? 0 : 1);
    return fmtNumber(v, d) + ' ' + tempUnit();
  }

  function fmtDepth(mm, digits) {
    var v = convertDepthFromMm(mm);
    if (v == null) return '—';
    var d = digits != null ? digits : (getUnitSystem() === 'us_customary' ? 2 : 1);
    return fmtNumber(v, d) + ' ' + depthUnit();
  }

  function apply(root) {
    var scope = root || document;
    var lang = getLanguage();
    try { document.documentElement.lang = lang; } catch (e) { /* ignore */ }
    try {
      document.documentElement.setAttribute('data-np-language', lang);
      document.documentElement.setAttribute('data-np-unit-system', getUnitSystem());
    } catch (e2) { /* ignore */ }

    if (scope === document || scope === document.documentElement || scope === document.body) {
      try { document.title = t('doc_title'); } catch (e3) { /* ignore */ }
      var meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', t('meta_description'));
    }

    scope.querySelectorAll('[data-agro-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-agro-i18n');
      if (key) el.textContent = t(key);
    });
    scope.querySelectorAll('[data-agro-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-agro-i18n-html');
      if (key) el.innerHTML = t(key);
    });
    scope.querySelectorAll('[data-agro-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-agro-i18n-placeholder');
      if (key) el.setAttribute('placeholder', t(key));
    });
    scope.querySelectorAll('[data-agro-i18n-aria-label]').forEach(function (el) {
      var key = el.getAttribute('data-agro-i18n-aria-label');
      if (key) el.setAttribute('aria-label', t(key));
    });
    scope.querySelectorAll('[data-agro-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-agro-i18n-title');
      if (key) el.setAttribute('title', t(key));
    });
    scope.querySelectorAll('a[href*="politicas-privacidad"], a[href*="terminos-condiciones"]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href) return;
      var hash = '';
      var iHash = href.indexOf('#');
      if (iHash >= 0) {
        hash = href.slice(iHash);
        href = href.slice(0, iHash);
      }
      var base = href;
      var query = '';
      var iQ = href.indexOf('?');
      if (iQ >= 0) {
        base = href.slice(0, iQ);
        query = href.slice(iQ + 1);
      }
      try {
        var params = new URLSearchParams(query);
        params.set('lang', lang);
        a.setAttribute('href', base + '?' + params.toString() + hash);
      } catch (e) {
        a.setAttribute('href', base + '?lang=' + lang + hash);
      }
    });
  }

  function setReportPrefs(prefs) {
    if (!prefs || typeof prefs !== 'object') {
      reportOverride = null;
      return resolvePrefs();
    }
    reportOverride = {
      language: prefs.language === 'en' ? 'en' : (prefs.language === 'es' ? 'es' : null),
      unit_system: prefs.unit_system === 'us_customary'
        ? 'us_customary'
        : (prefs.unit_system === 'metric' ? 'metric' : null),
      locale: typeof prefs.locale === 'string' ? prefs.locale : null
    };
    if (!reportOverride.language && !reportOverride.unit_system && !reportOverride.locale) {
      reportOverride = null;
    }
    return resolvePrefs();
  }

  function getPrefs() {
    return resolvePrefs();
  }

  function revealBoot() {
    try { document.documentElement.classList.remove('agro-booting'); } catch (e) { /* ignore */ }
    try { document.documentElement.classList.add('agro-i18n-ready'); } catch (e2) { /* ignore */ }
  }

  function applyAndReveal(root) {
    apply(root);
    revealBoot();
  }

  w.AgroI18n = {
    getLanguage: getLanguage,
    getUnitSystem: getUnitSystem,
    getLocale: getLocale,
    getPrefs: getPrefs,
    setReportPrefs: setReportPrefs,
    t: t,
    apply: apply,
    applyAndReveal: applyAndReveal,
    revealBoot: revealBoot,
    fmtTemp: fmtTemp,
    fmtDepth: fmtDepth,
    tempUnit: tempUnit,
    depthUnit: depthUnit,
    convertTempFromC: convertTempFromC,
    convertDepthFromMm: convertDepthFromMm,
    DICT: DICT
  };

  // Traducir en cuanto carga el script (antes de Chart/mapa) para acortar el flash.
  if (w.document && w.document.body) {
    try { applyAndReveal(w.document); } catch (eBoot) { revealBoot(); }
  }
})(typeof window !== 'undefined' ? window : globalThis);
