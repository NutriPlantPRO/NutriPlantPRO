# Plan PRO — Cerebro Digital PRO

**Estado:** borrador de producto (solo documentación; implementación por fases).  
**Acceso previsto:** únicamente el usuario administrador (misma identidad que el panel admin actual).  
**Identidad visual:** título de producto **Plan PRO**; marca **NutriPlant PRO** (logo en cabecera, alineado al resto de la plataforma).

**Subtítulo de referencia (branding “Cerebro Digital PRO”):**  
*Personal · Yara · NutriPlant PRO · Ideas · Decisiones · Seguimiento*

---

## 1. Visión

Centro de mando personal y profesional: capturar **cualquier entrada** (nota, idea, pendiente, reunión) **sin decidir dónde guardarla**; el sistema (en fases: reglas + sugerencias + IA opcional) la **enruta** a un esquema común y permite **filtrar, priorizar y visualizar** de distintas maneras.

### Pilares de área (editables, no “títulos fijos”)

Los tres bloques del brief son **plantilla inicial**, no nombres obligatorios:

| Plantilla inicial | Ejemplo de cómo podrías renombrarlo |
|-------------------|-------------------------------------|
| Personal | **JAM**, Vida, Casa, etc. |
| Yara | **Work**, Territorio comercial, etc. |
| NutriPlant PRO | Puede quedarse igual o acortarse en UI |

Debes poder **cambiar el nombre visible** del pilar, **reordenar** y **añadir más pilares** si tu sistema mental crece (ej. un cuarto bloque “Finanzas personales” separado). En base de datos lo importante es un **id estable** (`slug` o UUID); el **título** es solo etiqueta.

Semillas de contenido por plantilla (solo orientativas):

1. **Personal** — ideas, metas, finanzas, aprendizaje, decisiones, pendientes, reflexiones.  
2. **Yara** — territorio, cuentas clave, distribuidores, visitas, cultivos, oportunidades, seguimiento técnico-comercial, aprendizajes de campo.  
3. **NutriPlant PRO** — desarrollo, bugs, mejoras, usuarios, publicaciones, módulos, estrategia, contenido, roadmap, calculadoras, IA, monetización, etc.

---

## 1bis. Flexibilidad: categorías y más clasificaciones

- **Categorías** por pilar: lista **100 % editable** — crear, renombrar, archivar (sin borrar ítems históricos sin confirmación).  
- **Tipos de pensamiento**, **prioridades**, **estados**: pueden tener valores por defecto pero el producto debe permitir **ampliar** (ej. otro estado “En revisión”) si lo necesitas.  
- **Tags / Relación**: siempre útiles como capa libre además de categoría formal.

*(Implementación: tablas de configuración en Supabase ligadas al usuario admin; ver §3bis.)*

---

## 2. Nombre y alternativas (registro)

| Nombre | Uso sugerido |
|--------|----------------|
| **Plan PRO** | Título de la sección en la app (pantalla / ruta). |
| **Cerebro Digital PRO** | Nombre comercial / mental model del producto. |
| *Centro de Mando PRO*, *PRO Mind Hub*, *Jesús PRO Dashboard* | Alternativas descartadas o secundarias. |

---

## 3. Modelo de datos mínimo (tabla dinámica)

Cada **ítem** (o “captura”) comparte un conjunto de campos comunes; algunos son enumeraciones con valores por defecto editables.

| Campo | Ejemplo / valores | Notas |
|--------|-------------------|--------|
| **Área (pilar)** | Referencia por **id**; nombre visible editable (ej. JAM, Work, NutriPlant PRO). | Filtro principal; ver §1bis. |
| **Categoría** | Idea, Pendiente, Estrategia, … | Lista **por pilar**, ampliable y renombrable (ver §5). |
| **Prioridad** | Alta / Media / Baja | Opcionalmente alinear con semáforo (§4). |
| **Estado** | Nuevo / En proceso / Pausado / Cerrado | Compatible con Kanban. |
| **Fecha** | 9 may 2026 | Captura o fecha objetivo; puede haber **fecha límite** además. |
| **Siguiente acción** | Llamar, Investigar, Publicar, Desarrollar | Texto corto + tipo opcional. |
| **Relación** | HiTec, Aguacate, VPD, Finanzas, Usuario | Tags libres o vocabulario controlado. |
| **Nota** | Texto libre | Cuerpo principal. |
| **Archivo / link** | PDF, imagen, video, post | Adjuntos o URLs. |

### Campo adicional recomendado: **Tipo de pensamiento**

| Tipo | Para qué sirve |
|------|----------------|
| Idea | Algo que se te ocurrió |
| Tarea | Algo que debes hacer |
| Decisión | Algo que debes resolver |
| Aprendizaje | Algo que quieres guardar |
| Riesgo | Algo que puede afectar |
| Oportunidad | Algo que puede crecer |
| Contacto | Persona clave |
| Estrategia | Acción con intención |

*(Este campo guía filtros y vistas sin mezclarlo con “categoría” operativa.)*

### Responsable (futuro)

Si en algún momento compartes con alguien más, reservar **Responsable**; para **v1 solo tú** puede ser opcional o fijo en “Jesús / admin”.

---

## 4. Semáforos (coherencia visual)

### 4.1 Prioridad (tráfico)

| Color | Significado | Uso |
|-------|-------------|-----|
| Verde | Controlado / baja prioridad | Puede esperar |
| Amarillo | Importante / revisar pronto | Dar seguimiento |
| Rojo | Crítico / acción inmediata | Resolver ya |
| Azul | Idea / exploración | Guardar para desarrollar |
| Gris | Pausado / archivado | No activo por ahora |

Mapeo sugerido a **Prioridad** textual: Rojo → Alta, Amarillo → Media, Verde → Baja; Azul/Gris → estados o tipos especiales (no forzar si genera ruido).

### 4.2 Color por pilar (sugerido en UI)

Los colores deben asociarse al **registro del pilar** en Supabase (`area.color_hex` o paleta), no al nombre de texto (así da igual si lo llamas Personal o JAM).

| Pilar (ejemplo semilla) | Color sugerido |
|-------------------------|----------------|
| Personal | Morado |
| Yara | Azul / verde corporativo |
| NutriPlant PRO | Verde |
| *(pilares extra)* | Definidos por ti en ajustes |

Sub-etiquetas temáticas (Finanzas, Aprendizaje, etc.) pueden ser **categorías** o **tags** con color opcional.

*(Implementación: borde-izquierdo, chip o punto en tarjetas.)*

---

## 5. Categorías editables (ejemplos semilla)

### Personal

- Finanzas, Salud, Familia, Aprendizaje, Metas, Decisiones importantes (+ las que agregues).

### Yara

- Cuentas clave, Distribuidores, Visitas, Cultivos, Oportunidades, Seguimiento técnico-comercial, Aprendizajes de campo (+ las que agregues).

### NutriPlant PRO

- Ideas de módulos, Bugs, Mejoras, Usuarios, Contenido, Marketing, Roadmap, Calculadoras, IA, Monetización, Estrategia comercial, Publicaciones (+ las que agregues).

El sistema debe permitir **crear / renombrar / archivar** categorías sin borrar histórico (o migración explícita). Los **nombres de los pilares** (Personal → JAM, Yara → Work) siguen la misma regla: editar etiqueta, conservar vínculos por **id**.

---

## 5bis. “Tabla dinámica” + abrir un ítem (visión tipo Notion)

**Sí:** la vista principal puede comportarse como una **tabla dinámica** en el sentido práctico:

- Filas = ítems (capturas).
- Columnas = los campos del §3 (área, categoría, prioridad, estado, fecha, tags…) más los que agregues como **categorizaciones**.
- **Arrastrar columnas / ordenar / filtrar** por uno o varios ejes (como ordenar en Excel o filtrar en Notion).
- Las **categorizaciones** no son fijas: puedes **añadir dimensiones** (ej. “Cliente”, “Campaña”, “Cultivo”) y usarlas como columna o filtro cuando las necesites — equivalente conceptual a campos personalizados + tabla pivot-light **sin** ser Excel servidor completo en la v1.

**Al abrir una fila** (clic en el ítem) entras a una **página de detalle**: ahí va el texto largo, pero también **bloques** extra (siguiente §). Es la misma idea que **Notion**: la tabla es el índice; dentro de cada página construyes lo que necesites.

---

## 5ter. Bloques dentro de cada ítem (mini-Excel, listas, semáforos)

Dentro del detalle de un ítem, además del campo **Nota** plano, el producto puede ir incorporando **bloques** reordenables:

| Tipo de bloque | Función |
|----------------|---------|
| **Párrafo / título** | Texto enriquecido simple; subtítulos para secciones. |
| **Lista de tareas** | Checkboxes con opción fecha / prioridad mini. |
| **Lista de seguimiento** | Similar a tareas pero orientada a “seguimiento” (estado por ítem: pendiente / hecho / esperando). |
| **Mini-tabla (“tipo Excel”) | Tabla **embebida** con pocas filas/columnas pensada para **finanzas, comparativos, presupuestos**. |

### Mini-tabla — alcance sugerido (v1 ligera)

No es Google Sheets: es una **grilla pequeña** con:

- **Encabezados** editables por columna (títulos).
- Celdas **número** o **texto**.
- **Columna o celda tipo semáforo** (ej. estado/tráfico por fila: verde · amarillo · rojo · azul · gris), alineado al mismo lenguaje visual del §4.
- **Operaciones básicas** en fila/columna de totales o celda calculada:
  - **Suma** (`SUM`).
  - **Resta** (referencia explícita celda A − celda B o columna fija).
  - **Porcentaje**: `% de total`, `% respecto a celda X`, o **margen** simple — definir en UX siempre **referenciando celdas** para evitar ambigüedad.

*(Implementación técnica típica: guardar la mini-tabla como **JSON** `{ rows, cols, formulas[] }` validado; evaluar fórmulas en cliente o función Edge segura. Sin macros VBA.)*

### Por qué encaja con tu uso

- **Finanzas personales / escenarios Yara:** mini-tabla con ingresos/gastos y una fila **Total**, % sobre total.
- **NutriPlant:** checklist de bugs o lista de “siguiente acción” dentro del mismo ítem que ya clasificaste en la tabla principal.

---

## 3bis. Persistencia: Supabase (fuente de verdad)

**Sí:** el guardado de Plan PRO / Cerebro Digital debe vivir en **Supabase**, igual que el resto de datos sensibles de la app: **sync entre dispositivos**, backups y políticas **RLS** solo para tu usuario admin.

Esquema orientativo (nombres ajustables en migración):

**Script listo en el repo:** `supabase-plan-pro-tables.sql` (ejecutar en SQL Editor después de `is_admin_user()`).

| Tabla | Rol |
|-------|-----|
| `plan_pro_areas` | Pilares: `id`, `owner_id`, `sort_order`, `title`, `slug`, `color_hex`, `archived_at`. |
| `plan_pro_categories` | Categorías por pilar: `id`, `area_id`, `title`, `sort_order`, `archived_at`. |
| `plan_pro_items` | Capturas: campos flexibles + FK a `area_id`, `category_id`; **`body_plain`**, **`body_blocks`** JSONB, **`attachments`** JSONB; tags en `relation_tags` text[]. |
| *(opcional)* `plan_pro_custom_fields` | Definición de **categorizaciones extra** (nombre, tipo: texto/select/numero/fecha). |
| *(opcional)* `plan_pro_item_field_values` | Valores por ítem y campo personalizado (si no van todo en JSON). |
| *(opcional)* `plan_pro_tags`, tablas puente ítem–tag | Tags normalizados además del texto “Relación”. |

- **RLS (implementado en el script):** políticas `USING (public.is_admin_user())` en las tres tablas — mismo criterio que el panel admin.  
- **localStorage** solo como respaldo offline / borrador — no como almacén principal en producción.

---

## 6. Vistas (roadmap de producto)

| Vista | Función |
|-------|---------|
| **Tabla dinámica** | Filtrar por área, categoría, prioridad, estado, fecha, relación. |
| **Kanban** | Columnas Nuevo → En proceso → Hecho (o alinear estado). |
| **Timeline** | Evolución por fechas / hitos. |
| **Mapa mental** | Nodos = ítems o tags; aristas = relación manual o inferida (fase avanzada). |
| **Panel ejecutivo** | Resumen tipo tablero (indicadores abajo). |

### Panel ejecutivo — indicadores de referencia

| Indicador | Ejemplo |
|-----------|---------|
| Críticos | 3 |
| En seguimiento | 12 |
| Controlados | 25 |
| Ideas nuevas | 18 |
| Cerrados este mes | 9 |

*(Los números se calculan desde Prioridad + Estado + fechas de cierre.)*

---

## 7. Clasificación automática (visión)

**Meta:** pegar o dictar una frase; el sistema propone Área, Categoría, Prioridad, Relación, Siguiente acción.

**Fases realistas:**

1. **Manual rápido:** plantillas por área + autocompletado de tags.  
2. **Reglas:** palabras clave (Yara, NutriPlant, VPD, UV, correo@…) → sugerencias.  
3. **IA (opcional):** mismo backend que el chat / OpenAI, con prompt acotado y confirmación del usuario antes de guardar.

Ejemplos de clasificación esperada (del brief):

- Texto sobre UV/VPD en la app → Área NutriPlant PRO, categoría técnica/desarrollo, prioridad media-alta, tags VPD/radiación/estrés, siguiente acción concreta.  
- Texto visita HiTec aguacate Jalisco → Área Yara, comercial/distribuidor, prioridad alta, tags HiTec/aguacate/territorio, siguiente acción reunión + lista de cuentas.

---

## 7bis. Guardado en la nube + **no saturar Supabase** (lección NutriPlant)

**Decisión acordada:** autoguardado con **pausa después de escribir** + indicador “Guardando…” / “Guardado”; formularios cortos pueden usar **Guardar** explícito en MVP.

**Por qué antes se saturó / encoló:** muchas llamadas **seguidas** al API (por ejemplo un `update` por tecla, debounce demasiado corto, o varios listeners disparando el mismo guardado).

**Reglas de implementación Plan PRO (obligatorias en código):**

| Regla | Detalle |
|--------|---------|
| **Debounce largo** | Mínimo **~2–4 s** después del último cambio antes de llamar a Supabase en texto largo (no 100–300 ms). |
| **Un solo vuelo** | Por ítem activo: si llega otro cambio mientras un `update` está en curso, **no encolar 10 peticiones** — esperar resultado o cancelar lógica y mandar **una** actualización con el último estado. |
| **Tope de frecuencia** | Opcional: no más de **1 guardado cada N segundos** (ej. 5 s) aunque edites rápido; el último contenido se fusiona en ese envío. |
| **Blur / salir** | Al salir del campo o de la página (`visibilitychange`), **un** flush final si había cambios pendientes (sin spamear mientras escribes). |
| **Tabla / filtros** | No hacer `select` completo en cada tecla; cargar lista **una vez** + refresco tras guardar o botón “Actualizar”. |
| **Realtime** | Solo si hace falta; Plan PRO **v1** puede vivir sin canal Realtime para menos conexiones. |

Con una sola persona (admin) el volumen suele ser bajo; el riesgo es **patrones de código** que disparen cientos de writes por minuto. Estas reglas evitan repetir el problema.

---

## 8. Calendario y correo (Outlook / admin@nutriplantpro.com)

**Objetivo:** que eventos y recordatorios aparezcan en **Outlook** del mismo buzón que usas como admin.

**Nota técnica:** la sincronización bidireccional no es “solo HTML”; requiere una de:

- **Microsoft Graph API** (OAuth2, permisos `Calendars.ReadWrite`), backend con secretos seguros; o  
- **Suscripción / flujo** (Power Automate, Zapier) desde webhooks o exportación ICS.

**Recomendación para el plan:** en **v1** exportar **.ics** o botón “Añadir a calendario”; en **v2** integración Graph con app registrada en Azure AD y usuario `admin@nutriplantpro.com`.

Documentar en implementación: variables de entorno, consentimiento OAuth, y que **nunca** se expongan tokens en el frontend.

---

## 9. Seguridad y acceso

- Ruta dedicada (ej. `/plan-pro.html` o subruta bajo admin) **visible solo si** `is_admin_user` (o equivalente en Supabase / sesión actual).  
- Misma política que el panel admin: sin usuario admin → 403 o redirección.  
- Datos: tablas Plan PRO en Supabase con **RLS** restrictiva (solo tu usuario admin / función `is_admin_user` coherente con el panel admin).

---

## 10. Fases de implementación sugeridas

| Fase | Alcance |
|------|---------|
| **F0** | Este documento + validación de campos y nombres. |
| **F1** | CRUD ítems en **Supabase** + tabla + filtros + panel ejecutivo básico; pilares/categorías seed editables. |
| **F2** | Kanban + estados; UI para **renombrar pilares** y **gestionar categorías** (según §1bis / §3bis). |
| **F3** | Timeline; adjuntos/links; **primera versión de página detalle** con bloques (texto + listas de tareas / seguimiento). |
| **F3b** | **Mini-tablas** embebidas con suma / % / semáforo en columnas (§5ter). |
| **F4** | Sugerencias por reglas / IA opcional. |
| **F5** | Mapa mental (manual). |
| **F6** | Calendario interno + exportación ICS. |
| **F7** | Integración Microsoft 365 / Outlook (Graph). |

---

## 11. Enlace en la UI (cuando se implemente)

- Entrada tipo **“segunda liga”** junto al panel admin (misma barra o menú restringido).  
- Título visible: **Plan PRO** + logo NutriPlant PRO.  
- Opcional: subtítulo *Cerebro Digital PRO* debajo del título.

---

## 12. Changelog del documento

| Fecha | Cambio |
|-------|--------|
| 2026-05-09 | Creación del brief a partir de capturas y conversación. |
| 2026-05-09 | Flexibilidad de pilares y categorías; persistencia explícita en Supabase (§1bis, §3bis); F1/F2 actualizadas. |
| 2026-05-09 | Tabla dinámica + detalle tipo Notion; mini-tablas tipo Excel, listas y semáforos (§5bis, §5ter); esquema y fases F3/F3b. |
| 2026-05-09 | §7bis: guardado acordado + reglas anti-saturación Supabase (debounce, single-flight, límites). |

---

*Documento vivo: actualizar este archivo cuando se cierren decisiones (stack, rutas, tablas Supabase).*
