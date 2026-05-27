-- Backfill risco_operacional (atencao_evolutiva) from snapshot_json_completo for existing feedbacks
-- This fixes Fernando's 05/2026 feedback and any other existing records

UPDATE public.feedbacks
SET risco_operacional = COALESCE(
  snapshot_json_completo->'feedback_blocks'->>'atencao_evolutiva',
  snapshot_json_completo->>'atencao_evolutiva',
  snapshot_json_completo->>'risco_operacional'
)
WHERE risco_operacional IS NULL
  AND snapshot_json_completo IS NOT NULL
  AND (
    snapshot_json_completo->'feedback_blocks'->>'atencao_evolutiva' IS NOT NULL
    OR snapshot_json_completo->>'atencao_evolutiva' IS NOT NULL
    OR snapshot_json_completo->>'risco_operacional' IS NOT NULL
  );

-- Also backfill evolucao_tecnica and evolucao_comportamental from snapshot if missing
UPDATE public.feedbacks
SET evolucao_tecnica = COALESCE(
  snapshot_json_completo->'feedback_blocks'->>'evolucao_tecnica',
  snapshot_json_completo->>'evolucao_tecnica'
)
WHERE evolucao_tecnica IS NULL
  AND snapshot_json_completo IS NOT NULL
  AND (
    snapshot_json_completo->'feedback_blocks'->>'evolucao_tecnica' IS NOT NULL
    OR snapshot_json_completo->>'evolucao_tecnica' IS NOT NULL
  );

UPDATE public.feedbacks
SET evolucao_comportamental = COALESCE(
  snapshot_json_completo->'feedback_blocks'->>'evolucao_comportamental',
  snapshot_json_completo->>'evolucao_comportamental'
)
WHERE evolucao_comportamental IS NULL
  AND snapshot_json_completo IS NOT NULL
  AND (
    snapshot_json_completo->'feedback_blocks'->>'evolucao_comportamental' IS NOT NULL
    OR snapshot_json_completo->>'evolucao_comportamental' IS NOT NULL
  );
