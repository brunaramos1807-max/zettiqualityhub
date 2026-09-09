/**
 * QualiVisão — Tipos Canônicos de Domínio
 * Sistema de Gestão da Qualidade orientado por dados
 */

// ─── 1. Estrutura Corporativa Multi-Tenant ────────────────────────────────────

export interface Organizacao {
  id: string;
  nome: string;
  slug: string;
  created_at?: string;
}

export interface Operacao {
  id: string;
  organizacao_id: string;
  nome: string;
  descricao?: string;
  is_active: boolean;
}

export interface Area {
  id: string;
  operacao_id: string;
  nome: string; // Ex: N1, N2, Fiscal, Faturamento
  is_active: boolean;
}

export interface Equipe {
  id: string;
  area_id: string;
  nome: string; // Ex: Compras e Estoque, PDV, Financeiro Fiscal
  coordenador_nome?: string;
  is_active: boolean;
}

// ─── 2. Governança de Ciclos ──────────────────────────────────────────────────

export type CicloStatus = 'aberto' | 'em_apuracao' | 'em_validacao' | 'fechado_homologado';

export interface Ciclo {
  id: string;
  organizacao_id: string;
  periodo: string; // Formato MM/YYYY, ex: "08/2026"
  data_inicio: string; // Referência dia 26 do mês anterior
  data_fim: string; // Referência dia 25 do mês atual
  status: CicloStatus;
  homologado_em?: string | null;
  homologado_por?: string | null;
  total_avaliacoes?: number;
  total_atendimentos?: number;
  total_ncs?: number;
}

// ─── 3. Configuração Metodológica (Sem Hardcoding) ─────────────────────────────

export interface PilarConfig {
  codigo: string; // 'p1'..'p5'
  nome: string;
  peso_maximo: number;
  descricao?: string;
}

export interface DimensaoConfig {
  codigo: string; // 'e1'..'e5'
  nome: string;
  peso_maximo: number;
  descricao?: string;
}

export interface NCMetodologiaConfig {
  deducao_padrao_pontos: number; // Padrão atual: 20
  unidade: 'pontos';
  aplicacao: 'por_ocorrencia';
  permite_reincidencia: boolean;
}

export interface ConfiguracaoMetodologica {
  id?: string;
  organizacao_id: string;
  versao_metodologia: string; // Ex: 'QA-V4.0'
  qa_maximo: number; // 100
  iepc_maximo: number; // 100
  pilares_qa: PilarConfig[];
  dimensoes_iepc: DimensaoConfig[];
  nc_regra: NCMetodologiaConfig;
  is_active: boolean;
}

// ─── 4. Resultados Oficiais de Qualidade (Preservados da Origem) ───────────────

export interface AvaliacaoOficial {
  id: string;
  organizacao_id: string;
  ciclo_id: string;
  periodo: string;
  equipe_id: string;
  equipe_nome: string;
  analista_identificador: string; // Identificador da pessoa avaliada
  analista_nome: string;
  coordenador_nome?: string;
  auditor_nome?: string;
  
  // Notas Oficiais Fechadas na Origem
  nota_final_qa: number; // 0 a 100
  indice_iepc: number; // 0 a 100
  total_ncs: number;
  pontos_deduzidos_nc: number;
  
  // Amostragem
  qtd_atendimentos_auditados: number;
  data_registro?: string;
  hash_registro?: string;
}

export interface PontuacaoSubcriterioQA {
  avaliacao_id: string;
  pilar_codigo: string; // P1..P5
  subpilar_codigo: string; // Ex: P1.1, P2.3
  subpilar_nome: string;
  pontos_obtidos: number;
  pontos_maximos: number;
  classificacao?: 'pontuou' | 'parcial' | 'nao_pontuou';
}

export interface PontuacaoDimensaoIEPC {
  avaliacao_id: string;
  dimensao_codigo: string; // E1..E5
  dimensao_nome: string;
  pontos_obtidos: number;
  pontos_maximos: number;
}

// ─── 5. Eventos de Não Conformidade ───────────────────────────────────────────

export interface EventoNaoConformidade {
  id: string;
  avaliacao_id: string;
  ciclo_id: string;
  periodo: string;
  equipe_nome: string;
  analista_nome: string;
  coordenador_nome?: string;
  auditor_nome?: string;
  tipo_nc: string; // Ex: 'Integridade do Fluxo Operacional', 'Conformidade de Registro e Rastreabilidade'
  pontos_deduzidos: number; // Configurado por regra
  protocolo_referencia?: string; // Ex: '#478476'
  data_registro: string;
  
  // Estrutura trifásica de auditoria
  evidencia_resumo?: string;
  justificativa?: string;
  impacto?: string;
}

// ─── 6. Indicadores Derivados (Calculados pelo QualiVisão) ─────────────────────

export interface MetricasAgregadasEquipe {
  equipe_id: string;
  equipe_nome: string;
  periodo: string;
  total_avaliados: number;
  media_qa: number;
  mediana_qa?: number;
  media_iepc: number;
  mediana_iepc?: number;
  total_ncs: number;
  taxa_nc_por_atendimento: number; // Total NC / Total Atendimentos
  desvio_padrao_qa?: number;
  aproveitamento_pilares: Record<string, number>; // p1..p5 em %
}

// ─── 7. Ingestão de Lotes ─────────────────────────────────────────────────────

export interface IngestaoLote {
  id: string;
  organizacao_id: string;
  origem: string;
  versao_schema: string;
  nome_arquivo?: string;
  total_recebido: number;
  total_aceito: number;
  total_rejeitado: number;
  erros_validacao?: string[];
  criado_em: string;
  status: 'processado' | 'falha_parcial' | 'rejeitado';
}
