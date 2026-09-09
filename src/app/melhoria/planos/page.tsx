'use client';

import React, { useState } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { 
  CheckSquare, 
  Clock, 
  AlertCircle, 
  Plus, 
  Calendar, 
  User, 
  Target, 
  ArrowUpRight,
  Filter,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  HelpCircle
} from 'lucide-react';
import Link from 'next/link';

interface Plano5W2H {
  id: string;
  what: string;
  why: string;
  where: string;
  who: string;
  when: string;
  how: string;
  howMuch: string;
  indicadorAlvo: string;
  status: 'em_execucao' | 'concluido' | 'aguardando_eficacia' | 'padronizado';
  prazoEficaciaDias: number; // Configurável por ação (ex: 30, 45, 60 dias)
}

const PLANOS_INICIAIS: Plano5W2H[] = [
  {
    id: 'ACT-2026-001',
    what: 'Implementar checklist obrigatório de documentação técnica no encerramento de chamados fiscais',
    why: 'Eliminar a causa raiz de Não Conformidades de Registro e Rastreabilidade no Suporte Fiscal',
    where: 'Ferramenta de Atendimento (SPA / Suporte Fiscal)',
    who: 'Amanda Cristina (Coordenação)',
    when: '15/09/2026',
    how: 'Parametrização de validação de campo técnico antes de permitir status "Resolvido" no chamado.',
    howMuch: 'R$ 0 (Configuração interna de sistema)',
    indicadorAlvo: 'Reduzir NCs da equipe Financeiro Fiscal para zero no ciclo 09/2026',
    status: 'em_execucao',
    prazoEficaciaDias: 30,
  },
  {
    id: 'ACT-2026-002',
    what: 'Treinamento e alinhamento prático sobre critérios de formalização de chamados em SUP',
    why: 'Recuperar o aproveitamento do subcritério P1.2 (Uso e Formalização do SUP)',
    where: 'Equipe de Atendimento PDV',
    who: 'Ayron Silva (Coordenação)',
    when: '10/09/2026',
    how: 'Workshop de 45 minutos com análise comparativa de casos reais e apresentação do manual normativo.',
    howMuch: '2 horas de equipe',
    indicadorAlvo: 'Elevar aproveitamento de P1.2 de 72% para >= 90% no ciclo 09/2026',
    status: 'concluido',
    prazoEficaciaDias: 30,
  },
];

export default function PlanosMelhoriaPage() {
  const [planos, setPlanos] = useState<Plano5W2H[]>(PLANOS_INICIAIS);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [modalAberto, setModalAberto] = useState(false);

  // Form state
  const [novoWhat, setNovoWhat] = useState('');
  const [novoWhy, setNovoWhy] = useState('');
  const [novoWho, setNovoWho] = useState('');
  const [novoWhen, setNovoWhen] = useState('');
  const [novoWhere, setNovoWhere] = useState('');
  const [novoHow, setNovoHow] = useState('');
  const [novoHowMuch, setNovoHowMuch] = useState('R$ 0');
  const [novoIndicador, setNovoIndicador] = useState('');
  const [novoPrazoEficacia, setNovoPrazoEficacia] = useState(30);

  const handleCriarPlano = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoWhat || !novoWho || !novoWhen) return;

    const novoPlano: Plano5W2H = {
      id: `ACT-2026-${String(planos.length + 1).padStart(3, '0')}`,
      what: novoWhat,
      why: novoWhy || 'Melhoria contínua de processo',
      where: novoWhere || 'Operação',
      who: novoWho,
      when: novoWhen,
      how: novoHow || 'Execução de procedimento padrão',
      howMuch: novoHowMuch || 'R$ 0',
      indicadorAlvo: novoIndicador || 'Melhoria de indicador geral',
      status: 'em_execucao',
      prazoEficaciaDias: Number(novoPrazoEficacia),
    };

    setPlanos([novoPlano, ...planos]);
    setModalAberto(false);
    setNovoWhat('');
    setNovoWhy('');
    setNovoWho('');
    setNovoWhen('');
    setNovoWhere('');
    setNovoHow('');
  };

  return (
    <EnterpriseLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Banner de Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md">
              <CheckSquare size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-mono uppercase tracking-wider">Módulo de Melhoria Contínua</div>
              <h1 className="text-sm font-semibold text-white">Planos de Ação 5W2H & Governança de Eficácia</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setModalAberto(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md transition-colors"
            >
              <Plus size={14} />
              <span>Novo Plano 5W2H</span>
            </button>
          </div>
        </div>

        {/* Resumo de Ações */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-md">
            <div className="text-xs text-slate-400">Ações em Andamento</div>
            <div className="text-2xl font-bold text-white mt-1">
              {planos.filter((p) => p.status === 'em_execucao').length}
            </div>
            <div className="text-xs text-blue-400 mt-1">Dentro dos prazos acordados</div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-md">
            <div className="text-xs text-slate-400">Ações Concluídas (Aguardando Ciclo)</div>
            <div className="text-2xl font-bold text-white mt-1">
              {planos.filter((p) => p.status === 'concluido').length}
            </div>
            <div className="text-xs text-amber-400 mt-1">Aferição no próximo fechamento</div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-md">
            <div className="text-xs text-slate-400">Taxa de Eficácia Histórica</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">100%</div>
            <div className="text-xs text-slate-500 mt-1">Processos estabilizados pós-intervenção</div>
          </div>
        </div>

        {/* Tabela Canônica 5W2H */}
        <div className="bg-slate-900 border border-slate-800 rounded-md overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Matriz 5W2H de Ações Corretivas e Preventivas</h3>
            <div className="flex items-center gap-2 text-xs">
              <Filter size={14} className="text-slate-400" />
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-md focus:outline-none"
              >
                <option value="todos">Todos os Status</option>
                <option value="em_execucao">Em Execução</option>
                <option value="concluido">Concluído</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-800">
            {planos.map((plano) => (
              <div key={plano.id} className="p-5 hover:bg-slate-800/30 transition-colors space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-blue-400">{plano.id}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider ${
                      plano.status === 'em_execucao'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {plano.status === 'em_execucao' ? 'Em Execução' : 'Concluído'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-3">
                    <span className="flex items-center gap-1"><User size={12} /> {plano.who}</span>
                    <span className="flex items-center gap-1 font-mono text-white"><Calendar size={12} /> Até {plano.when}</span>
                  </div>
                </div>

                <div className="text-sm font-semibold text-white">{plano.what}</div>

                {/* Grade 5W2H detalhada */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-2">
                  <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-md">
                    <span className="text-slate-500 block font-mono text-[10px] uppercase">Why (Por quê / Causa)</span>
                    <span className="text-slate-300 mt-0.5 block">{plano.why}</span>
                  </div>
                  <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-md">
                    <span className="text-slate-500 block font-mono text-[10px] uppercase">How (Como / Método)</span>
                    <span className="text-slate-300 mt-0.5 block">{plano.how}</span>
                  </div>
                  <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-md">
                    <span className="text-slate-500 block font-mono text-[10px] uppercase">Where (Onde / Célula)</span>
                    <span className="text-slate-300 mt-0.5 block">{plano.where}</span>
                  </div>
                  <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-md">
                    <span className="text-slate-500 block font-mono text-[10px] uppercase">Meta de Eficácia ({plano.prazoEficaciaDias}d)</span>
                    <span className="text-emerald-400 font-medium mt-0.5 block">{plano.indicadorAlvo}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal para Novo Plano 5W2H */}
        {modalAberto && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-md max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-white">Novo Plano de Ação 5W2H</h3>
                <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-white">&times;</button>
              </div>

              <form onSubmit={handleCriarPlano} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">What (O que será feito?)</label>
                  <input 
                    type="text" 
                    required 
                    value={novoWhat} 
                    onChange={(e) => setNovoWhat(e.target.value)}
                    placeholder="Ex: Treinamento prático sobre documentação de chamados"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white focus:outline-none focus:border-blue-500" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Who (Quem é o responsável?)</label>
                    <input 
                      type="text" 
                      required 
                      value={novoWho} 
                      onChange={(e) => setNovoWho(e.target.value)}
                      placeholder="Nome do responsável"
                      className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">When (Data limite)</label>
                    <input 
                      type="date" 
                      required 
                      value={novoWhen} 
                      onChange={(e) => setNovoWhen(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white focus:outline-none" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Why (Qual causa raiz este plano resolve?)</label>
                  <textarea 
                    value={novoWhy} 
                    onChange={(e) => setNovoWhy(e.target.value)}
                    placeholder="Causa validada no Ishikawa/5 Porquês..."
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white focus:outline-none" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Where (Onde / Operação ou Equipe)</label>
                    <input 
                      type="text" 
                      value={novoWhere} 
                      onChange={(e) => setNovoWhere(e.target.value)}
                      placeholder="Ex: Suporte Fiscal"
                      className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Prazo de Aferição de Eficácia</label>
                    <select 
                      value={novoPrazoEficacia} 
                      onChange={(e) => setNovoPrazoEficacia(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white focus:outline-none"
                    >
                      <option value={30}>30 dias (Próximo ciclo)</option>
                      <option value={45}>45 dias</option>
                      <option value={60}>60 dias (2 ciclos)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Indicador Alvo & Meta de Impacto</label>
                  <input 
                    type="text" 
                    value={novoIndicador} 
                    onChange={(e) => setNovoIndicador(e.target.value)}
                    placeholder="Ex: Reduzir NCs de registro para 0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white focus:outline-none" 
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button 
                    type="button" 
                    onClick={() => setModalAberto(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md"
                  >
                    Salvar Plano 5W2H
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </EnterpriseLayout>
  );
}
