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
  ncPoints: number;
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
  descricao: string;
  pontosDescontados: number;
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

export const MOCK_USERS: User[] = [
  { id: 'user-001', name: 'Admin Empresa', email: 'admin@empresa.com.br', role: 'Admin', avatar: 'AE' },
  { id: 'user-002', name: 'Coordenador Alpha', email: 'coord.alpha@empresa.com.br', role: 'Coordenador', squad: 'Suporte N1', avatar: 'CA' },
  { id: 'user-003', name: 'Coordenador Beta', email: 'coord.beta@empresa.com.br', role: 'Coordenador', squad: 'Suporte N2', avatar: 'CB' },
  { id: 'user-004', name: 'Coordenador Gama', email: 'coord.gama@empresa.com.br', role: 'Coordenador', squad: 'Financeiro', avatar: 'CG' },
  { id: 'user-005', name: 'Diretoria Empresa', email: 'diretoria@empresa.com.br', role: 'Diretoria', avatar: 'DE' },
];

// DEMO_CREDENTIALS removed — credentials must not be stored in source code

export const ANALYSTS: Analyst[] = [
  { id: 'analyst-001', name: 'Analista 01', squad: 'Financeiro', coordenador: 'Coordenador Gama', qaScore: 94.00, iepcScore: 95.00, ncs: 0, ncPoints: 0, p1: 22, p2: 34, p3: 18, p4: 14, p5: 12, e1: 29, e2: 19, e3: 19, e4: 14, e5: 14 },
  { id: 'analyst-002', name: 'Analista 02', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', qaScore: 90.60, iepcScore: 90.00, ncs: 0, ncPoints: 0, p1: 20, p2: 32, p3: 16, p4: 13, p5: 11, e1: 27, e2: 18, e3: 18, e4: 14, e5: 13 },
  { id: 'analyst-003', name: 'Analista 03', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', qaScore: 90.00, iepcScore: 90.00, ncs: 0, ncPoints: 0, p1: 20, p2: 31, p3: 17, p4: 13, p5: 11, e1: 27, e2: 18, e3: 18, e4: 14, e5: 13 },
  { id: 'analyst-004', name: 'Analista 04', squad: 'Suporte N2', coordenador: 'Coordenador Beta', qaScore: 89.50, iepcScore: 80.00, ncs: 0, ncPoints: 0, p1: 20, p2: 30, p3: 16, p4: 13, p5: 11, e1: 24, e2: 16, e3: 16, e4: 12, e5: 12 },
  { id: 'analyst-005', name: 'Analista 05', squad: 'Suporte N2', coordenador: 'Coordenador Beta', qaScore: 88.20, iepcScore: 80.00, ncs: 0, ncPoints: 0, p1: 19, p2: 30, p3: 16, p4: 13, p5: 11, e1: 24, e2: 16, e3: 16, e4: 12, e5: 12 },
  { id: 'analyst-006', name: 'Analista 06', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', qaScore: 87.60, iepcScore: 80.00, ncs: 0, ncPoints: 0, p1: 19, p2: 30, p3: 16, p4: 12, p5: 11, e1: 24, e2: 16, e3: 16, e4: 12, e5: 12 },
  { id: 'analyst-007', name: 'Analista 07', squad: 'Suporte N2', coordenador: 'Coordenador Beta', qaScore: 87.50, iepcScore: 93.00, ncs: 1, ncPoints: -20, p1: 19, p2: 30, p3: 16, p4: 12, p5: 11, e1: 28, e2: 19, e3: 18, e4: 14, e5: 14 },
  { id: 'analyst-008', name: 'Analista 08', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', qaScore: 83.33, iepcScore: 84.00, ncs: 2, ncPoints: -40, p1: 18, p2: 28, p3: 15, p4: 12, p5: 10, e1: 25, e2: 17, e3: 17, e4: 13, e5: 12 },
  { id: 'analyst-009', name: 'Analista 09', squad: 'Suporte N2', coordenador: 'Coordenador Beta', qaScore: 82.80, iepcScore: 76.00, ncs: 1, ncPoints: -20, p1: 18, p2: 28, p3: 15, p4: 11, p5: 10, e1: 23, e2: 15, e3: 15, e4: 12, e5: 11 },
  { id: 'analyst-010', name: 'Analista 10', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', qaScore: 82.50, iepcScore: 80.00, ncs: 0, ncPoints: 0, p1: 18, p2: 28, p3: 15, p4: 11, p5: 10, e1: 24, e2: 16, e3: 16, e4: 12, e5: 12 },
  { id: 'analyst-011', name: 'Analista 11', squad: 'Suporte N2', coordenador: 'Coordenador Beta', qaScore: 80.60, iepcScore: 81.00, ncs: 1, ncPoints: -20, p1: 17, p2: 27, p3: 15, p4: 11, p5: 10, e1: 24, e2: 16, e3: 16, e4: 13, e5: 12 },
  { id: 'analyst-012', name: 'Analista 12', squad: 'Suporte N2', coordenador: 'Coordenador Beta', qaScore: 81.00, iepcScore: 76.00, ncs: 1, ncPoints: -20, p1: 17, p2: 28, p3: 15, p4: 11, p5: 10, e1: 23, e2: 15, e3: 15, e4: 12, e5: 11 },
  { id: 'analyst-013', name: 'Analista 13', squad: 'Financeiro', coordenador: 'Coordenador Gama', qaScore: 74.90, iepcScore: 78.00, ncs: 1, ncPoints: -20, p1: 16, p2: 25, p3: 13, p4: 10, p5: 9, e1: 23, e2: 16, e3: 15, e4: 12, e5: 12 },
  { id: 'analyst-014', name: 'Analista 14', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', qaScore: 74.60, iepcScore: 82.00, ncs: 2, ncPoints: -40, p1: 16, p2: 25, p3: 13, p4: 10, p5: 9, e1: 25, e2: 16, e3: 16, e4: 13, e5: 12 },
  { id: 'analyst-015', name: 'Analista 15', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', qaScore: 70.00, iepcScore: 67.00, ncs: 2, ncPoints: -40, p1: 15, p2: 24, p3: 13, p4: 9, p5: 9, e1: 20, e2: 13, e3: 13, e4: 11, e5: 10 },
  { id: 'analyst-016', name: 'Analista 16', squad: 'Vendas', coordenador: 'Coordenador Alpha', qaScore: 63.20, iepcScore: 70.00, ncs: 2, ncPoints: -40, p1: 14, p2: 21, p3: 11, p4: 9, p5: 8, e1: 21, e2: 14, e3: 14, e4: 11, e5: 10 },
  { id: 'analyst-017', name: 'Analista 17', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', qaScore: 64.00, iepcScore: 75.00, ncs: 3, ncPoints: -60, p1: 14, p2: 22, p3: 11, p4: 9, p5: 8, e1: 22, e2: 15, e3: 15, e4: 12, e5: 11 },
  { id: 'analyst-018', name: 'Analista 18', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', qaScore: 55.83, iepcScore: 53.00, ncs: 4, ncPoints: -80, p1: 12, p2: 19, p3: 10, p4: 8, p5: 7, e1: 16, e2: 10, e3: 11, e4: 9, e5: 7 },
];

export const SQUAD_AVERAGES = [
  { squad: 'Suporte N2', avgQA: 84.93, avgIEPC: 81.00, analysts: 6 },
  { squad: 'Financeiro', avgQA: 84.45, avgIEPC: 86.50, analysts: 2 },
  { squad: 'Suporte N1', avgQA: 77.61, avgIEPC: 77.89, analysts: 9 },
  { squad: 'Vendas', avgQA: 63.20, avgIEPC: 70.00, analysts: 1 },
];

export const NC_RECORDS: NC[] = [
  { id: 'nc-001', protocolo: '#427754', analista: 'Analista 18', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', auditor: 'Auditor 01', tipo: 'Integridade do Fluxo Operacional', descricao: 'Analista não realizou a formalização do protocolo SUP no início do atendimento, comprometendo a rastreabilidade do fluxo operacional.', pontosDescontados: -20, data: '15/04/2026', avaliacaoId: 'eval-gm-001' },
  { id: 'nc-002', protocolo: '#427891', analista: 'Analista 18', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', auditor: 'Auditor 01', tipo: 'Conformidade de Registro e Rastreabilidade', descricao: 'Registro incompleto da tratativa no sistema de suporte — ausência de documentação técnica ao final do atendimento.', pontosDescontados: -20, data: '16/04/2026', avaliacaoId: 'eval-gm-002' },
  { id: 'nc-003', protocolo: '#428102', analista: 'Analista 18', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', auditor: 'Auditor 01', tipo: 'Conformidade de Registro e Rastreabilidade', descricao: 'Encerramento da interação sem confirmação do cliente e sem registro de resolução no protocolo.', pontosDescontados: -20, data: '17/04/2026', avaliacaoId: 'eval-gm-003' },
  { id: 'nc-004', protocolo: '#428456', analista: 'Analista 18', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', auditor: '', tipo: 'Conformidade de Registro e Rastreabilidade', descricao: 'Ausência de boas-vindas padronizadas e identificação do analista no início do atendimento.', pontosDescontados: -20, data: '18/04/2026', avaliacaoId: 'eval-gm-004' },
  { id: 'nc-005', protocolo: '#428701', analista: 'Analista 17', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', auditor: 'Auditor 01', tipo: 'Conformidade de Registro e Rastreabilidade', descricao: 'Protocolo não comunicado ao cliente durante o atendimento — violação do critério P1.1.2.', pontosDescontados: -20, data: '15/04/2026', avaliacaoId: 'eval-af-001' },
  { id: 'nc-006', protocolo: '#429034', analista: 'Analista 17', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', auditor: 'Auditor 01', tipo: 'Conformidade de Registro e Rastreabilidade', descricao: 'Documentação técnica ausente — analista encerrou o ticket sem registrar os passos de resolução executados.', pontosDescontados: -20, data: '16/04/2026', avaliacaoId: 'eval-af-002' },
  { id: 'nc-007', protocolo: '#429287', analista: 'Analista 17', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', auditor: 'Auditor 01', tipo: 'Conformidade de Registro e Rastreabilidade', descricao: 'Ausência de encerramento formal da interação — cliente ficou sem confirmação de resolução.', pontosDescontados: -20, data: '17/04/2026', avaliacaoId: 'eval-af-003' },
  { id: 'nc-008', protocolo: '#429512', analista: 'Analista 15', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', auditor: 'Auditor 01', tipo: 'Integridade do Fluxo Operacional', descricao: 'Analista redirecionou o cliente para outro setor sem validar a demanda previamente — violação do critério P2.2.3.', pontosDescontados: -20, data: '18/04/2026', avaliacaoId: 'eval-fp-001' },
  { id: 'nc-009', protocolo: '#429748', analista: 'Analista 15', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', auditor: 'Auditor 01', tipo: 'Conformidade de Registro e Rastreabilidade', descricao: 'Registro técnico incompleto — ausência de descrição detalhada da solução aplicada no protocolo.', pontosDescontados: -20, data: '19/04/2026', avaliacaoId: 'eval-fp-002' },
  { id: 'nc-010', protocolo: '#430012', analista: 'Analista 16', squad: 'Vendas', coordenador: 'Coordenador Alpha', auditor: 'Auditor 01', tipo: 'Conformidade de Registro e Rastreabilidade', descricao: 'Protocolo SUP não registrado no início do atendimento N1 — rastreabilidade comprometida.', pontosDescontados: -20, data: '19/04/2026', avaliacaoId: 'eval-ac-001' },
  { id: 'nc-011', protocolo: '#430198', analista: 'Analista 16', squad: 'Vendas', coordenador: 'Coordenador Alpha', auditor: 'Auditor 01', tipo: 'Conformidade de Registro e Rastreabilidade', descricao: 'Encerramento sem validação do cliente — critério P1.1.3 não atendido.', pontosDescontados: -20, data: '20/04/2026', avaliacaoId: 'eval-ac-002' },
  { id: 'nc-012', protocolo: '#430445', analista: 'Analista 08', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', auditor: 'Auditor 01', tipo: 'Conformidade de Registro e Rastreabilidade', descricao: 'Ausência de documentação técnica — tratativa não registrada adequadamente no sistema.', pontosDescontados: -20, data: '20/04/2026', avaliacaoId: 'eval-ra-001' },
  { id: 'nc-013', protocolo: '#430687', analista: 'Analista 08', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', auditor: '', tipo: 'Integridade do Fluxo Operacional', descricao: 'Fluxo de escalação não seguido corretamente — analista resolveu demanda fora do seu escopo sem acionamento do nível superior.', pontosDescontados: -20, data: '21/04/2026', avaliacaoId: 'eval-ra-002' },
  { id: 'nc-014', protocolo: '#430891', analista: 'Analista 14', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', auditor: 'Auditor 01', tipo: 'Conformidade de Registro e Rastreabilidade', descricao: 'Boas-vindas e identificação não realizadas conforme padrão — critério P1.1.1 não atendido.', pontosDescontados: -20, data: '21/04/2026', avaliacaoId: 'eval-br-001' },
  { id: 'nc-015', protocolo: '#431102', analista: 'Analista 14', squad: 'Suporte N1', coordenador: 'Coordenador Alpha', auditor: 'Auditor 01', tipo: 'Conformidade de Registro e Rastreabilidade', descricao: 'Protocolo não comunicado ao cliente — P1.1.2 violado pela segunda vez no ciclo.', pontosDescontados: -20, data: '22/04/2026', avaliacaoId: 'eval-br-002' },
  { id: 'nc-016', protocolo: '#431345', analista: 'Analista 12', squad: 'Suporte N2', coordenador: 'Coordenador Beta', auditor: 'Auditor 01', tipo: 'Conformidade de Registro e Rastreabilidade', descricao: 'Documentação da tratativa incompleta — sistema não atualizado com o status de resolução.', pontosDescontados: -20, data: '20/04/2026', avaliacaoId: 'eval-dc-001' },
  { id: 'nc-017', protocolo: '#431567', analista: 'Analista 07', squad: 'Suporte N2', coordenador: 'Coordenador Beta', auditor: 'Auditor 01', tipo: 'Conformidade de Registro e Rastreabilidade', descricao: 'Encerramento da interação sem confirmação formal do cliente — critério P1.1.3 não cumprido.', pontosDescontados: -20, data: '21/04/2026', avaliacaoId: 'eval-fc-001' },
  { id: 'nc-018', protocolo: '#431789', analista: 'Analista 09', squad: 'Suporte N2', coordenador: 'Coordenador Beta', auditor: '', tipo: 'Integridade do Fluxo Operacional', descricao: 'Fluxo de atendimento interrompido sem esclarecimento ao cliente sobre próximos passos — P2.2.2 não atendido.', pontosDescontados: -20, data: '21/04/2026', avaliacaoId: 'eval-ms-001' },
  { id: 'nc-019', protocolo: '#432012', analista: 'Analista 11', squad: 'Suporte N2', coordenador: 'Coordenador Beta', auditor: 'Auditor 01', tipo: 'Conformidade de Registro e Rastreabilidade', descricao: 'Registro técnico incompleto após orientação — analista não atualizou o protocolo com a solução final.', pontosDescontados: -20, data: '22/04/2026', avaliacaoId: 'eval-go-001' },
  { id: 'nc-020', protocolo: '#432234', analista: 'Analista 13', squad: 'Financeiro', coordenador: 'Coordenador Gama', auditor: 'Auditor 01', tipo: 'Integridade do Fluxo Operacional', descricao: 'Analista não seguiu o fluxo de validação fiscal antes de orientar o cliente — risco de informação incorreta transmitida.', pontosDescontados: -20, data: '22/04/2026', avaliacaoId: 'eval-wm-001' },
];

export const ELOGIOS: Elogio[] = [
  { id: 'elogio-001', colaborador: 'Analista 06', squad: 'Suporte N2', cliente: 'Cliente 01', protocolo: 'SUP-63427', elogio: 'Cliente elogiou diretamente o trabalho do analista, destacando a atenção e clareza nas orientações prestadas.', destaque: true },
  { id: 'elogio-002', colaborador: 'Analista 20', squad: 'Vendas', cliente: 'Cliente 02', protocolo: 'SUP-63649', elogio: 'Elogio direto ao analista destacando a qualidade do atendimento e a rapidez na resolução do chamado.', destaque: false },
  { id: 'elogio-003', colaborador: 'Analista 05', squad: 'Financeiro', cliente: 'Cliente 03', protocolo: 'SUP-63687', elogio: 'Cliente destacou que o analista ajudou muito na situação, demonstrando domínio técnico e paciência.', destaque: true },
  { id: 'elogio-004', colaborador: 'Analista 10', squad: 'Suporte N1', cliente: 'Cliente 04', protocolo: 'SUP-63864', elogio: 'Cliente destacou o analista como referência em atendimento — comentou que foi o melhor suporte que já recebeu.', destaque: true },
  { id: 'elogio-005', colaborador: 'Analista 21', squad: 'Financeiro', cliente: 'Cliente 05', protocolo: 'SUP-63986', elogio: 'Elogio direto destacando a qualidade do atendimento e a forma clara como o analista explicou os processos fiscais.', destaque: false },
  { id: 'elogio-006', colaborador: 'Analista 14', squad: 'Suporte N1', cliente: 'Cliente 06', protocolo: 'SUP-64062', elogio: 'Cliente destacou a agilidade e importância do suporte — afirmou que o analista resolveu em minutos o que estava pendente há dias.', destaque: false },
  { id: 'elogio-007', colaborador: 'Analista 02', squad: 'Suporte N1', cliente: 'Cliente 07', protocolo: 'SUP-64478', elogio: 'Cliente destacou o analista como excelente atendimento — comentou que a solução foi precisa e o analista demonstrou grande conhecimento.', destaque: true },
  { id: 'elogio-008', colaborador: 'Analista 07', squad: 'Suporte N2', cliente: 'Cliente 08', protocolo: 'SUP-64776', elogio: 'Cliente afirmou que sem o suporte não saberia o que fazer — elogiou a dedicação e o comprometimento do analista.', destaque: false },
  { id: 'elogio-009', colaborador: 'Analista 10', squad: 'Suporte N1', cliente: 'Cliente 09', protocolo: 'SUP-64782', elogio: 'Elogio ao excelente trabalho prestado — cliente destacou que o analista foi além do esperado para resolver o problema.', destaque: true },
  { id: 'elogio-010', colaborador: 'Analista 09', squad: 'Suporte N2', cliente: 'Cliente 10', protocolo: 'SUP-64733', elogio: 'Cliente elogiou a paciência e qualidade do atendimento — afirmou que o analista não desistiu até a situação ser resolvida.', destaque: false },
  { id: 'elogio-011', colaborador: 'Analista 15', squad: 'Suporte N1', cliente: 'Cliente 11', protocolo: 'SUP-62638', elogio: 'Cliente destacou resolução satisfatória do atendimento — elogiou a clareza e objetividade do analista.', destaque: false },
  { id: 'elogio-012', colaborador: 'Analista 18', squad: 'Suporte N1', cliente: 'Cliente 12', protocolo: 'SUP-65314', elogio: 'Elogio ao excelente trabalho prestado — cliente ficou surpreso com a agilidade e eficiência na resolução.', destaque: false },
  { id: 'elogio-013', colaborador: 'Analista 02', squad: 'Suporte N1', cliente: 'Cliente 13', protocolo: 'SUP-65387', elogio: 'Elogio pela resolução satisfatória — analista demonstrou proatividade e foi além na orientação ao cliente.', destaque: false },
  { id: 'elogio-014', colaborador: 'Analista 04', squad: 'Suporte N2', cliente: 'Cliente 14', protocolo: '#434584', elogio: 'Cliente parabenizou pelo atendimento considerado incrível — destacou a atenção aos detalhes e a resolução completa.', destaque: true },
  { id: 'elogio-015', colaborador: 'Analista 15', squad: 'Suporte N1', cliente: 'Cliente 15', protocolo: 'SUP-66217', elogio: 'Cliente destacou atenção e agilidade no atendimento — elogiou a forma como o analista conduziu toda a tratativa.', destaque: false },
  { id: 'elogio-016', colaborador: 'Analista 21', squad: 'Financeiro', cliente: 'Cliente 16', protocolo: 'SUP-66426', elogio: 'Cliente elogiou a forma de explicar e apoio prestado — afirmou que o analista tornou um processo complexo muito simples de entender.', destaque: true },
  { id: 'elogio-017', colaborador: 'Analista 04', squad: 'Suporte N2', cliente: 'Cliente 17', protocolo: '#438498', elogio: 'Cliente agradeceu e destacou alto nível de atendimento — elogiou a consistência e profissionalismo do analista.', destaque: false },
  { id: 'elogio-018', colaborador: 'Analista 22', squad: 'Financeiro', cliente: 'Cliente 18', protocolo: 'SUP-66543', elogio: 'Cliente destacou grande ajuda e suporte na situação — afirmou que o analista foi fundamental para resolver uma questão crítica.', destaque: true },
  { id: 'elogio-019', colaborador: 'Analista 15', squad: 'Suporte N1', cliente: 'Cliente 19', protocolo: 'SUP-66629', elogio: 'Atendimento claro, efetivo e com bom suporte — cliente elogiou a postura profissional e a objetividade na resolução.', destaque: false },
  { id: 'elogio-020', colaborador: 'Analista 05', squad: 'Suporte N2', cliente: 'Cliente 20', protocolo: 'SUP-66598', elogio: 'Cliente destacou que as orientações resolveram totalmente o problema — elogiou a expertise técnica e a clareza na comunicação.', destaque: true },
];;

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