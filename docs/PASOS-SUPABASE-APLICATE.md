# Pasos en Supabase — Applicate

Checklist. Si algo falla, anota el mensaje exacto de Supabase.

1. Entra al **mismo proyecto** que NutriPlant PRO (`auth` + `profiles`).
2. Comprueba `SELECT public.is_admin_user();` (si no existe, corre `supabase-fix-rls-recursion.sql`).
3. SQL → New query → pega **todo** `supabase-aplicate-tables.sql` → Run.
4. Table Editor: deben existir `aplicate_profiles`, `aplicate_courses`, `aplicate_lessons`, `aplicate_files`, `aplicate_purchases`, `aplicate_saves`, `aplicate_progress`, `aplicate_certificates`, `aplicate_visits`.
5. RLS Enabled en cada una.

No crea cursos publicados. El dashboard muestra el recuadro vacío hasta que carguemos uno.
