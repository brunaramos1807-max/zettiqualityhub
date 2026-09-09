/**
 * QualiVisão — Tipos Canônicos de Domínio
 * Sistema de Gestão da Qualidade orientado por dados
 */

// ─── 1. Estrutura Corporativa Multi-Tenant ────────────────────────────────────

export interface Organizacao {
  id: string;
  nome: string;
  slug: string;
  cnpj?: string;
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
  area_id?: string;
  nome: string; // Ex: Compras e Estoque, PDV, Financeiro Fiscal
  coordenador_nome?: string;
  is_active: boolean;
}

// ─── 2. Governança de Ciclos ──────────────────────────────────────────────────

export type CicloStatus = 'aberto' | 'em_apuracao' | 'em_validacao' | 'fechado_homologado';

export interface Ciclo {
  id: string;
  organizacao_id?: string;
  identificacao: string; // Ex: "Ciclo 09/2026" ou "09/2026"
  periodo: string; // MM/AAAA (ex: "09/2026")
  data_inicio: string; // Data informada manualmente (YYYY-MM-DD)
  data_fim: string; // Data informada manualmente (YYYY-MM-DD)
  status: CicloStatus;
  is_closed: boolean;
  homologado_em?: string | null;
  homologado_por?: string | null;
  total_avaliacoes?: number;
  total_atendimentos?: number;
  total_ncs?: number;
  created_at?: string;
  updated_at?: string;
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
  organizacao_id?: string;
  ciclo_id: string;
  periodo: string; // Identificador do Ciclo (ex: "Ciclo 09/2026" ou "09/2026")
  equipe_id: string;
  equipe_nome: string;
  analista_identificador: string;
  analista_nome: string;
  coordenador_nome?: string;
  auditor_nome?: string;

  // Notas Oficiais Fechadas na Origem
  nota_final_qa: number; // 0 a 100
  indice_iepc: number; // 0 a 100
  total_ncs: number;
  pontos_deduzidos_nc: number;

  // Detalhamento de pilares (P1..P5)
  p1?: number;
  p2?: number;
  p3?: number;
  p4?: number;
  p5?: number;

  // Detalhamento de dimensões (E1..E5)
  e1?: number;
  e2?: number;
  e3?: number;
  e4?: number;
  e5?: number;

  // Amostragem
  qtd_atendimentos_auditados: number;
  data_registro?: string; // Data real do atendimento/auditoria (YYYY-MM-DD)
  hash_registro?: string;
}

// ─── 5. Eventos de Não Conformidade ───────────────────────────────────────────

export interface EventoNaoConformidade {
  id: string;
  avaliacao_id?: string;
  ciclo_id?: string;
  periodo: string;
  equipe_nome: string;
  analista_nome: string;
  coordenador_nome?: string;
  auditor_nome?: string;
  tipo_nc: string;
  pontos_deduzidos: number;
  protocolo_referencia?: string;
  data_registro: string;

  // Estrutura trifásica de auditoria
  evidencia_resumo?: string;
  justificativa?: string;
  impacto?: string;
}

// ─── 6. Indicadores Derivados e Agregações de Medição ─────────────────────────

export interface MetricasAgregadasEquipe {
  equipe_nome: string;
  periodo: string;
  total_avaliados: number;
  media_qa: number;
  media_iepc: number;
  total_ncs: number;
  pontos_deduzidos_nc: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p5: number;
  e1: number;
  e2: number;
  e3: number;
  e4: number;
  e5: number;
  status: 'conforme' | 'alerta' | 'critico';
}

// ─── 7. Diagnóstico e Causa Raiz (Ishikawa e 5 Porquês) ───────────────────────

export interface IshikawaCategoria {
  categoria: 'metodo' | 'mao_de_obra' | 'maquina' | 'material' | 'medicao' | 'meio_ambiente';
  label: string;
  itens: string[];
}

export interface CincoPorquesItem {
  nivel: number;
  pergunta: string;
  resposta: string;
}

export interface InvestigacaoQualidade {
  id: string;
  organizacao_id?: string;
  ciclo_id?: string;
  periodo: string;
  titulo: string;
  desvio_detectado: string;
  indicador_afetado: string;
  squad?: string;
  status: 'aberta' | 'em_analise' | 'causa_validada' | 'convertida_plano' | 'encerrada';
  causa_raiz_validada?: string;
  ishikawa?: IshikawaCategoria[];
  cinco_porques?: CincoPorquesItem[];
  hipoteses?: Array<{ id: string; texto: string; validada: boolean }>;
  criado_por?: string;
  created_at?: string;
  updated_at?: string;
}

// ─── 8. Melhoria Contínua (Planos de Ação 5W2H) ───────────────────────────────

export type StatusPlano5W2H =
  | 'planejado'
  | 'em_execucao'
  | 'concluido'
  | 'em_afericao_eficacia'
  | 'eficaz'
  | 'ineficaz'
  | 'cancelado';

export interface PlanoAcao5W2H {
  id: string;
  organizacao_id?: string;
  ciclo_id?: string;
  periodo: string;
  investigacao_id?: string;
  titulo: string;
  o_que: string; // What
  por_que: string; // Why
  onde: string; // Where
  quem: string; // Who
  quando: string; // When (Data Limite de Execução)
  como: string; // How
  quanto: string; // How Much (Custo ou recursos)
  status: StatusPlano5W2H;
  indicador_alvo: string; // Ex: "QA P2.4", "Índice IEPC", "Taxa de NC"
  meta_alvo: string; // Ex: "Zero reincidência", "Nota >= 90%"
  prazo_eficacia_dias: number; // Configurado por ação: ex: 30, 45, 60 dias
  data_limite_eficacia?: string;
  resultado_eficacia?: string;
  eficacia_atingida?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

// ─── 9. Controle Estatístico de Processo (CEP) ───────────────────────────────

export interface PontoCartaControleP {
  ciclo: string;
  periodo: string;
  tamanho_amostra_n: number;
  defeitos_conformidades: number;
  proporcao_p: number; // p = d / n
  limite_superior_ucl: number; // LSC = p_bar + 3 * sqrt(p_bar*(1-p_bar)/n)
  linha_central_cl: number; // LC = p_bar
  limite_inferior_lcl: number; // LIC = max(0, p_bar - 3 * sqrt(p_bar*(1-p_bar)/n))
  meta_especificacao?: number;
  causa_especial: boolean;
  regra_violada?: string;
}

// ─── 10. Filtro Global Multi-Tenant ──────────────────────────────────────────

export interface FiltroQualiVisao {
  organizacao_id?: string;
  operacao_id?: string;
  area_id?: string;
  equipe_id?: string;
  ciclo_id?: string;
  periodo?: string;
  data_inicio?: string;
  data_fim?: string;
}
