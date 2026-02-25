# Checklist: 5 puntos para que todo funcione bien

Sigue estos pasos en orden. Lo que ya hayas hecho, márcalo con ✅.

---

## 1. Supabase – Configuración del proyecto

### 1.1 Archivo `supabase-config.js`
- Abre **supabase-config.js** en tu proyecto.
- Comprueba que:
  - **enabled** sea `true` (no `false`).
  - **url** sea la URL de tu proyecto (ej. `https://xxxxx.supabase.co`).
  - **anonKey** sea tu clave pública “anon” de Supabase (no debe decir `TU_ANON_KEY_AQUI`).
- Dónde sacar URL y anon key: **Supabase Dashboard** → tu proyecto → **Settings** → **API** → “Project URL” y “anon public”.

### 1.2 Scripts SQL ya ejecutados en Supabase (SQL Editor)
Ejecuta en **Supabase → SQL Editor** (uno por uno, si falta alguno):

| Script | Qué hace |
|--------|----------|
| **supabase-schema-nutriplant.sql** | Tablas `profiles` y `projects`, RLS base |
| **supabase-fix-rls-recursion.sql** | Función `is_admin_user()` y políticas de admin sin recursión |
| **supabase-profiles-campos-extra.sql** | Columnas phone, profession, location, crops en `profiles` |
| **supabase-profiles-password-visible.sql** | Columna `password_plain` en `profiles` |
| **supabase-configurar-admin.sql** (o manual) | Poner `is_admin = true` al usuario admin en `profiles` |
| **supabase-admin-delete-user.sql** | Políticas para que el admin pueda borrar usuarios y proyectos |
| **supabase-admin-update-user-project.sql** | Políticas para que el admin pueda editar usuarios y proyectos |

---

## 2. Auth y recuperación de contraseña

### 2.1 Usuario admin en Supabase
- Entra a **Supabase** → **Authentication** → **Users**.
- Si no existe, crea un usuario con:
  - **Email:** `admin@nutriplantpro.com`
  - **Password:** la que uses (ej. la que tienes en auth.js).
- Luego en **SQL Editor** ejecuta algo como (sustituye el UUID por el id real del usuario admin):

```sql
UPDATE public.profiles
SET is_admin = true
WHERE email = 'admin@nutriplantpro.com';
```

(Si ya ejecutaste **supabase-configurar-admin.sql** y tienes ese usuario, con eso basta.)

### 2.2 Redirect URL para “Recuperar contraseña”
- **Supabase** → **Authentication** → **URL Configuration**.
- En **Redirect URLs** agrega:
  - Desarrollo: `http://localhost:8000/login.html` (o el puerto que uses).
  - Producción: `https://tudominio.com/login.html` (cuando la tengas).
- Guarda. Así el enlace del correo de “¿Olvidaste tu contraseña?” llevará a tu login.

---

## 3. Carga de scripts (orden)

- En **dashboard.html** los scripts deben cargar en este orden:
  1. **supabase-config.js**
  2. **auth-supabase.js**
  3. **supabase-projects.js**
  4. **project-storage.js**
- Si ya están así, no cambies nada. Solo revisa que no falte ninguno.

---

## 4. Comprobar flujos (pruebas rápidas)

### 4.1 Usuario normal
- Registrarte o iniciar sesión con un usuario que **no** sea admin.
- Entrar al dashboard y comprobar que se cargan tus proyectos (o que ves “sin proyectos” si es cuenta nueva).
- Crear o editar un proyecto, guardar, cambiar de pestaña: debe sentirse fluido.
- (Opcional) En Supabase → **Table Editor** → **projects**, comprobar que aparece el proyecto con tu `user_id`.

### 4.2 Admin
- Cerrar sesión e ir al **panel de admin** (la URL que uses para admin).
- Iniciar sesión con **admin@nutriplantpro.com** y tu contraseña.
- Pulsar **“Refrescar desde Supabase”**: deben aparecer usuarios y proyectos de la nube.
- Probar **Ver**, **Editar** y **Eliminar** en un usuario o proyecto de prueba (y comprobar en Supabase que se actualizó o borró).

---

## 5. Opcional: sincronizar al volver a tener internet

- Hoy: si el usuario guarda **sin internet**, el dato queda en localStorage; al haber conexión de nuevo, el **siguiente guardado** vuelve a sincronizar a la nube.
- Si quieres que, al recuperar conexión, se intente sincronizar lo pendiente sin que el usuario tenga que guardar de nuevo, se puede añadir un “retry” al detectar que vuelve la red (por ejemplo con un listener `online` que llame a una función de “sync pendiente”). Es opcional; para la mayoría de usos no es obligatorio.

---

## Resumen rápido

1. **Config** en `supabase-config.js` (enabled, url, anonKey).
2. **SQL** ejecutados en Supabase (esquema, RLS, perfiles, admin delete/update).
3. **Auth**: usuario admin en Authentication + `is_admin` en `profiles` + Redirect URLs.
4. **Scripts** en el orden indicado en dashboard.
5. **Probar** usuario y admin una vez para confirmar que todo responde y se ve en la nube.

Cuando los 5 puntos estén hechos (y el 5 es opcional), la plataforma queda lista para un funcionamiento óptimo con Supabase.
