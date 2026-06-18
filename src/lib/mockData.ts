// ─── Static labels (used by charts/display) ──────────────────────────────────
export const CYCLE_LABEL = 'Abril/2026';
export const CYCLE_PERIOD = '04/2026';
export const CYCLE_COMPLETION = 85;

export type Role = 'Admin' | 'Coordenador' | 'Diretoria';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  squad?: string;
  avatar: string;
}

export interface Analyst {
  id: string;
  name: string;
  squad: string;
  coordenador: string;
  qaScore: number;
  iepcScore: number;
  ncs: number;
  // ncPoints removed — NC penalty model is tipo+severidade+penalidade (Leve=3/Média=5/Grave=10/Crítica=15)
  p1: number; p2: number; p3: number; p4: number; p5: number;
  e1: number; e2: number; e3: number; e4: number; e5: number;
}

export interface NC {
  id: string;
  protocolo: string;
  analista: string;
  squad: string;
  coordenador: string;
  auditor: string;
  tipo: string;
  severidade?: string;
  penalidade?: number;
  descricao: string;
  data: string;
  avaliacaoId: string;
}

export interface Elogio {
  id: string;
  colaborador: string;
  squad: string;
  cliente: string;
  protocolo: string;
  elogio: string;
  destaque: boolean;
}

// MOCK_USERS removed — user management is handled exclusively by Supabase Auth + analistas table

// NC_RECORDS removed — NC data is consumed exclusively from nc_records table in Supabase
// NC penalty model: tipo (NC-1 to NC-5) + severidade (Leve=3/Média=5/Grave=10/Crítica=15)
// The -20 fixed penalty rule no longer exists.

export const ELOGIOS: Elogio[] = [
  { id: 'elogio-001', colaborador: 'Bruno Reis', squad: 'Compras e Estoque', cliente: 'Sarah', protocolo: 'SUP-63427', elogio: 'Cliente elogiou diretamente o trabalho do analista, destacando a atenção e clareza nas orientações prestadas.', destaque: true },
  { id: 'elogio-002', colaborador: 'Igor Cerqueira', squad: 'PDV N1', cliente: 'Klisman', protocolo: 'SUP-63649', elogio: 'Elogio direto ao analista destacando a qualidade do atendimento e a rapidez na resolução do chamado.', destaque: false },
  { id: 'elogio-003', colaborador: 'Gabriel Vieira', squad: 'Financeiro Fiscal', cliente: 'Rogério', protocolo: 'SUP-63687', elogio: 'Cliente destacou que o analista ajudou muito na situação, demonstrando domínio técnico e paciência.', destaque: true },
  { id: 'elogio-004', colaborador: 'Adriel Sanches', squad: 'PDV', cliente: 'Emanuele', protocolo: 'SUP-63864', elogio: 'Cliente destacou o analista como referência em atendimento — comentou que foi o melhor suporte que já recebeu.', destaque: true },
  { id: 'elogio-005', colaborador: 'Michelly Pereira', squad: 'Financeiro Fiscal', cliente: 'Pedro', protocolo: 'SUP-63986', elogio: 'Elogio direto destacando a qualidade do atendimento e a forma clara como o analista explicou os processos fiscais.', destaque: false },
  { id: 'elogio-006', colaborador: 'Bruno Ribeiro', squad: 'PDV', cliente: 'Abimael', protocolo: 'SUP-64062', elogio: 'Cliente destacou a agilidade e importância do suporte — afirmou que o analista resolveu em minutos o que estava pendente há dias.', destaque: false },
  { id: 'elogio-007', colaborador: 'Jherik Jesus', squad: 'PDV', cliente: 'Felipe', protocolo: 'SUP-64478', elogio: 'Cliente destacou o analista como excelente atendimento — comentou que a solução foi precisa e o analista demonstrou grande conhecimento.', destaque: true },
  { id: 'elogio-008', colaborador: 'Fernando Carvalho', squad: 'Compras e Estoque', cliente: 'Eloane', protocolo: 'SUP-64776', elogio: 'Cliente afirmou que sem o suporte não saberia o que fazer — elogiou a dedicação e o comprometimento do analista.', destaque: false },
  { id: 'elogio-009', colaborador: 'Adriel Sanches', squad: 'PDV', cliente: 'Samuel', protocolo: 'SUP-64782', elogio: 'Elogio ao excelente trabalho prestado — cliente destacou que o analista foi além do esperado para resolver o problema.', destaque: true },
  { id: 'elogio-010', colaborador: 'Milena Santos', squad: 'Compras e Estoque', cliente: 'Sirley', protocolo: 'SUP-64733', elogio: 'Cliente elogiou a paciência e qualidade do atendimento — afirmou que o analista não desistiu até a situação ser resolvida.', destaque: false },
  { id: 'elogio-011', colaborador: 'Francisco Pereira', squad: 'PDV', cliente: 'Lucas', protocolo: 'SUP-62638', elogio: 'Cliente destacou resolução satisfatória do atendimento — elogiou a clareza e objetividade do analista.', destaque: false },
  { id: 'elogio-012', colaborador: 'Gustavo Moreira', squad: 'PDV', cliente: 'Lohran', protocolo: 'SUP-65314', elogio: 'Elogio ao excelente trabalho prestado — cliente ficou surpreso com a agilidade e eficiência na resolução.', destaque: false },
  { id: 'elogio-013', colaborador: 'Jherik Jesus', squad: 'PDV', cliente: 'Amon', protocolo: 'SUP-65387', elogio: 'Elogio pela resolução satisfatória — analista demonstrou proatividade e foi além na orientação ao cliente.', destaque: false },
  { id: 'elogio-014', colaborador: 'Thalisson Silva', squad: 'Compras e Estoque', cliente: 'Kawane Oliveira', protocolo: '#434584', elogio: 'Cliente parabenizou pelo atendimento considerado incrível — destacou a atenção aos detalhes e a resolução completa.', destaque: true },
  { id: 'elogio-015', colaborador: 'Francisco Pereira', squad: 'PDV', cliente: 'Elaine', protocolo: 'SUP-66217', elogio: 'Cliente destacou atenção e agilidade no atendimento — elogiou a forma como o analista conduziu toda a tratativa.', destaque: false },
  { id: 'elogio-016', colaborador: 'Michelly Pereira', squad: 'Financeiro Fiscal', cliente: 'Cláudio', protocolo: 'SUP-66426', elogio: 'Cliente elogiou a forma de explicar e apoio prestado — afirmou que o analista tornou um processo complexo muito simples de entender.', destaque: true },
  { id: 'elogio-017', colaborador: 'Thalisson Silva', squad: 'Compras e Estoque', cliente: 'Kawane', protocolo: '#438498', elogio: 'Cliente agradeceu e destacou alto nível de atendimento — elogiou a consistência e profissionalismo do analista.', destaque: false },
  { id: 'elogio-018', colaborador: 'Larissa Marques', squad: 'Financeiro Fiscal', cliente: 'Abimael', protocolo: 'SUP-66543', elogio: 'Cliente destacou grande ajuda e suporte na situação — afirmou que o analista foi fundamental para resolver uma questão crítica.', destaque: true },
  { id: 'elogio-019', colaborador: 'Francisco Pereira', squad: 'PDV', cliente: 'Thiago', protocolo: 'SUP-66629', elogio: 'Atendimento claro, efetivo e com bom suporte — cliente elogiou a postura profissional e a objetividade na resolução.', destaque: false },
  { id: 'elogio-020', colaborador: 'Gabriel Vieira', squad: 'Compras e Estoque', cliente: 'Cláudio', protocolo: 'SUP-66598', elogio: 'Cliente destacou que as orientações resolveram totalmente o problema — elogiou a expertise técnica e a clareza na comunicação.', destaque: true },
];

// MONTHLY_TREND: fallback only when Supabase returns no data
export const MONTHLY_TREND = [
  { month: 'Abr/2026', qa: 80.24, iepc: 80.06 },
];

export const PILLAR_DESCRIPTIONS: Record<string, { title: string; description: string; maxPoints: number; type: 'QA' | 'IEPC' }> = {
  P1: { title: 'Gestão do Fluxo e Rastreabilidade do Atendimento', description: 'Avalia o registro de protocolo (SUP), boas-vindas/identificação e encerramento adequado em cada etapa da interação. Critérios: P1.1.1 Identificação e Boas-vindas (5pts), P1.1.2 Formalização e comunicação do protocolo SUP (9pts), P1.1.3 Encerramento da interação por etapa (8pts).', maxPoints: 22, type: 'QA' },
  P2: { title: 'Gestão da Tratativa da Demanda', description: 'Avalia a validação de dúvidas, orientação na execução, resolução/direcionamento correto e documentação técnica. Critérios: P2.2.1 Validação e esclarecimento de dúvidas (8pts), P2.2.2 Orientação e condução da execução (9pts), P2.2.3 Resolução ou direcionamento adequado (9pts), P2.2.4 Documentação técnica do atendimento (8pts).', maxPoints: 34, type: 'QA' },
  P3: { title: 'Análise e Assertividade Técnica da Demanda', description: 'Avalia a precisão da análise técnica e o uso adequado das ferramentas de apoio. Critérios: P3.3.1 Análise técnica da demanda (10pts), P3.3.2 Uso adequado das ferramentas de apoio (8pts).', maxPoints: 18, type: 'QA' },
  P4: { title: 'Qualidade da Comunicação no Atendimento', description: 'Avalia o uso da língua portuguesa, tom/postura profissional e clareza/organização da comunicação. Critérios: P4.4.1 Uso adequado da língua portuguesa (4pts), P4.4.2 Adequação do tom e postura profissional (5pts), P4.4.3 Clareza e organização da comunicação (5pts).', maxPoints: 14, type: 'QA' },
  P5: { title: 'Conduta Relacional no Atendimento', description: 'Avalia cordialidade/empatia, proatividade na condução e over delivery. Critérios: P5.5.1 Cordialidade e empatia (4pts), P5.5.2 Proatividade na condução (5pts), P5.5.3 Over delivery (3pts).', maxPoints: 12, type: 'QA' },
  E1: { title: 'Resolução Percebida', description: 'Percepção do cliente sobre se o problema foi efetivamente resolvido. Este é o pilar de maior peso no IEPC (30 pontos), refletindo diretamente a satisfação final do cliente com o resultado do atendimento.', maxPoints: 30, type: 'IEPC' },
  E2: { title: 'Compreensão e Segurança', description: 'Compreensão do cliente e sensação de segurança nas orientações do analista. Avalia se o cliente saiu do atendimento com clareza sobre o que foi feito e confiança na solução apresentada.', maxPoints: 20, type: 'IEPC' },
  E3: { title: 'Esforço do Cliente', description: 'Mede o quanto o cliente precisou se esforçar para ter seu problema resolvido. Menor esforço = maior pontuação. Avalia acessibilidade, clareza das instruções e quantidade de interações necessárias.', maxPoints: 20, type: 'IEPC' },
  E4: { title: 'Tempo e Fluidez', description: 'Avalia o tempo de resposta e a fluidez da interação ao longo do atendimento. Considera agilidade nas respostas, ausência de pausas longas e continuidade no fluxo de resolução.', maxPoints: 15, type: 'IEPC' },
  E5: { title: 'Experiência Relacional', description: 'Experiência relacional do cliente — cordialidade, personalização e empatia demonstradas pelo analista durante toda a interação.', maxPoints: 15, type: 'IEPC' },
};

// ─── NC Official Model ────────────────────────────────────────────────────────
// Tipo: NC-1 to NC-5 | Severidade: Leve=3 / Média=5 / Grave=10 / Crítica=15
// Penalidade pertence à severidade, NÃO ao tipo.
// Regra -20 pontos fixos foi REMOVIDA definitivamente.
export const NC_SEVERIDADE_PENALIDADE: Record<string, number> = {
  'Leve': 3,
  'Média': 5,
  'Grave': 10,
  'Crítica': 15,
};

export const NC_TIPOS = [
  { key: 'NC-1', nome: 'Postura e Ética Profissional', descricao: 'Desvio relacionado à conduta profissional.' },
  { key: 'NC-2', nome: 'Acuracidade e Rigor Técnico', descricao: 'Falha técnica relevante.' },
  { key: 'NC-3', nome: 'Conformidade de Registro e Rastreabilidade', descricao: 'Ausência ou falha de registros obrigatórios.' },
  { key: 'NC-4', nome: 'Integridade do Fluxo Operacional', descricao: 'Quebra do fluxo institucional.' },
  { key: 'NC-5', nome: 'Segurança da Informação', descricao: 'Violação de segurança.' },
];

export function getScoreColor(score: number): string {
  if (score >= 85) return '#22C55E';
  if (score >= 70) return '#EAB308';
  return '#EF4444';
}

export function getScoreBadgeClass(score: number): string {
  if (score >= 85) return 'badge-success';
  if (score >= 70) return 'badge-warning';
  return 'badge-danger';
}

export function getScoreLabel(score: number): string {
  if (score >= 85) return 'Excelente';
  if (score >= 70) return 'Atenção';
  return 'Crítico';
}
const ANALYSTS: any = null;

export { ANALYSTS };
const NC_RECORDS: any = null;

export { NC_RECORDS };
const SQUAD_AVERAGES: any = null;

export { SQUAD_AVERAGES };