# SQL en Supabase – Paso a paso (sin brincar nada)

Ejecuta **en orden**. Después de cada paso revisa "Cómo verificar" antes de pasar al siguiente.

---

## Paso 1: Función de admin (obligatorio para los demás)

**Qué hace:** Crea la función `is_admin_user()` que usan las políticas de admin. Sin esto, los pasos 2 y 5 pueden fallar.

**Dónde:** Supabase → **SQL Editor** → New query.

**Qué pegar:** Abre en tu proyecto el archivo **`supabase-fix-rls-recursion.sql`**, copia **todo** el contenido y pégalo en el editor. Luego **Run**.

**Cómo verificar:** En Results debe salir **"Success. No rows returned"**. Opcional: en SQL Editor ejecuta `SELECT public.is_admin_user();` y debe devolver una fila (true o false).

---

## Paso 2: Que el admin pueda borrar en la nube

**Qué hace:** Permite que al borrar usuario o proyecto desde el panel de admin también se borre en Supabase (perfiles, proyectos, reportes).

**Dónde:** Supabase → **SQL Editor** → New query.

**Qué pegar:** Abre **`supabase-admin-delete-user.sql`**, copia **todo** y pégalo. **Run**.

**Cómo verificar:** **"Success. No rows returned"**. Si sale error tipo "function is_admin_user() does not exist", vuelve a hacer el **Paso 1**.

---

## Paso 3: Que el admin vea todos los reportes

**Qué hace:** El panel de admin puede listar los reportes PDF de todos los usuarios.

**Dónde:** Supabase → **SQL Editor** → New query.

**Qué pegar:**

```sql
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );
```

**Run.**

**Cómo verificar:** **"Success. No rows returned"**. (Si usas `is_admin_user()` en tu esquema, puedes usar `USING (public.is_admin_user());` en lugar del `EXISTS`.)

---

## Paso 4: Que el admin pueda actualizar reportes (reasignar proyecto)

**Qué hace:** Al reasignar un proyecto a otro usuario, se puede actualizar el `user_id` de los reportes en la nube.

**Dónde:** Supabase → **SQL Editor** → New query.

**Qué pegar:**

```sql
DROP POLICY IF EXISTS "Admins can update all reports" ON public.reports;
CREATE POLICY "Admins can update all reports"
  ON public.reports FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );
```

**Run.**

**Cómo verificar:** **"Success. No rows returned"**.

---

## Paso 5: Columnas de catálogos en `profiles` (si no las tienes)

**Qué hace:** Añade en `profiles` las columnas para chat, enmiendas, granular, fertirriego, hidroponía.

**Dónde:** Supabase → **SQL Editor** → New query.

**Qué pegar:**

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chat_history_no_project JSONB DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_amendments JSONB DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_granular_materials JSONB DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_granular_crops JSONB DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_ferti_materials JSONB DEFAULT '{"items":[]}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_ferti_crops JSONB DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_hydro_materials JSONB DEFAULT '{"items":[]}';
```

**Run.**

**Cómo verificar:** Table Editor → tabla **profiles** → que existan columnas como `custom_amendments`, `custom_ferti_materials`, etc. (o ejecutar el SELECT de columnas que usamos antes).

---

## Resumen del orden

| Paso | Archivo / contenido           | Para qué                          |
|------|------------------------------|-----------------------------------|
| 1    | `supabase-fix-rls-recursion.sql` | Función `is_admin_user()`        |
| 2    | `supabase-admin-delete-user.sql` | Admin borra usuario/proyecto/reportes en nube |
| 3    | Política "Admins can view all reports"   | Admin ve reportes              |
| 4    | Política "Admins can update all reports" | Admin reasigna reportes        |
| 5    | ALTER TABLE profiles (columnas) | Catálogos por usuario           |

Si ya hiciste la tabla **reports** y las columnas de **profiles**, no hace falta repetirlas; solo asegúrate de tener hechos **Paso 1 y Paso 2** para que el admin pueda borrar en la nube sin errores.
