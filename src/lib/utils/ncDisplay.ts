// Official NC Severity → Penalty model (V4)
// Penalidade pertence à severidade, NÃO ao tipo.
// Regra -20 removida definitivamente.
export const NC_SEVERIDADE_PENALIDADE: Record<string, number> = {
  'Leve': 3,
  'Média': 5,
  'Grave': 10,
  'Crítica': 15,
};

/** Resolve penalidade from NC row using official model (severidade-based). */
export function resolveNcPenalidade(nc: {
  penalidade?: number | null;
  severidade?: string | null;
  pontos_deduzidos?: number | null;
}): number | null {
  // New model: use penalidade field directly
  if (nc.penalidade != null && Number.isFinite(Number(nc.penalidade))) {
    return Math.abs(Number(nc.penalidade));
  }
  // Derive from severidade if available
  if (nc.severidade && NC_SEVERIDADE_PENALIDADE[nc.severidade] != null) {
    return NC_SEVERIDADE_PENALIDADE[nc.severidade];
  }
  // Legacy: pontos_deduzidos exists (backward compat — do NOT recalculate)
  if (nc.pontos_deduzidos != null && Number.isFinite(Number(nc.pontos_deduzidos))) {
    const n = Math.abs(Number(nc.pontos_deduzidos));
    if (n > 0) return n;
  }
  return null;
}

/** Display label for NC penalty (e.g. "10 pts" or "Histórico Legado"). */
export function formatNcPenalidade(nc: {
  penalidade?: number | null;
  severidade?: string | null;
  pontos_deduzidos?: number | null;
}): string {
  const pts = resolveNcPenalidade(nc);
  if (pts == null) return 'Histórico Legado';
  return `${pts} pts`;
}

/** Analyst-level total penalty from cycle_scores (backward compat). */
export function resolveAnalystPontosDeduzidos(
  analyst: { pontosDeduzidos?: number; ncPoints?: number; pontos_deduzidos_nc?: number },
): number {
  const fromScore = Number(
    analyst.pontosDeduzidos ?? analyst.ncPoints ?? analyst.pontos_deduzidos_nc ?? 0
  );
  if (Number.isFinite(fromScore) && fromScore !== 0) return Math.abs(fromScore);
  return 0;
}

function formatPontosDeduzidos(...args: any[]): any {
  // eslint-disable-next-line no-console
  console.warn('Placeholder: formatPontosDeduzidos is not implemented yet.', args);
  return null;
}

export { formatPontosDeduzidos };
function resolveNcPontosDeduzidos(...args: any[]): any {
  // eslint-disable-next-line no-console
  console.warn('Placeholder: resolveNcPontosDeduzidos is not implemented yet.', args);
  return null;
}

export { resolveNcPontosDeduzidos };