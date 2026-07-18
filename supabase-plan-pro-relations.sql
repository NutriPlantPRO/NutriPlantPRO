-- =============================================================================
-- Plan PRO — Relaciones tipadas entre apuntes (grafo / red neuronal)
-- =============================================================================
-- Ejecutar después de supabase-plan-pro-tables.sql
-- Tipos V1: relacionado_con | depende_de | respalda | continua | actualiza | genera
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.plan_pro_relations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  from_item_id    uuid NOT NULL REFERENCES public.plan_pro_items (id) ON DELETE CASCADE,
  to_item_id      uuid NOT NULL REFERENCES public.plan_pro_items (id) ON DELETE CASCADE,
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
  CONSTRAINT plan_pro_relations_no_self CHECK (from_item_id <> to_item_id),
  CONSTRAINT plan_pro_relations_unique
    UNIQUE (owner_id, from_item_id, to_item_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_plan_pro_relations_owner
  ON public.plan_pro_relations (owner_id);
CREATE INDEX IF NOT EXISTS idx_plan_pro_relations_from
  ON public.plan_pro_relations (from_item_id);
CREATE INDEX IF NOT EXISTS idx_plan_pro_relations_to
  ON public.plan_pro_relations (to_item_id);
CREATE INDEX IF NOT EXISTS idx_plan_pro_relations_type
  ON public.plan_pro_relations (relation_type);

DROP TRIGGER IF EXISTS tr_plan_pro_relations_updated ON public.plan_pro_relations;
CREATE TRIGGER tr_plan_pro_relations_updated
  BEFORE UPDATE ON public.plan_pro_relations
  FOR EACH ROW EXECUTE PROCEDURE public.plan_pro_set_updated_at();

ALTER TABLE public.plan_pro_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_pro_relations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_pro_relations_select_admin" ON public.plan_pro_relations;
DROP POLICY IF EXISTS "plan_pro_relations_insert_admin" ON public.plan_pro_relations;
DROP POLICY IF EXISTS "plan_pro_relations_update_admin" ON public.plan_pro_relations;
DROP POLICY IF EXISTS "plan_pro_relations_delete_admin" ON public.plan_pro_relations;

CREATE POLICY "plan_pro_relations_select_admin"
  ON public.plan_pro_relations FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "plan_pro_relations_insert_admin"
  ON public.plan_pro_relations FOR INSERT
  WITH CHECK (public.is_admin_user() AND owner_id = auth.uid());

CREATE POLICY "plan_pro_relations_update_admin"
  ON public.plan_pro_relations FOR UPDATE
  USING (public.is_admin_user() AND owner_id = auth.uid())
  WITH CHECK (public.is_admin_user() AND owner_id = auth.uid());

CREATE POLICY "plan_pro_relations_delete_admin"
  ON public.plan_pro_relations FOR DELETE
  USING (public.is_admin_user() AND owner_id = auth.uid());

COMMENT ON TABLE public.plan_pro_relations IS
  'Plan PRO: aristas tipadas entre apuntes (grafo de conocimiento / red neuronal).';
COMMENT ON COLUMN public.plan_pro_relations.relation_type IS
  'relacionado_con | depende_de | respalda | continua | actualiza | genera';
