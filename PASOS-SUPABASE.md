# NutriPlant PRO — Integración con Supabase (paso a paso)

## Lo que ya está hecho

- Tablas creadas en Supabase (`profiles`, `projects`)
- Librería de Supabase agregada al proyecto
- Archivo de configuración `supabase-config.js` creado

---

## Paso 1: Pegar tu API Key en Supabase

1. Entra a [Supabase](https://supabase.com/dashboard) → proyecto **NutriPlantPRO**
2. Menú izquierdo: **Settings** (icono engrane) → **API**
3. En "Project API keys", copia la clave **anon public** (empieza con `eyJ...`)
4. Abre el archivo `supabase-config.js` en tu proyecto
5. Busca la línea: `anonKey: 'TU_ANON_KEY_AQUI'`
6. Reemplaza `TU_ANON_KEY_AQUI` con la clave que copiaste
7. Guarda el archivo

---

## Paso 2: Activar Email en Supabase Auth

1. En Supabase → **Authentication** (menú izquierdo)
2. **Providers** → **Email**
3. Asegúrate de que **Enable Email provider** esté activado
4. **Opcional:** Si quieres que los usuarios entren de inmediato sin confirmar email, desactiva **"Confirm email"**
5. Guarda si hiciste cambios

---

## Paso 3: Crear tu cuenta de administrador

1. Abre tu app NutriPlant (localhost:8000/login.html)
2. Haz clic en **"Crear Nueva Cuenta"**
3. Regístrate con: `admin@nutriplantpro.com` y la contraseña que quieras
4. Entra a Supabase → **Table Editor** → **profiles**
5. Localiza el perfil con tu email
6. Edita la fila y en la columna **is_admin** pon `true`
7. Guarda

---

## Paso 4: Verificar que funciona

1. Cierra sesión en NutriPlant (si estabas dentro)
2. Inicia sesión con `admin@nutriplantpro.com` y tu contraseña
3. Si entras al dashboard, la autenticación con Supabase está funcionando

---

## Próximos pasos (cuando esté listo)

- Conectar el guardado de proyectos a Supabase
- Migrar usuarios que tenían datos en localStorage

---

**¿Dudas?** Avísame en qué paso te quedaste y lo revisamos.
