import { ConfiguracaoMetodologica, MetricasAgregadasEquipe, AvaliacaoOficial } from './types';

/**
 * QualiVisão — Camada Metodológica da Qualidade
 * Regras parametrizáveis de cálculo e pesos oficiais
 */

export const METODOLOGIA_PADRAO_V4: ConfiguracaoMetodologica = {
  organizacao_id: 'default',
  versao_metodologia: 'QA-V4.0',
  qa_maximo: 100,
  iepc_maximo: 100,
  pilares_qa: [
    {
      codigo: 'p1',
      nome: 'P1 — Gestão do Fluxo e Rastreabilidade',
      peso_maximo: 22,
      descricao: 'Identificação, protocolo SUP, rastreabilidade e encerramento.',
    },
    {
      codigo: 'p2',
      nome: 'P2 — Gestão da Tratativa da Demanda',
      peso_maximo: 34,
      descricao: 'Validação de dúvidas, orientação, resolução e documentação técnica.',
    },
    {
      codigo: 'p3',
      nome: 'P3 — Análise e Assertividade Técnica',
      peso_maximo: 18,
      descricao: 'Diagnóstico técnico da demanda e uso de ferramentas de apoio.',
    },
    {
      codigo: 'p4',
      nome: 'P4 — Qualidade da Comunicação',
      peso_maximo: 14,
      descricao: 'Língua portuguesa, tom profissional, postura e clareza.',
    },
    {
      codigo: 'p5',
      nome: 'P5 — Conduta Relacional',
      peso_maximo: 12,
      descricao: 'Cordialidade, empatia, proatividade e over delivery.',
    },
  ],
  dimensoes_iepc: [
    { codigo: 'e1', nome: 'E1 — Resolução Percebida', peso_maximo: 30 },
    { codigo: 'e2', nome: 'E2 — Clareza e Confiança', peso_maximo: 20 },
    { codigo: 'e3', nome: 'E3 — Esforço do Cliente', peso_maximo: 20 },
    { codigo: 'e4', nome: 'E4 — Tempo e Fluidez', peso_maximo: 15 },
    { codigo: 'e5', nome: 'E5 — Experiência Relacional', peso_maximo: 15 },
  ],
  nc_regra: {
    deducao_padrao_pontos: 20,
    unidade: 'pontos',
    aplicacao: 'por_ocorrencia',
    permite_reincidencia: true,
  },
  is_active: true,
};

/**
 * Calcula a média aritmética de um array de números.
 * Retorna null se não houver dados (evita fabricar 0).
 */
export function calcularMedia(valores: number[]): number | null {
  if (!valores || valores.length === 0) return null;
  const soma = valores.reduce((acc, v) => acc + v, 0);
  return Number((soma / valores.length).toFixed(2));
}

/**
 * Calcula a mediana de um conjunto de valores.
 * Mais robusta que a média para amostras com outliers.
 */
export function calcularMediana(valores: number[]): number | null {
  if (!valores || valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  if (ordenados.length % 2 !== 0) {
    return ordenados[meio];
  }
  return Number(((ordenados[meio - 1] + ordenados[meio]) / 2).toFixed(2));
}

/**
 * Calcula o desvio-padrão amostral (s).
 * Retorna null se amostra < 2 (insuficiência amostral).
 */
export function calcularDesvioPadrao(valores: number[]): number | null {
  if (!valores || valores.length < 2) return null;
  const media = calcularMedia(valores);
  if (media === null) return null;
  const somaQuadrados = valores.reduce((acc, v) => acc + Math.pow(v - media, 2), 0);
  return Number(Math.sqrt(somaQuadrados / (valores.length - 1)).toFixed(2));
}

/**
 * Agrega avaliações de uma equipe preservando regras contra dados fabricados.
 */
export function agregarMetricasEquipe(
  equipe_id: string,
  equipe_nome: string,
  periodo: string,
  avaliacoes: AvaliacaoOficial[]
): MetricasAgregadasEquipe {
  const notasQA = avaliacoes.map((a) => a.nota_final_qa).filter((n) => n != null);
  const notasIEPC = avaliacoes.map((a) => a.indice_iepc).filter((n) => n != null);
  const totalNCs = avaliacoes.reduce((acc, a) => acc + (a.total_ncs || 0), 0);
  const totalAtendimentos = avaliacoes.reduce((acc, a) => acc + (a.qtd_atendimentos_auditados || 1), 0);

  return {
    equipe_id,
    equipe_nome,
    periodo,
    total_avaliados: avaliacoes.length,
    media_qa: calcularMedia(notasQA) ?? 0,
    mediana_qa: calcularMediana(notasQA) ?? undefined,
    media_iepc: calcularMedia(notasIEPC) ?? 0,
    mediana_iepc: calcularMediana(notasIEPC) ?? undefined,
    total_ncs: totalNCs,
    taxa_nc_por_atendimento: totalAtendimentos > 0 ? Number(((totalNCs / totalAtendimentos) * 100).toFixed(2)) : 0,
    desvio_padrao_qa: calcularDesvioPadrao(notasQA) ?? undefined,
    aproveitamento_pilares: {},
  };
}
