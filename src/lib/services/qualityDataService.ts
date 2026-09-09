import { createClient } from '@/lib/supabase/client';
import {
  Ciclo,
  CicloStatus,
  AvaliacaoOficial,
  EventoNaoConformidade,
  MetricasAgregadasEquipe,
  InvestigacaoQualidade,
  PlanoAcao5W2H,
  StatusPlano5W2H,
  PontoCartaControleP,
} from '../domain/types';
import {
  normalizarIdentificadorCiclo,
  extrairPeriodoMesAno,
  isCicloHomologado,
  validarDataNoIntervaloCiclo,
} from '../domain/cycleGovernance';

function getSupabase() {
  return createClient();
}

// ─── 1. Governança de Ciclos ──────────────────────────────────────────────────

export async function fetchCiclos(): Promise<Ciclo[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('import_cycles')
      .select('*')
      .order('data_inicio', { ascending: false });

    if (error || !data) {
      console.warn('[qualityDataService] fetchCiclos:', error?.message);
      return [];
    }

    return data.map((c: any) => ({
      id: c.id,
      organizacao_id: c.organizacao_id,
      identificacao: c.identificacao || normalizarIdentificadorCiclo(c.periodo),
      periodo: extrairPeriodoMesAno(c.periodo),
      data_inicio: c.data_inicio || '',
      data_fim: c.data_fim || '',
      status: (c.status as CicloStatus) || (c.is_closed ? 'fechado_homologado' : 'aberto'),
      is_closed: c.is_closed === true || c.status === 'fechado_homologado',
      homologado_em: c.homologado_em,
      homologado_por: c.homologado_por,
      total_avaliacoes: c.record_count || 0,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));
  } catch (err: any) {
    console.error('[qualityDataService] Erro ao carregar ciclos:', err);
    return [];
  }
}

export async function fetchCicloPorPeriodo(periodo: string): Promise<Ciclo | null> {
  const mesAno = extrairPeriodoMesAno(periodo);
  const ciclos = await fetchCiclos();
  return ciclos.find((c) => c.periodo === mesAno || c.identificacao.includes(mesAno)) || null;
}

export async function salvarCiclo(ciclo: {
  id?: string;
  identificacao: string;
  periodo: string;
  data_inicio: string;
  data_fim: string;
  status?: CicloStatus;
}): Promise<{ success: boolean; error?: string; ciclo?: Ciclo }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase indisponível' };

  const mesAno = extrairPeriodoMesAno(ciclo.periodo || ciclo.identificacao);
  const identificacao = normalizarIdentificadorCiclo(ciclo.identificacao || mesAno);

  // Verificar se o ciclo já existe e se está homologado
  const existente = await fetchCicloPorPeriodo(mesAno);
  if (existente && isCicloHomologado(existente)) {
    return {
      success: false,
      error: `O ${existente.identificacao} está HOMOLOGADO e não permite alterações de datas ou dados.`,
    };
  }

  const payload: Record<string, any> = {
    periodo: mesAno,
    identificacao,
    data_inicio: ciclo.data_inicio,
    data_fim: ciclo.data_fim,
    status: ciclo.status || 'aberto',
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('import_cycles')
      .upsert(payload, { onConflict: 'periodo' })
      .select('*')
      .single();

    if (error) throw error;
    return {
      success: true,
      ciclo: {
        id: data.id,
        identificacao: data.identificacao,
        periodo: data.periodo,
        data_inicio: data.data_inicio,
        data_fim: data.data_fim,
        status: data.status,
        is_closed: data.is_closed,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function homologarCiclo(
  periodo: string,
  homologadoPor: string = 'Administrador da Qualidade'
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase indisponível' };

  const mesAno = extrairPeriodoMesAno(periodo);

  try {
    const { error } = await supabase
      .from('import_cycles')
      .update({
        status: 'fechado_homologado',
        is_closed: true,
        homologado_em: new Date().toISOString(),
        homologado_por: homologadoPor,
        updated_at: new Date().toISOString(),
      })
      .eq('periodo', mesAno);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── 2. Medições Oficiais (QA, IEPC, NC por Equipe e Ciclo) ───────────────────

export async function fetchMedicoesOficiais(filtros?: {
  periodo?: string;
  equipe?: string;
  dataInicio?: string;
  dataFim?: string;
}): Promise<{
  metricasEquipes: MetricasAgregadasEquipe[];
  avaliacoesDetalhadas: AvaliacaoOficial[];
  ncsDetalhadas: EventoNaoConformidade[];
  mediaGeralQA: number;
  mediaGeralIEPC: number;
  totalGeralNCs: number;
  totalPontosDeduzidosNC: number;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      metricasEquipes: [],
      avaliacoesDetalhadas: [],
      ncsDetalhadas: [],
      mediaGeralQA: 0,
      mediaGeralIEPC: 0,
      totalGeralNCs: 0,
      totalPontosDeduzidosNC: 0,
    };
  }

  const mesAno = filtros?.periodo ? extrairPeriodoMesAno(filtros.periodo) : undefined;

  try {
    // 1. Obter dados do ciclo para checar limites de datas
    let dataInicioCiclo = filtros?.dataInicio;
    let dataFimCiclo = filtros?.dataFim;

    if (mesAno && (!dataInicioCiclo || !dataFimCiclo)) {
      const ciclo = await fetchCicloPorPeriodo(mesAno);
      if (ciclo) {
        dataInicioCiclo = ciclo.data_inicio;
        dataFimCiclo = ciclo.data_fim;
      }
    }

    // 2. Query de Scores
    let scoresQuery = supabase.from('cycle_scores').select('*');
    if (mesAno) scoresQuery = scoresQuery.eq('periodo', mesAno);
    if (filtros?.equipe && filtros.equipe !== 'all')
      scoresQuery = scoresQuery.eq('squad', filtros.equipe);

    // 3. Query de NCs
    let ncsQuery = supabase.from('nc_records').select('*');
    if (mesAno) ncsQuery = ncsQuery.eq('periodo', mesAno);
    if (filtros?.equipe && filtros.equipe !== 'all')
      ncsQuery = ncsQuery.eq('squad', filtros.equipe);

    const [scoresRes, ncsRes] = await Promise.all([scoresQuery, ncsQuery]);

    let scores = scoresRes.data || [];
    let ncs = ncsRes.data || [];

    // 4. Filtrar por data caso as datas do ciclo estejam cadastradas
    if (dataInicioCiclo && dataFimCiclo) {
      scores = scores.filter((s: any) => {
        if (!s.data_registro) return true; // preserva registros sem data estrita
        const check = validarDataNoIntervaloCiclo(s.data_registro, dataInicioCiclo!, dataFimCiclo!);
        return check.valido;
      });

      ncs = ncs.filter((n: any) => {
        if (!n.data_registro) return true;
        const check = validarDataNoIntervaloCiclo(n.data_registro, dataInicioCiclo!, dataFimCiclo!);
        return check.valido;
      });
    }

    // 5. Agregações por Equipe
    const equipesMap: Record<string, any[]> = {};
    scores.forEach((s: any) => {
      const eq = s.squad || 'Geral';
      if (!equipesMap[eq]) equipesMap[eq] = [];
      equipesMap[eq].push(s);
    });

    const metricasEquipes: MetricasAgregadasEquipe[] = Object.entries(equipesMap).map(
      ([equipeNome, rows]) => {
        const total = rows.length;
        const mediaQA =
          total > 0 ? rows.reduce((acc, r) => acc + (Number(r.nota_final_qa) || 0), 0) / total : 0;
        const mediaIEPC =
          total > 0 ? rows.reduce((acc, r) => acc + (Number(r.iepc_total) || 0), 0) / total : 0;

        const equipeNCs = ncs.filter((n: any) => n.squad === equipeNome);
        const totalNCs = equipeNCs.length;
        const pontosDedNC = equipeNCs.reduce(
          (acc, n) => acc + Math.abs(Number(n.pontos_deduzidos) || 20),
          0
        );

        const p1Avg = total > 0 ? rows.reduce((acc, r) => acc + (Number(r.p1) || 0), 0) / total : 0;
        const p2Avg = total > 0 ? rows.reduce((acc, r) => acc + (Number(r.p2) || 0), 0) / total : 0;
        const p3Avg = total > 0 ? rows.reduce((acc, r) => acc + (Number(r.p3) || 0), 0) / total : 0;
        const p4Avg = total > 0 ? rows.reduce((acc, r) => acc + (Number(r.p4) || 0), 0) / total : 0;
        const p5Avg = total > 0 ? rows.reduce((acc, r) => acc + (Number(r.p5) || 0), 0) / total : 0;

        const e1Avg = total > 0 ? rows.reduce((acc, r) => acc + (Number(r.e1) || 0), 0) / total : 0;
        const e2Avg = total > 0 ? rows.reduce((acc, r) => acc + (Number(r.e2) || 0), 0) / total : 0;
        const e3Avg = total > 0 ? rows.reduce((acc, r) => acc + (Number(r.e3) || 0), 0) / total : 0;
        const e4Avg = total > 0 ? rows.reduce((acc, r) => acc + (Number(r.e4) || 0), 0) / total : 0;
        const e5Avg = total > 0 ? rows.reduce((acc, r) => acc + (Number(r.e5) || 0), 0) / total : 0;

        let status: 'conforme' | 'alerta' | 'critico' = 'conforme';
        if (mediaQA < 75 || totalNCs >= 5) status = 'critico';
        else if (mediaQA < 85 || totalNCs >= 2) status = 'alerta';

        return {
          equipe_nome: equipeNome,
          periodo: mesAno || 'Consolidado',
          total_avaliados: total,
          media_qa: Number(mediaQA.toFixed(1)),
          media_iepc: Number(mediaIEPC.toFixed(1)),
          total_ncs: totalNCs,
          pontos_deduzidos_nc: pontosDedNC,
          p1: Number(p1Avg.toFixed(1)),
          p2: Number(p2Avg.toFixed(1)),
          p3: Number(p3Avg.toFixed(1)),
          p4: Number(p4Avg.toFixed(1)),
          p5: Number(p5Avg.toFixed(1)),
          e1: Number(e1Avg.toFixed(1)),
          e2: Number(e2Avg.toFixed(1)),
          e3: Number(e3Avg.toFixed(1)),
          e4: Number(e4Avg.toFixed(1)),
          e5: Number(e5Avg.toFixed(1)),
          status,
        };
      }
    );

    const totalScores = scores.length;
    const mediaGeralQA =
      totalScores > 0
        ? scores.reduce((acc, s) => acc + (Number(s.nota_final_qa) || 0), 0) / totalScores
        : 0;
    const mediaGeralIEPC =
      totalScores > 0
        ? scores.reduce((acc, s) => acc + (Number(s.iepc_total) || 0), 0) / totalScores
        : 0;
    const totalGeralNCs = ncs.length;
    const totalPontosDeduzidosNC = ncs.reduce(
      (acc, n) => acc + Math.abs(Number(n.pontos_deduzidos) || 20),
      0
    );

    return {
      metricasEquipes,
      avaliacoesDetalhadas: scores,
      ncsDetalhadas: ncs,
      mediaGeralQA: Number(mediaGeralQA.toFixed(1)),
      mediaGeralIEPC: Number(mediaGeralIEPC.toFixed(1)),
      totalGeralNCs,
      totalPontosDeduzidosNC,
    };
  } catch (err) {
    console.error('[qualityDataService] fetchMedicoesOficiais:', err);
    return {
      metricasEquipes: [],
      avaliacoesDetalhadas: [],
      ncsDetalhadas: [],
      mediaGeralQA: 0,
      mediaGeralIEPC: 0,
      totalGeralNCs: 0,
      totalPontosDeduzidosNC: 0,
    };
  }
}

// ─── 3. Pareto Dinâmico ───────────────────────────────────────────────────────

export interface ItemPareto {
  fator: string;
  categoria: 'NC' | 'QA_PILAR';
  perda_pontos: number;
  ocorrencias: number;
  percentual: number;
  acumulado: number;
  squad_mais_afetado?: string;
}

export async function fetchParetoDinamico(periodo?: string): Promise<{
  itens: ItemPareto[];
  totalPerdaPontos: number;
  fatorPrincipalConcentracao: string;
  percentualTop3: number;
}> {
  const { ncsDetalhadas, avaliacoesDetalhadas } = await fetchMedicoesOficiais({ periodo });

  const perdasPorFator: Record<
    string,
    { perda: number; ocorrencias: number; tipo: 'NC' | 'QA_PILAR'; squads: Record<string, number> }
  > = {};

  // 1. Processar Não Conformidades reais
  ncsDetalhadas.forEach((nc) => {
    const key = nc.tipo_nc || 'NC Não Especificada';
    const pontos = Math.abs(Number(nc.pontos_deduzidos) || 20);
    if (!perdasPorFator[key]) {
      perdasPorFator[key] = { perda: 0, ocorrencias: 0, tipo: 'NC', squads: {} };
    }
    perdasPorFator[key].perda += pontos;
    perdasPorFator[key].ocorrencias += 1;
    const sq = nc.equipe_nome || 'Geral';
    perdasPorFator[key].squads[sq] = (perdasPorFator[key].squads[sq] || 0) + 1;
  });

  // 2. Processar gaps de pilares QA abaixo do máximo oficial
  // Max: P1=22, P2=34, P3=18, P4=14, P5=12
  const maxPilares: Record<string, { max: number; label: string }> = {
    p1: { max: 22, label: 'P1 Fluxo & Rastreabilidade' },
    p2: { max: 34, label: 'P2 Tratativa & Documentação' },
    p3: { max: 18, label: 'P3 Assertividade Técnica' },
    p4: { max: 14, label: 'P4 Qualidade da Comunicação' },
    p5: { max: 12, label: 'P5 Conduta Relacional' },
  };

  avaliacoesDetalhadas.forEach((av: any) => {
    Object.entries(maxPilares).forEach(([pilarKey, info]) => {
      const obtido = Number(av[pilarKey]) || 0;
      const gap = Math.max(0, info.max - obtido);
      if (gap > 0) {
        if (!perdasPorFator[info.label]) {
          perdasPorFator[info.label] = { perda: 0, ocorrencias: 0, tipo: 'QA_PILAR', squads: {} };
        }
        perdasPorFator[info.label].perda += gap;
        perdasPorFator[info.label].ocorrencias += 1;
        const sq = av.squad || av.equipe_nome || 'Geral';
        perdasPorFator[info.label].squads[sq] = (perdasPorFator[info.label].squads[sq] || 0) + 1;
      }
    });
  });

  const totalPerda = Object.values(perdasPorFator).reduce((acc, cur) => acc + cur.perda, 0);

  // Ordenar decrescente por perda de pontos
  const ordenado = Object.entries(perdasPorFator)
    .map(([fator, dados]) => {
      const topSquad = Object.entries(dados.squads).sort((a, b) => b[1] - a[1])[0]?.[0];
      return {
        fator,
        categoria: dados.tipo,
        perda_pontos: Number(dados.perda.toFixed(1)),
        ocorrencias: dados.ocorrencias,
        percentual: totalPerda > 0 ? Number(((dados.perda / totalPerda) * 100).toFixed(1)) : 0,
        acumulado: 0,
        squad_mais_afetado: topSquad,
      };
    })
    .sort((a, b) => b.perda_pontos - a.perda_pontos);

  // Calcular acumulado
  let acc = 0;
  ordenado.forEach((item) => {
    acc += item.percentual;
    item.acumulado = Number(Math.min(100, acc).toFixed(1));
  });

  const top3Sum = ordenado.slice(0, 3).reduce((s, i) => s + i.percentual, 0);

  return {
    itens: ordenado,
    totalPerdaPontos: Number(totalPerda.toFixed(1)),
    fatorPrincipalConcentracao: ordenado[0]?.fator || 'Nenhum desvio relevante',
    percentualTop3: Number(top3Sum.toFixed(1)),
  };
}

// ─── 4. Diagnóstico (Investigações, Ishikawa & 5 Porquês) ─────────────────────

export async function fetchInvestigacoes(periodo?: string): Promise<InvestigacaoQualidade[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const mesAno = periodo ? extrairPeriodoMesAno(periodo) : undefined;

  try {
    let query = supabase
      .from('investigacoes')
      .select('*')
      .order('created_at', { ascending: false });
    if (mesAno) query = query.eq('periodo', mesAno);

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((inv: any) => ({
      id: inv.id,
      organizacao_id: inv.organizacao_id,
      ciclo_id: inv.ciclo_id,
      periodo: inv.periodo,
      titulo: inv.titulo,
      desvio_detectado: inv.desvio_detectado,
      indicador_afetado: inv.indicador_afetado,
      squad: inv.squad,
      status: inv.status,
      causa_raiz_validada: inv.causa_raiz_validada,
      fundamentacao_validacao: inv.fundamentacao_validacao,
      metodo_validacao: inv.metodo_validacao,
      ishikawa: inv.ishikawa || [],
      cinco_porques: inv.cinco_porques || [],
      hipoteses: inv.hipoteses || [],
      criado_por: inv.criado_por,
      created_at: inv.created_at,
      updated_at: inv.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function salvarInvestigacao(
  inv: Partial<InvestigacaoQualidade>
): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase indisponível' };

  if (!inv.periodo) {
    return { success: false, error: 'O ciclo/período é obrigatório para registrar a investigação.' };
  }

  try {
    const payload = {
      periodo: extrairPeriodoMesAno(inv.periodo),
      titulo: inv.titulo || 'Nova Investigação',
      desvio_detectado: inv.desvio_detectado || '',
      indicador_afetado: inv.indicador_afetado || '',
      squad: inv.squad || null,
      status: inv.status || 'aberta',
      causa_raiz_validada: inv.causa_raiz_validada || null,
      fundamentacao_validacao: inv.fundamentacao_validacao || null,
      metodo_validacao: inv.metodo_validacao || null,
      ishikawa: inv.ishikawa || [],
      cinco_porques: inv.cinco_porques || [],
      hipoteses: inv.hipoteses || [],
      criado_por: inv.criado_por || 'Especialista da Qualidade',
      updated_at: new Date().toISOString(),
    };

    if (inv.id) {
      const { error } = await supabase.from('investigacoes').update(payload).eq('id', inv.id);
      if (error) throw error;
      return { success: true, id: inv.id };
    } else {
      const { data, error } = await supabase
        .from('investigacoes')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;
      return { success: true, id: data?.id };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function validarCausaRaiz(
  id: string,
  causaRaiz: string,
  fundamentacao?: string,
  metodoValidacao?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase indisponível' };

  try {
    const { error } = await supabase
      .from('investigacoes')
      .update({
        causa_raiz_validada: causaRaiz,
        fundamentacao_validacao: fundamentacao || null,
        metodo_validacao: metodoValidacao || null,
        status: 'causa_validada',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── 5. Planos de Ação 5W2H (Melhoria Contínua) ───────────────────────────────

export async function fetchPlanos5W2H(periodo?: string): Promise<PlanoAcao5W2H[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const mesAno = periodo ? extrairPeriodoMesAno(periodo) : undefined;

  try {
    let query = supabase
      .from('planos_acao_5w2h')
      .select('*')
      .order('created_at', { ascending: false });
    if (mesAno) query = query.eq('periodo', mesAno);

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((p: any) => ({
      id: p.id,
      organizacao_id: p.organizacao_id,
      ciclo_id: p.ciclo_id,
      periodo: p.periodo,
      investigacao_id: p.investigacao_id,
      titulo: p.titulo,
      o_que: p.o_que,
      por_que: p.por_que,
      onde: p.onde,
      quem: p.quem,
      quando: p.quando,
      como: p.como,
      quanto: p.quanto,
      status: p.status as StatusPlano5W2H,
      indicador_alvo: p.indicador_alvo,
      meta_alvo: p.meta_alvo,
      prazo_eficacia_dias: p.prazo_eficacia_dias || 30,
      data_limite_eficacia: p.data_limite_eficacia,
      resultado_eficacia: p.resultado_eficacia,
      eficacia_atingida: p.eficacia_atingida,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function salvarPlano5W2H(
  plano: Partial<PlanoAcao5W2H>
): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase indisponível' };

  if (!plano.periodo) {
    return { success: false, error: 'O ciclo/período é obrigatório para registrar o plano 5W2H.' };
  }

  try {
    const prazoDias = plano.prazo_eficacia_dias || 30;
    const quandoDate = plano.quando ? new Date(plano.quando) : new Date();
    const dataLimiteEficacia = new Date(quandoDate.getTime() + prazoDias * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const payload = {
      periodo: extrairPeriodoMesAno(plano.periodo),
      investigacao_id: plano.investigacao_id || null,
      titulo: plano.titulo || 'Plano de Ação de Melhoria',
      o_que: plano.o_que || '',
      por_que: plano.por_que || '',
      onde: plano.onde || '',
      quem: plano.quem || '',
      quando: plano.quando || new Date().toISOString().split('T')[0],
      como: plano.como || '',
      quanto: plano.quanto || 'Sem custo adicional',
      status: plano.status || 'planejado',
      indicador_alvo: plano.indicador_alvo || 'Qualidade Geral',
      meta_alvo: plano.meta_alvo || 'Melhoria contínua',
      prazo_eficacia_dias: prazoDias,
      data_limite_eficacia: dataLimiteEficacia,
      resultado_eficacia: plano.resultado_eficacia || null,
      eficacia_atingida: plano.eficacia_atingida !== undefined ? plano.eficacia_atingida : null,
      updated_at: new Date().toISOString(),
    };

    if (plano.id) {
      const { error } = await supabase.from('planos_acao_5w2h').update(payload).eq('id', plano.id);
      if (error) throw error;
      return { success: true, id: plano.id };
    } else {
      const { data, error } = await supabase
        .from('planos_acao_5w2h')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;
      return { success: true, id: data?.id };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function registrarResultadoEficacia(
  id: string,
  resultado: string,
  eficaz: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase indisponível' };

  try {
    const { error } = await supabase
      .from('planos_acao_5w2h')
      .update({
        resultado_eficacia: resultado,
        eficacia_atingida: eficaz,
        status: eficaz ? 'eficaz' : 'ineficaz',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── 6. Controle Estatístico de Processo (CEP — Carta p) ─────────────────────

export async function fetchDadosCartaP(equipe?: string): Promise<{
  pontos: PontoCartaControleP[];
  pBarGlobal: number;
  totalAmostras: number;
  processoEstavel: boolean;
}> {
  const supabase = getSupabase();
  if (!supabase) return { pontos: [], pBarGlobal: 0, totalAmostras: 0, processoEstavel: true };

  try {
    const ciclos = await fetchCiclos();
    const ciclosValidos = ciclos.filter((c) => c.periodo);

    let scoresQuery = supabase
      .from('cycle_scores')
      .select('periodo, squad, total_ncs, qtd_atendimentos_avaliados');
    if (equipe && equipe !== 'all') scoresQuery = scoresQuery.eq('squad', equipe);

    let ncsQuery = supabase.from('nc_records').select('periodo, squad, id');
    if (equipe && equipe !== 'all') ncsQuery = ncsQuery.eq('squad', equipe);

    const [scoresRes, ncsRes] = await Promise.all([scoresQuery, ncsQuery]);
    const scores = scoresRes.data || [];
    const ncs = ncsRes.data || [];

    // Agrupar por ciclo
    const dadosPorCiclo: Record<string, { n: number; d: number }> = {};

    ciclosValidos.forEach((c) => {
      dadosPorCiclo[c.periodo] = { n: 0, d: 0 };
    });

    scores.forEach((s: any) => {
      const per = s.periodo;
      if (!dadosPorCiclo[per]) dadosPorCiclo[per] = { n: 0, d: 0 };
      // Tamanho da amostra: número de atendimentos ou mínimo de 1 por analista
      const atendimentos = Number(s.qtd_atendimentos_avaliados) || 1;
      dadosPorCiclo[per].n += atendimentos;
    });

    ncs.forEach((n: any) => {
      const per = n.periodo;
      if (!dadosPorCiclo[per]) dadosPorCiclo[per] = { n: 0, d: 0 };
      dadosPorCiclo[per].d += 1;
    });

    // Calcular proporção média global p_bar
    let totalD = 0;
    let totalN = 0;
    Object.values(dadosPorCiclo).forEach((val) => {
      if (val.n > 0) {
        totalD += val.d;
        totalN += val.n;
      }
    });

    const pBar = totalN > 0 ? totalD / totalN : 0.05; // Fallback baseline 5%

    let instabilidadesDetectadas = 0;

    const pontos: PontoCartaControleP[] = Object.entries(dadosPorCiclo)
      .filter(([_, val]) => val.n > 0)
      .map(([periodo, val]) => {
        const p = val.n > 0 ? val.d / val.n : 0;
        // Limites estatísticos 3-sigma: LSC/LIC = p_bar +- 3 * sqrt(p_bar * (1 - p_bar) / n_i)
        const sigma = Math.sqrt((pBar * (1 - pBar)) / val.n);
        const ucl = Math.min(1, pBar + 3 * sigma);
        const lcl = Math.max(0, pBar - 3 * sigma);

        const causaEspecial = p > ucl || p < lcl;
        if (causaEspecial) instabilidadesDetectadas++;

        return {
          ciclo: normalizarIdentificadorCiclo(periodo),
          periodo,
          tamanho_amostra_n: val.n,
          defeitos_conformidades: val.d,
          proporcao_p: Number(p.toFixed(4)),
          linha_central_cl: Number(pBar.toFixed(4)),
          limite_superior_ucl: Number(ucl.toFixed(4)),
          limite_inferior_lcl: Number(lcl.toFixed(4)),
          meta_especificacao: 0.02, // Meta de especificação: <= 2% de defeitos
          causa_especial: causaEspecial,
          regra_violada: p > ucl ? 'Ponto fora do Limite Superior de Controle (LSC)' : undefined,
        };
      });

    return {
      pontos,
      pBarGlobal: Number(pBar.toFixed(4)),
      totalAmostras: totalN,
      processoEstavel: instabilidadesDetectadas === 0,
    };
  } catch (err) {
    console.error('[qualityDataService] fetchDadosCartaP:', err);
    return { pontos: [], pBarGlobal: 0, totalAmostras: 0, processoEstavel: true };
  }
}
