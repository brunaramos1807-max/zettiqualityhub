/** Resolve pontos deduzidos from NC row (DB or legacy mock shapes). */
export function resolveNcPontosDeduzidos(nc: {
  pontos_deduzidos?: number | null;
  pontosDescontados?: number | null;
  pontos?: number | null;
}): number {
  const raw = nc.pontos_deduzidos ?? nc.pontosDescontados ?? nc.pontos ?? 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n === 0) return 0;
  return Math.abs(n);
}

/** Display label for NC penalty points (e.g. "-20" or "—"). */
export function formatPontosDeduzidos(pts?: number | null): string {
  const n = Number(pts);
  if (!Number.isFinite(n) || n === 0) return '—';
  return `-${Math.abs(n)}`;
}

/** Analyst-level total from cycle_scores or sum of NC rows. */
export function resolveAnalystPontosDeduzidos(
  analyst: { pontosDeduzidos?: number; ncPoints?: number; pontos_deduzidos_nc?: number },
  ncs: Array<{ pontos_deduzidos?: number; pontosDescontados?: number; pontos?: number }> = []
): number {
  const fromScore = Number(
    analyst.pontosDeduzidos ?? analyst.ncPoints ?? analyst.pontos_deduzidos_nc ?? 0
  );
  if (Number.isFinite(fromScore) && fromScore !== 0) return Math.abs(fromScore);
  if (ncs.length === 0) return 0;
  return ncs.reduce((sum, nc) => sum + resolveNcPontosDeduzidos(nc), 0);
}
