# Revisión de puntos de validación (desde el proyecto)

Revisé lo que se puede comprobar desde aquí. Lo que debes hacer tú en Supabase está marcado como **TÚ**.

---

## 1. Supabase – Configuración del proyecto

### 1.1 Archivo `supabase-config.js` — ✅ REVISADO
- **enabled:** `true` → correcto.
- **url:** configurada (tu proyecto Supabase).
- **anonKey:** configurada (no es el placeholder `TU_ANON_KEY_AQUI`).

**Conclusión:** El archivo está listo para usar la nube.

### 1.2 Scripts SQL — ✅ LISTADOS
En tu carpeta tienes estos `.sql`. Ejecuta en **Supabase → SQL Editor** en este orden si aún no los has corrido:

| Orden | Archivo | Para qué sirve |
|-------|---------|----------------|
| 1 | **supabase-schema-nutriplant.sql** | Tablas `profiles` y `projects`, RLS base |
| 2 | **supabase-fix-rls-recursion.sql** | Función `is_admin_user()` y políticas de admin |
| 3 | **supabase-profiles-campos-extra.sql** | Columnas phone, profession, location, crops |
| 4 | **supabase-profiles-password-visible.sql** | Columna `password_plain` |
| 5 | **supabase-configurar-admin.sql** | Marcar admin en `profiles` (is_admin = true) |
| 6 | **supabase-admin-delete-user.sql** | Admin puede borrar usuarios y proyectos |
| 7 | **supabase-admin-update-user-project.sql** | Admin puede editar usuarios y proyectos |
| — | supabase-activar-suscriptor-prueba.sql | Opcional: activar suscripción de un usuario de prueba |

**TÚ:** Entra a Supabase → SQL Editor y ejecuta cada uno que falte (New query → pegar → Run).

---

## 2. Auth y recuperación de contraseña — TÚ

Esto solo se puede revisar en el **Dashboard de Supabase**:

- **Authentication → Users:** que exista el usuario **admin@nutriplantpro.com** (y que en `profiles` tenga `is_admin = true`).
- **Authentication → URL Configuration → Redirect URLs:** que esté la URL de tu login, por ejemplo:
  - `http://localhost:8000/login.html`
  - (y la de producción cuando la tengas).

**TÚ:** Revisa esas dos secciones en Supabase.

---

## 3. Orden de scripts en el dashboard — ✅ REVISADO

En **dashboard.html** los scripts cargan en este orden:

1. `@supabase/supabase-js` (CDN)  
2. `supabase-config.js`  
3. `auth-supabase.js`  
4. `auth.js`  
5. `supabase-projects.js`  
6. `project-manager.js`  
7. `project-storage.js`  

**Conclusión:** El orden es el correcto para que la sincronización con la nube funcione.

---

## 4. Flujos (usuario y admin) — TÚ

Son pruebas manuales:

- **Usuario:** Login → dashboard → crear/editar proyecto → guardar → (opcional) comprobar en Supabase → Table Editor → `projects` que aparece el proyecto.
- **Admin:** Login en panel admin → “Refrescar desde Supabase” → ver/editar/borrar usuario o proyecto → comprobar en Supabase que los datos cambian.

**TÚ:** Ejecuta esas pruebas cuando tengas los puntos 1 y 2 listos.

---

## 5. Opcional (sincronizar al volver internet) — ✅ HECHO

Ya está implementado en **supabase-projects.js** (evento `online` + `syncAllLocalProjectsToCloud`). No hace falta revisar nada más.

---

## Resumen

| Punto | Revisado desde aquí | Qué te toca a ti |
|-------|----------------------|-------------------|
| 1.1 Config | ✅ OK | Nada |
| 1.2 SQL | ✅ Lista de archivos y orden | Ejecutar en Supabase los que falten |
| 2 Auth | No (está en Supabase) | Usuario admin + Redirect URLs |
| 3 Scripts | ✅ Orden correcto | Nada |
| 4 Flujos | No | Probar usuario y admin |
| 5 Online sync | ✅ Implementado | Nada |

Cuando hayas hecho la parte “TÚ” (SQL, usuario admin, Redirect URLs y pruebas), los puntos de validación quedan cubiertos.
