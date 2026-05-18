-- ============================================================
-- LIMPEZA DE DADOS OPERACIONAIS — QUALIVISÃO
-- Preserva: usuários, cargos, permissões, squads, configurações
-- Remove: QA, IEPC, NCs, elogios, imports, ciclos, analytics
-- ============================================================

-- 1. Remover avaliações / scores de ciclo
TRUNCATE TABLE public.cycle_scores CASCADE;

-- 2. Remover não conformidades
TRUNCATE TABLE public.nc_records CASCADE;

-- 3. Remover elogios
TRUNCATE TABLE public.elogios CASCADE;

-- 4. Remover ciclos de importação (imports antigos)
TRUNCATE TABLE public.import_logs CASCADE;
TRUNCATE TABLE public.import_cycles CASCADE;

-- 5. Remover sumários de ciclo
TRUNCATE TABLE public.cycle_summaries CASCADE;

-- 6. Remover ciclos de qualidade
TRUNCATE TABLE public.quality_cycles CASCADE;

-- 7. Remover avaliações manuais
TRUNCATE TABLE public.manual_evaluations CASCADE;

-- 8. Remover indicadores estratégicos de teste
TRUNCATE TABLE public.strategic_indicators CASCADE;

-- 9. Remover histórico de fechamento de ciclos
TRUNCATE TABLE public.cycle_closure_history CASCADE;

-- 10. Limpar logs de auditoria temporários (manter estrutura)
TRUNCATE TABLE public.audit_logs CASCADE;

-- ============================================================
-- PRESERVADO (NÃO ALTERADO):
-- public.user_profiles       → usuários administrativos
-- public.cargos              → cargos configurados
-- public.permission_modules  → módulos de permissão
-- public.user_permissions    → permissões individuais
-- public.permission_logs     → logs de permissão
-- public.squads              → squads cadastradas
-- public.analistas           → analistas cadastrados
-- public.documents           → documentos ISO
-- ============================================================

-- Confirmação
DO $$
BEGIN
  RAISE NOTICE 'Limpeza operacional concluída. Sistema pronto para uso oficial.';
END $$;
