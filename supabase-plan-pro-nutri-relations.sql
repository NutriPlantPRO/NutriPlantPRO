-- =============================================================================
-- Plan PRO / Nutri PRO — Relaciones tipadas desde archivos Nutri
-- =============================================================================
-- Ejecutar después de supabase-plan-pro-nutri-pro.sql y supabase-plan-pro-relations.sql
-- Permite: archivo ↔ apunte | archivo ↔ archivo | archivo ↔ link Nutri
-- Tipos: relacionado_con | depende_de | respalda | continua | actualiza | genera
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.plan_pro_nutri_relations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  from_kind       text NOT NULL
    CHECK (from_kind IN ('nutri_file', 'nutri_link', 'apunte')),
  from_id         uuid NOT NULL,
  to_kind         text NOT NULL
    CHECK (to_kind IN ('nutri_file', 'nutri_link', 'apunte')),
  to_id           uuid NOT NULL,
  relation_type   text NOT NULL
    CHECK (relation_type IN (
      'relacionado_con',
      'depende_de',
      'respalda',
      'continua',
      'actualiza',
      'genera'
    )),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_pro_nutri_relations_no_self
    CHECK (NOT (from_kind = to_kind AND from_id = to_id)),
  CONSTRAINT plan_pro_nutri_relations_unique
    UNIQUE (owner_id, from_kind, from_id, to_kind, to_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_plan_pro_nutri_relations_owner
  ON public.plan_pro_nutri_relations (owner_id);
CREATE INDEX IF NOT EXISTS idx_plan_pro_nutri_relations_from
  ON public.plan_pro_nutri_relations (from_kind, from_id);
CREATE INDEX IF NOT EXISTS idx_plan_pro_nutri_relations_to
  ON public.plan_pro_nutri_relations (to_kind, to_id);

DROP TRIGGER IF EXISTS tr_plan_pro_nutri_relations_updated ON public.plan_pro_nutri_relations;
CREATE TRIGGER tr_plan_pro_nutri_relations_updated
  BEFORE UPDATE ON public.plan_pro_nutri_relations
  FOR EACH ROW EXECUTE PROCEDURE public.plan_pro_set_updated_at();

ALTER TABLE public.plan_pro_nutri_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_pro_nutri_relations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_pro_nutri_relations_select_admin" ON public.plan_pro_nutri_relations;
DROP POLICY IF EXISTS "plan_pro_nutri_relations_insert_admin" ON public.plan_pro_nutri_relations;
DROP POLICY IF EXISTS "plan_pro_nutri_relations_update_admin" ON public.plan_pro_nutri_relations;
DROP POLICY IF EXISTS "plan_pro_nutri_relations_delete_admin" ON public.plan_pro_nutri_relations;

CREATE POLICY "plan_pro_nutri_relations_select_admin"
  ON public.plan_pro_nutri_relations FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "plan_pro_nutri_relations_insert_admin"
  ON public.plan_pro_nutri_relations FOR INSERT
  WITH CHECK (public.is_admin_user() AND owner_id = auth.uid());

CREATE POLICY "plan_pro_nutri_relations_update_admin"
  ON public.plan_pro_nutri_relations FOR UPDATE
  USING (public.is_admin_user() AND owner_id = auth.uid())
  WITH CHECK (public.is_admin_user() AND owner_id = auth.uid());

CREATE POLICY "plan_pro_nutri_relations_delete_admin"
  ON public.plan_pro_nutri_relations FOR DELETE
  USING (public.is_admin_user() AND owner_id = auth.uid());

COMMENT ON TABLE public.plan_pro_nutri_relations IS
  'Nutri PRO: aristas tipadas entre archivos, links y apuntes Plan PRO.';
