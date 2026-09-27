# Applicate — documento de trabajo (definición de producto)

Fuente de verdad de la idea. En código ya está el prelanzamiento.

Marca madre: NutriPlant PRO · URL prevista: `https://nutriplantpro.com/applicate`  
Última síntesis: 2026-09-27 — tablas + dashboard/admin enganchados. Público no entra. Catálogo vacío hasta que se cargue.

---

## 0. Estado

| Bloque | Estado |
|--------|--------|
| Este archivo | Idea cerrada. **Prelanzamiento implementado** (login, dashboard, aula, admin, SQL). Contenido de cursos: cuando se cargue. |
| Nombre / logo / portada | **Casi cerrado** — ver §1 |
| URL | **Cerrada: `/applicate`** — ver §2.4 |
| Cuentas / Supabase | **Cerrado: mismo proyecto, dos registros** — ver §2 |
| Llaves Netlify | **Cerrado: las que ya hay.** No proyecto extra, no env nuevas. |
| Entrada / acceso previo | **Cerrado para el prelanzamiento:** público ve, no entra. Solo `admin@nutriplantpro.com` — ver §3–4 |
| Registro / login | UI lista. **Submit de registro bloqueado.** Login no-admin: “Próximamente.” |
| Dashboard + menú | **Hecho** — ver §5. Primer curso = recuadro vacío si no hay publicados |
| Catálogo | **Dos primeros** (lanzar de golpe). Títulos/precios aún no; **no publicar** hasta que Jesús cargue — ver §5.6 |
| Compra / acceso | **Cerrado:** por curso, de por vida — ver §6. Hoja PayPal/WA lista; PayPal único aún no cobra |
| Aula (curso ya suyo) | **Hecho:** video en página + pantalla completa · pestaña de archivos — ver §5.4 |
| Idioma | **Cerrado:** UI como PRO (ES/EN). El **curso** (video/material) es en español — ver §5.5 |
| Pagos | **Cerrado:** PayPal (compra única) + transferencia por WhatsApp — ver §6 |
| Admin | **Vivo:** alumnos, asignar, catálogo (borrador), compras, exportar CSV, métrica `aplicate_profiles` |
| Constancia | **Casi cerrado:** layout + se llama Constancia. Admin puede emitir — ver §7 |
| Tablas | Script `supabase-aplicate-tables.sql` + `docs/PASOS-SUPABASE-APLICATE.md` — Jesús debe Run en SQL Editor |
| Ejecución | **Arrancada.** §11 sigue abierto (títulos, precios, firma, términos) |

Cuando una decisión se cierre, márcala aquí y no la reabrir sin motivo.

---

## 1. Identidad

**Nombre oficial (logo):** Applicate  
**Línea:** By NutriPlant PRO  
**Se dice:** Aplícate  

El mockup a veces escribe “Applicatte” (doble t, sabor portugués). Eso fue la IA del boceto. En producto usamos **Applicate**, como el wordmark.

Misma carpeta que el resto de marcas (`assets/`, junto a `NutriPlant_PRO_*.png`, `N_Hoja_*.png`, AirCI). Los puso Jesús en la Mac; **esos** son los oficiales. **No duplicar** capturas ni logos.

| Elemento | Archivo | Uso |
|----------|---------|-----|
| Logo oficial (wordmark A-hoja + degradado azul→verde) | `assets/Applicate Logo.png` | Header del dashboard, login, favicon |
| Portada hero (plántula / suelo / sol) | `assets/Applicate Portada.png` | Banda de bienvenida del Inicio |
| Idea de dashboard (boceto del chat) | `assets/Applicate Dashboard idea.jpg` | Referencia de layout, no de textos |

Qué se ve bien (opinión):

- El logo ya es marca: la **A** con hoja, azul NutriPlant + verde de crecimiento. No hay que inventar otro.
- La portada es el tono correcto: campo, limpio, luz. Encaja con nutrición vegetal, no con “universidad genérica”.
- El mockup del dashboard es **la estructura** (menú + hero + tarjetas). Los textos del boceto están rotos / en portuñol; en vivo va **español** (y más adelante EN, como PRO).

Tagline de la bienvenida (propuesta, en español limpio):

> Formación técnica para una agricultura más productiva y sostenible.

---

## 2. Arquitectura — dos productos, un Supabase, sin llaves nuevas

**Esto es un documento de definición.** Aquí se cierra cómo lo queremos. Código y SQL, después.

Hay gente que se registra **solo en NutriPlant PRO**, gente **solo en Applicate**, y gente **en los dos**. Ninguno obliga al otro. El mismo puede estar en ambos; no es obligatorio.

| Capa | Decisión |
|------|----------|
| Marca / URL | Mismo sitio: `nutriplantpro.com/applicate` |
| Proyecto Supabase | **El de ahora.** Mismas llaves. |
| Registro PRO | Tabla `profiles` (la de hoy) |
| Registro Applicate | Tabla nueva `aplicate_profiles` (y las de cursos/compras) |
| Métricas | Contar una tabla y la otra, aparte. Cruce = quién está en las dos. |
| Llaves Netlify | **Ninguna nueva.** El paquete de env ya está al tope (~4 KB de Lambda). |

### 2.1 Cómo se independizan (dos tablas, no dos proyectos)

```
auth.users              ← login de la familia NutriPlant (correo + contraseña)
       │
       ├── profiles              ← está en NutriPlant PRO (suscripción)
       └── aplicate_profiles     ← está en Applicate (academia)
```

| Situación | `profiles` | `aplicate_profiles` |
|-----------|------------|---------------------|
| Solo plataforma | sí | no |
| Solo cursos | no | sí |
| Los dos | sí | sí |

Quien se registra en Applicate **no** nace como suscriptor de $49.  
Quien se suscribe a PRO **no** nace como alumno de Applicate.  
Si más adelante entra al otro lado con el **mismo correo**, se le crea la fila que faltaba. Sigue siendo la misma persona en Auth; los productos se miden aparte.

Métricas que quieres (admin, cuando toque):

- Cuántos hay en PRO (`profiles`)
- Cuántos hay en Applicate (`aplicate_profiles`)
- Cuántos están en los dos (mismo `user_id` en ambas)

### 2.2 Correo y contraseña — él sabrá

Si pone el **mismo correo y la misma contraseña** en los dos lados, está bien. Es su decisión.

Lo que hay que tener claro (no es un fallo, es cómo funciona Supabase):

- En **un** proyecto, un correo = **una** contraseña.
- No puede ser el mismo correo con **otra** clave en Applicate. Auth no guarda dos.
- Si el correo ya existe (vino de PRO) y se registra en Applicate: entra con la clave que ya tiene y se le crea `aplicate_profiles`. No se inventa un segundo usuario.
- Al revés igual: alumno de Applicate que luego se suscribe a PRO → misma clave, se le crea/activa `profiles`.

Eso encaja con lo que dijiste: si quiere la misma, la usa; si no se registra en los dos, no pasa nada.

Los formularios de `/applicate` se llaman **Applicate** (`autocomplete` de libro) para que el llavero pueda guardar esa entrada. Si el correo es el mismo, el teléfono a veces ofrece la de PRO: es normal, es el mismo sitio.

### 2.3 Llaves (Netlify) — las que ya estamos usando

“McAfee” del dictado = **Netlify** (las env / llaves de acceso). El paquete ya está **topado** (~4 KB de Lambda). Por eso el plugin público de ChatGPT no metió secretos nuevos: reutiliza los que hay.

**Opinión:** no abras un segundo proyecto de Supabase. Eso serían URL + anon + service role **nuevas**, y no hay hueco (ni ganas) de llenar más llaves.

Se usa lo de siempre:

- `SUPABASE_URL`
- la anon key del front (la de hoy)
- `SUPABASE_SERVICE_ROLE_KEY` (funciones, si hace falta)

Applicate habla al **mismo** proyecto. Las tablas nuevas y el RLS separan alumnos de suscriptores. Cero env nuevas.

La opción A (Supabase extra, contraseñas distintas para el mismo correo) **queda descartada** por esto. No la necesitamos para tu modelo.

### 2.4 URL — sí, `nutriplantpro.com/applicate`

Como la ves tú. Yo también.

| | |
|--|--|
| **Cerrada (sugerida)** | `https://nutriplantpro.com/applicate` |
| Login / registro | `https://nutriplantpro.com/applicate` (o `/applicate/login`) |
| Dashboard | `https://nutriplantpro.com/applicate/` ya dentro |
| No empezar con | `aplicate.nutriplantpro.com` (queda de reserva, §2.2) |

Por qué el path y no subdominio ahora:

- Mismo Netlify, mismo deploy, sin DNS ni certificado extra.
- La marca se siente “adentro” de NutriPlant PRO, que es lo que quieres.
- Las tablas separan los productos; no hace falta otro dominio ni otras llaves.

Una sola **c**: `/applicate` (como el logo). No `/aplicate`.

---

## 3. Entrada (desde el login de NutriPlant PRO)

Hoy el login (`login.html`) tiene a la derecha el banner verde de herramientas gratuitas y debajo las calculadoras.

**Puerta (cerrada):** **fuera** de esa zona verde, **arriba**, otra mini sección. Un rectángulo del alto de unas **2–3 herramientas**, no otro botón verde de calculadora.

- Fondo oscuro (familia del logo), wordmark `assets/Applicate Logo.png`, leyenda **Próximamente**.
- **Franja compacta** (~52 px, alto de un botón de herramienta). No una tarjeta alta: si crece, el JS de redes alarga Facebook y se descuadra el login. El teaser **no** entra en `toolsNaturalHeight`.
- Al picar → `https://nutriplantpro.com/applicate`

**Prelanzamiento (ya en código):**

- El visitante **ve** iniciar sesión y **ve** el formulario de registro (una sola pantalla, §4.1).
- **No hay botón de registrarse.** Si intenta enviar el form: leyenda *El registro abre próximamente.*
- Si pone correo y contraseña y **no** es el admin: *Applicate abre próximamente.* No entra.
- **Solo entra** la cuenta admin de NutriPlant (`admin@nutriplantpro.com` / `profiles.is_admin`), con su contraseña de siempre. Ahí ve la vista previa del dashboard para ir construyendo.
- Esa sesión usa una llave de Auth distinta (`np-applicate-auth`): no pisa ni cierra la sesión de NutriPlant PRO en el mismo navegador.

Cuando esté listo: se habilita el botón de registro y el login para alumnos.

```
login NutriPlant PRO
  → mini sección Applicate
    → /applicate
      → público: ve login + registro, no entra
      → admin@nutriplantpro.com: vista previa
      → luego (lanzamiento): registro y login de alumnos
```

---

## 4. Registro e inicio de sesión

### 4.1 Registrarte — una sola pantalla

Todos los datos en **una** vista. Sin wizard de 4 pasos.

| Campo | Notas |
|-------|--------|
| Nombre completo | Obligatorio |
| Correo | Será el usuario para entrar |
| Teléfono | Con **lada / país** (mismo espíritu que el registro de PRO) |
| País | Obligatorio |
| Estado / provincia | Obligatorio |
| Código postal | Obligatorio |
| Profesión | Obligatorio. Lista simple + “Otra” (agrónomo, técnico, productor, asesor, estudiante, docente, otro) |
| Contraseña | La crea aquí. Confirmación en la misma pantalla |

Al guardar:

- Si el correo es **nuevo** → se crea el usuario en Auth + fila en `aplicate_profiles`.
- Si el correo **ya existe** (ya es de PRO) → entra con la contraseña que ya tiene + se crea solo `aplicate_profiles`.
- **Nunca** se escribe una suscripción PRO en `profiles` por registrarse aquí.

### 4.2 Iniciar sesión

Solo **correo + contraseña** (para que el llavero lo guarde completo).

**Hoy (prelanzamiento):** ese login solo deja pasar al **admin**. Cualquier otro correo ve *próximamente*.

**El día del lanzamiento:** la puerta mira `aplicate_profiles`. Si tiene Auth pero no es alumno, completa registro (los datos de §4.1); no lo manda al dashboard de PRO.

Recuperar contraseña: más adelante.

---

## 5. Dashboard — cerrado al mockup

Referencia: `assets/Applicate Dashboard idea.jpg`.

Familia visual: sidebar azul marino (como PRO), fondo blanco, tarjetas redondeadas, progreso en verde, ítem activo en azul.

**Pestaña izquierda** (como pediste, el mockup la muestra extendida):

- Minimizada: solo iconos.
- Al pasar el cursor / extender: nombre completo.
- En táctil: el mismo patrón que ya tiene el dashboard de PRO (no solo hover).

### 5.1 Menú — del mockup (cerrado)

| Sección | Para qué |
|---------|----------|
| **Inicio** | Bienvenida + catálogo de cursos disponibles |
| **Mis cursos** | Los que ya compró; entra y ve avance |
| **Biblioteca** | Comprados **y** guardados para después |
| **Constancias** | Diplomas de cursos terminados (pantalla + PDF). El mockup decía “Certificados”; el nombre oficial es **Constancia** — ver §7 |
| **Mi perfil** | Datos del registro + cambiar contraseña |

Arriba a la derecha (del mockup, v1 puede ir simple): búsqueda, avisos, avatar con iniciales.

**Admin (solo tú):** alta de cursos, precios, quién compró. **Fuera** de este menú de alumno.

### 5.2 Inicio

1. **Hero** — portada oficial (`assets/Applicate Portada.png`) +  
   *Bienvenido a Applicate* + tagline de §1.
2. **Cursos disponibles** — grid de tarjetas. Se ve cuántos hay. “Ver todos” si crecen.

Cada tarjeta:

- Foto / portada (cuando se suba; hoy el primer hueco va vacío)
- Título
- **Si no es suyo:** candado cerrado + **Comprar**. Está bloqueado. No entra al video.
- **Si ya lo compró o tú se lo asignaste:** candado abierto / **Ver**. Entra al aula.
- Picó Comprar (o el candado) → elige **PayPal** o **WhatsApp transferencia** (tú lo habilitas en admin).
- Guardar para después: sigue existiendo, no abre el curso.
- Arriba del grid: **Disponibles: N · Comprados: M**
- Compra **a la carta**: el que quiera, no la serie.

Portada de cada curso: imagen propia (estilo de la portada Applicate / foto de campo), no el logo como único recuadro. Las subimos cuando el curso exista; **no se publican** en el catálogo hasta que Jesús lo diga.

### 5.3 Biblioteca vs Mis cursos

No son lo mismo (el mockup los separó bien):

| | Mis cursos | Biblioteca |
|--|------------|------------|
| Qué hay | Listado de los **comprados / abiertos** (los que puede ver) | Mismo listado de los suyos + **guardados para después** |
| Para qué | Estudiar / continuar | “Lo mío” y “lo quiero después” |

En cada comprado: avance (lecciones vistas / total).

Acceso al que pagó (o le asignaste): **de por vida**.

### 5.4 Aula — cuando el curso ya es suyo

Compra en **Inicio** → queda en **Biblioteca** / **Mis cursos** → entra al aula de **ese** curso.

Dos piezas (pestañas dentro del curso):

| Pestaña | Qué hay |
|---------|---------|
| **Clases** | El video. Clic y se ve **en la página**, con marco de Applicate (logo, título del curso, lecciones). Puede **ampliar a pantalla completa**: ahí el video ocupa toda la pantalla. Al salir, vuelve al marco. |
| **Archivos** | Descargas de lo que tú subas a **ese** curso: PDF, Excel, Word, lo que sea. Por curso, no un dump de toda la academia. |

El origen del video (grabar pantalla, exportar de Teams, etc.) **se decide después**. El producto es: hay un video por lección, se pica, se ve, se puede ir a full screen. No es “te mando un link de Drive y adiós”.

### 5.6 Los dos primeros cursos (aún no publicar)

Jesús lanza **dos de golpe**. Títulos finales y precios: **después**. Hoy solo el *qué enseñan*. No se anuncian en el catálogo público hasta que él cargue y diga “ya”.

| # | Idea (título de trabajo) | Qué hace el alumno |
|---|--------------------------|-------------------|
| **1** | Tu archivo Excel de **solución nutritiva** | Crea **su** Excel, paso a paso. No es que “le pasen el archivo y le expliquen”. Al armar el suyo entiende cómo se hace una solución nutritiva. |
| **2** | Tu archivo Excel para **interpretar agua y planta** | Mismo espíritu: su archivo, interpretar análisis de agua y de planta. |
| Luego | Interpretar **análisis de suelo** | Misma familia; no va en el primer lanzamiento. |

**Carga:** como Nutri PRO / Plan PRO — **por Terminal.app de la Mac** (no el terminal de fondo de Cursor), script hacia Supabase Storage. Los videos van a ser **pesados (varios GB)**; así no pasa por Netlify. Cuando toque ejecutar, se escribe el script (mismo espíritu que `docs/NUTRI-PRO-SUBIDA-MASIVA.md`). Archivos del curso (PDF, Excel, Word) y portadas van en esa misma tubería.

Hasta entonces: espacio reservado en este doc y en admin (cuando exista). **No hay curso público.**

### 5.5 Idioma

- **Plataforma** (botones, menús, leyendas, login de Applicate): se traduce. Si el usuario viene del login principal de NutriPlant en **inglés**, Applicate sigue esa preferencia (mismo espíritu ES/EN de PRO).
- **El curso** (video, audio, PDFs que subas): **en español**. Tú das la clase en español. La promoción se dice *curso en español*, no “producto solo en español”.
- Traducir el audio (Teams u otra) es **después**, si a alguien le interesa. Él sabrá. v1 no promete subtítulos ni doblaje.

---

## 6. Compra y habilitación

**Cerrado.** Se compra **el curso**, no una membresía de toda la academia.  
Catálogo: se empieza con **uno**. Después dos, tres, cuatro; con el tiempo diez o veinte.

**A la carta:** el alumno compra el que le interese. El primero sí y el segundo no; solo el cuarto; solo uno. Nada de “tienes que llevar la serie”. Cada compra es de **ese** curso y queda de por vida.

Regla: el alumno solo ve el material de los cursos que tenga asignados (pago o admin). El catálogo muestra portada y precio; el video/material vive detrás de esa fila.

### 6.1 De por vida

Compró uno → ese lo tiene **de por vida**. No se vence.  
Si más adelante compra el 2 o el 5, cada uno también es de por vida.  
No es “acceso a Applicate por un año”; es “este curso ya es suyo”.

### 6.2 PayPal — compra única (no es la suscripción PRO)

PRO usa PayPal de **suscripción** ($49 / 5 meses, `PAYPAL_PLAN_ID`).  
Applicate es **otro producto de PayPal**: pago **único** por curso (Checkout / Order), no un plan que se renueva.

Al picar Comprar → PayPal → paga ese curso → webhook o retorno confirma → fila en `aplicate_purchases` (origen `paypal`) → aparece en Mis cursos.

**Llaves:** la app de PayPal de NutriPlant **ya existe** (`PAYPAL_CLIENT_ID` / `SECRET` en Netlify y en secretos de Supabase). **Reutilizar esa misma app.** No abras otra cuenta ni llenes Netlify de env nuevas. El `PLAN_ID` de la suscripción PRO **no** se usa aquí; se crea una orden de un solo pago (el precio va en el curso, tabla `aplicate_courses`).

**Precio:** no un plan fijo de $30 en PayPal. Cada curso tiene el suyo. Si los dos primeros van a 30 USD, pones `30` en cada ficha. Pasos: `docs/PASOS-PAYPAL-APLICATE.md`.

### 6.3 Transferencia — WhatsApp (el de NutriPlant)

Para quien no quiera PayPal:

- En la ficha del curso (junto a Comprar con PayPal): **Pagar por transferencia · Contáctanos por WhatsApp**.
- El botón abre el WhatsApp de NutriPlant (el de siempre, `wa.me/13868044542`) con un mensaje ya armado, tipo:

  > Hola, quiero pagar un curso de Applicate por transferencia. Curso: [nombre]. Mi correo: [el de su cuenta].

- Te llega al teléfono. Tú le pasas CLABE / datos. Él transfiere.
- **Tú lo habilitas** desde admin (§6.4). No se habilita solo.

Los datos bancarios **no** van públicos en la web (más limpio y más seguro). Van por WhatsApp, caso por caso.

### 6.4 Admin — sección nueva, como las que ya tienes

Mismo panel (`admin/index.html`), **misma familia visual**: una tarjetita más en `admin-sections`, al lado de Suscriptores, Suscripciones, Proyectos, Chats, Entradas al panel.

No es otra web. Es otra **seccióncita** del admin que ya operas.

```
Panel de Administración
  · Gestión de Suscriptores
  · Gestión de Suscripciones
  · Gestión de Proyectos
  · Historial de Conversaciones
  · Consumo Chat IA
  · Entradas al panel          ← el mapa de conexiones vive aquí (§6.5)
  · Applicate                  ← NUEVA
```

Estructura de la sección **Applicate** (botones, mismo estilo que “Ver todos los suscriptores”):

| Botón | Para qué |
|-------|----------|
| **Ver alumnos** | Tabla de `aplicate_profiles`: nombre, correo, teléfono, país/estado, profesión, fecha, cuántos cursos tiene. Métrica: cuántos hay en Applicate. |
| **Asignar cursos** | Eliges alumno + curso(s). Escribe `aplicate_purchases`. Transferencia, regalo, promo, cortesía a un PRO. |
| **Catálogo de cursos** | Los que existan (empiezas con uno). Título, precio, publicado sí/no. Alta/edición simple. |
| **Compras / habilitaciones** | Quién tiene qué, origen (`paypal` / `transferencia` / `regalo` / `promo`), fecha. |
| **Exportar alumnos** | CSV, mismo espíritu que exportar suscriptores. |

En el **home del admin**, una tarjetita de métrica extra (como “Registrados totales”): **Alumnos Applicate** (count de `aplicate_profiles`). Opcional v1: ingresos Applicate aparte de la suscripción PRO, para no mezclar el $49 con la venta de cursos.

Asignar (el mismo gesto, distinto motivo):

| Motivo | Origen en la fila |
|--------|-------------------|
| Te pagó por transferencia | `transferencia` |
| Se lo quieres regalar | `regalo` |
| Promoción, cortesía, premio | `promo` |
| Ya es suscriptor PRO y le das un curso | `regalo` o `promo` |

Sin la tabla de alumnos + asignar, la transferencia no cierra. PayPal es automático; lo demás lo cierras tú en un clic.

### 6.5 Mapa — el de conexiones, con capa Applicate

No un mapa nuevo dentro de Applicate. El que ya tienes: **Entradas al panel → 🗺️ Mapa de conexiones** (ubicación aproximada por IP, throttle 1/hora, como los suscriptores).

Ahí, **además** de las conexiones PRO, un control para ver quién entra a Applicate:

- Botón / filtro: **PRO** · **Applicate** · **Ambos**
- Mismos pines, otro color o etiqueta para el alumno (para no confundir “entró al dashboard de nutrición” con “entró a la academia”)
- El que está en los dos productos puede aparecer en las dos capas (es la misma persona, dos entradas)

Para que el pin exista, el login/dashboard de Applicate tiene que registrar la visita igual que PRO (IP → lat/lng). Misma receta, origen `aplicate`. País/estado del registro sirven para la tabla; el mapa es “dónde se conectó”.

Opinión: así está mejor. Un solo mapa, dos capas. No duplicamos Leaflet ni te acostumbras a otro visor.

---

## 7. Constancia (no “certificado”)

**Nombre:** **Constancia**. En el menú del alumno: **Constancias**.  
“Certificado” en México suena a papel oficial (SEP, cédula, CONOCER). Esto es formación de NutriPlant: **constancia** es honesto y, con el diseño, puede pesar igual.

Al terminar el curso: se ve en pantalla + PDF descargable.

**Título del documento** = el **título del curso** (el que le pongamos en el catálogo). No un nombre genérico.

Layout (cerrado en idea):

| Zona | Qué |
|------|-----|
| Esquina superior izquierda | Logo **Applicate** (`assets/Applicate Logo.png`) |
| Esquina superior derecha | Logo **NutriPlant PRO** |
| Centro | Palabra **CONSTANCIA** + título del curso + nombre del alumno + fecha |
| Abajo | Firma + **José de Jesús Ávila Mendoza** + una línea que se sienta potente (título formal: aún se elige) |

Candidatos de línea bajo el nombre (sigue abierto):

- Fundador y director de NutriPlant PRO
- Instructor titular · NutriPlant PRO
- Especialista en nutrición vegetal · NutriPlant PRO

El peso no lo da la palabra “certificado”: lo dan los dos logos, el papel limpio, la firma y que el título sea el del curso de verdad.

---

## 8. Nube (Supabase) — mismo proyecto, registros aparte

**Cerrado:** el proyecto de hoy. Tablas nuevas. `profiles` / `projects` de PRO no se tocan para alumnos.

| Tabla | Qué guarda |
|-------|------------|
| `aplicate_profiles` | Alumno: nombre, correo, teléfono+lada, país, estado, CP, profesión, fechas. Ligado a `auth.users`. **Esta es la métrica “cuántos hay en Applicate”.** |
| `aplicate_courses` | Catálogo: título, resumen, precio, portada, publicado sí/no, orden |
| `aplicate_lessons` | Clases / módulos: título, orden, video (link o archivo; hospedaje **por definir**) |
| `aplicate_files` | Archivos descargables **por curso**: PDF, Excel, Word, etc. (tú los subes) |
| `aplicate_purchases` | Quién tiene qué curso, de por vida. Origen: `paypal` · `transferencia` · `regalo` · `promo`. Fecha, id PayPal si aplica, nota, quién lo asignó (si fue admin) |
| `aplicate_saves` | Guardados para después |
| `aplicate_progress` | Avance por curso / lección |
| `aplicate_certificates` | Constancias emitidas (curso, alumno, fecha, folio) |
| `aplicate_visits` | Entrada al dashboard Applicate + lat/lng por IP. Independiente de `dashboard_visits` |

Métrica PRO = `profiles` (como hoy).  
Métrica Applicate = `aplicate_profiles`.  
En los dos = mismo `user_id` en ambas.

Ligazón de contenido: compra pagada y activa → ve lecciones de ese curso.  
Sin compra: ve ficha pública, no el material.

SQL y RLS: `supabase-aplicate-tables.sql` (Jesús lo corre en SQL Editor). Visitas propias: `aplicate_visits` (no `dashboard_visits`, ese FK es `profiles`). Capa del mapa PRO/Applicate/Ambos: después.

---

## 9. Lo que no es Applicate

- No sustituye NutriPlant PRO ni las herramientas gratuitas.
- No es Plan PRO / Cerebro Digital / Nutri PRO / Invest PRO / AirCI / admin.
- v1 no es comunidad, foro ni membresía mensual de toda la academia.
- v1 no comparte el expediente de predios/labs del suscriptor PRO.

---

## 10. Oleadas

| Oleada | Entrega |
|--------|---------|
| **0** | Nombre/precio del primer curso · dónde se hospeda el video · línea bajo tu firma — **sigue abierto** |
| **1** | Tablas `aplicate_*` + login admin en `/applicate` (mismas llaves) · UI ES/EN — **hecho** (SQL: Run en Supabase) |
| **2** | Dashboard del mockup + catálogo (recuadro vacío / publicados) — **hecho** |
| **3** | WhatsApp + sección admin viva. PayPal único y capa del mapa: **después** |
| **4** | Aula: player (página + full screen) + pestaña archivos — **hecho** (vacío hasta subir) |
| **5** | Constancia visual (layout). PDF descargable: **después** |
| **6** | Abrir registro público — **no ahora** |

---

## 11. Qué falta platicar (opinión)

Cerrado ahora: teaser *Próximamente* en el login; dos primeros cursos (idea, sin publicar); carga por terminal cuando existan; aula; compra a la carta; UI ES/EN y curso en español; Constancias.

### 11.1 Todavía vale la pena afinar

1. **Títulos comerciales y precio** de los dos cursos (¿USD?).
2. **Cuándo se suelta la constancia** — yo en v1: todas las lecciones vistas + confirmar. Sin examen.
3. **Línea bajo tu firma** en la constancia.
4. **Lecciones en orden libre** (yo: sí).
5. Un párrafo de **términos de la academia**.

El hospedaje/script de videos se escribe **cuando grabes**, no ahora. No publicar nada del catálogo hasta que tú cargues.

### 11.2 Yo no abriría en v1

Cupones, membresía de toda la academia, foro, Stripe, mapa propio, SPEI automático, doblaje/subtítulos, búsqueda y campanita del mockup.

---

## 12. Cómo usar este archivo

Jesús suelta más ideas; se **actualiza este doc**.  
Prelanzamiento en código. Falta: Run SQL en Supabase, títulos/precios, videos por terminal, PayPal único, abrir registro.
