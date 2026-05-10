# Pasos en Supabase — Plan PRO (Cerebro Digital)

Checklist en orden. Si algo falla, anota el mensaje exacto de Supabase.

---

## 1. Entrar al proyecto correcto

1. Abre [https://supabase.com](https://supabase.com) e inicia sesión.  
2. Selecciona el **mismo proyecto** que usa NutriPlant PRO (misma base que `auth` y `profiles`).

---

## 2. Comprobar que existe `is_admin_user()`

Plan PRO usa las mismas políticas que el panel admin: solo usuarios con `profiles.is_admin = true`.

1. En el menú izquierdo: **SQL** → **New query**.  
2. Pega y ejecuta:

```sql
SELECT public.is_admin_user();
```

- Si **devuelve sin error** (aunque sea `false` sin sesión), la función ya existe.  
- Si **error** tipo `function is_admin_user() does not exist` → ejecución **obligatoria** antes de Plan PRO:

   - Pega y corre el bloque de la función en **`supabase-fix-rls-recursion.sql`**, o  
   - El bloque **B)** de **`supabase-EJECUTAR-SQL-EDITOR-UN-SOLO-RUN.sql`** (crea `is_admin_user`).

3. Comprueba en **Table Editor** → `profiles` que **tu usuario** tenga `is_admin` = `true` (o el que vaya a usar Plan PRO).

---

## 3. Crear tablas Plan PRO

1. **SQL** → **New query**.  
2. Abre en tu repo el archivo **`supabase-plan-pro-tables.sql`**.  
3. Selecciona **todo** el contenido, cópialo, pégalo en el editor de Supabase.  
4. Pulsa **Run** (▶).  
5. Revisa el panel de resultados: debería terminar en **Success** (sin error rojo).

*(El script es idempotente: si lo vuelves a correr, recrea triggers/policies con `DROP IF EXISTS` / `IF NOT EXISTS` donde aplica.)*

---

## 4. Verificar que las tablas existen

1. **Table Editor** (menú izquierdo).  
2. Deberías ver:

   - `plan_pro_areas`  
   - `plan_pro_categories`  
   - `plan_pro_items`  

3. Abre cada una y confirma que **RLS** aparece como **Enabled** (icono o detalle de la tabla).

---

## 5. Probar RLS (opcional pero recomendado)

Con sesión anónima **no** deberías poder leer datos.

En **SQL** → nueva query (sin estar “como tu usuario” en el editor a veces es confuso; lo más claro es probar desde la **app** con login admin):

- Desde la futura página **Plan PRO** con `@supabase/supabase-js` y usuario **admin**: `select` debe funcionar.  
- Sin login o usuario no admin: las políticas deben devolver **vacío** o error según el cliente.

*(Prueba rápida en SQL Editor como postgres/service role puede saltarse RLS; no uses eso para validar las políticas “como usuario final”.)*

---

## 6. Datos iniciales (seed)

El script **`supabase-plan-pro-tables.sql`** no inserta pilares por defecto.

**Opción A — un solo SQL (recomendado):** ejecuta **`supabase-plan-pro-seed.sql`** en SQL Editor.  
Usa el **primer usuario con `profiles.is_admin = true`** como dueño e inserta (si no existen) el pilar `NutriPlant PRO` / `nutriplant-pro` y la categoría `Ideas de desarrollo`. Es **idempotente**.

**Opción B:** desde la app `planpro` cuando exista.  
**Opción C:** insert manual en Table Editor (`owner_id` = tu UUID en `profiles`).

---

## 7. Lo que sigue (fuera de Supabase)

- Página estática **`/planpro/`** en el hosting (Netlify, etc.) que use **misma** `SUPABASE_URL` y **`anon key`** que el resto del sitio.  
- Solo usuarios con sesión admin podrán leer/escribir según RLS.

---

## Resumen de archivos en el repo

| Archivo | Uso |
|---------|-----|
| `supabase-plan-pro-tables.sql` | Ejecutar en SQL Editor (paso 3). |
| `supabase-fix-rls-recursion.sql` o `supabase-EJECUTAR-SQL-EDITOR-UN-SOLO-RUN.sql` | Solo si falta `is_admin_user()` (paso 2). |
| `docs/PLAN-PRO-CEREBRO-DIGITAL.md` | Especificación del producto. |

---

*Si Run muestra error de permisos o extensión `pgcrypto`, copia el mensaje completo y revísalo con el mismo proyecto donde ya corre NutriPlant.*
