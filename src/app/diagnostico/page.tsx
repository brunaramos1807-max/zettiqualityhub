'use client';

import React, { useState } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { 
  GitBranch, 
  HelpCircle, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  Plus, 
  FileText, 
  AlertCircle,
  TrendingDown,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

interface Investigacao {
  id: string;
  titulo: string;
  indicadorAfetado: string;
  equipeAfetada: string;
  perdaEstimada: string;
  status: 'em_investigacao' | 'causa_validada' | 'plano_criado';
  causaRaiz?: string;
  dataAbertura: string;
}

const INVESTIGACOES_INICIAIS: Investigacao[] = [
  {
    id: 'INV-2026-001',
    titulo: 'Alta recorrência de Não Conformidades de Registro e Rastreabilidade no Suporte Fiscal',
    indicadorAfetado: 'Não Conformidades (8 ocorrências)',
    equipeAfetada: 'Financeiro Fiscal',
    perdaEstimada: '-160 pontos no ciclo',
    status: 'causa_validada',
    causaRaiz: 'Falta de checklist obrigatório de documentação técnica ao encerrar chamados de SPA/Desenvolvimento.',
    dataAbertura: '22/08/2026',
  },
  {
    id: 'INV-2026-002',
    titulo: 'Queda de aproveitamento no Pilar P2.4 (Documentação Técnica)',
    indicadorAfetado: 'QA — P2 Tratativa da Demanda',
    equipeAfetada: 'PDV & Compras',
    perdaEstimada: '-82.5 pontos acumulados',
    status: 'em_investigacao',
    dataAbertura: '24/08/2026',
  },
];

export default function DiagnosticoPage() {
  const [investigacoes, setInvestigacoes] = useState<Investigacao[]>(INVESTIGACOES_INICIAIS);
  const [investigacaoAtiva, setInvestigacaoAtiva] = useState<string>('INV-2026-001');
  const [abaAtiva, setAbaAtiva] = useState<'ishikawa' | '5porques'>('ishikawa');

  // Estado interativo do Ishikawa (6Ms)
  const [ishikawaData, setIshikawaData] = useState({
    metodo: ['Encerramento de chamados não exige validação de retorno do Desenvolvimento', 'Procedimento de teste em ambiente homologado não está formalizado no manual'],
    maoDeObra: ['Novos analistas desconhecem a exigência de nota técnica no SPA', 'Sobrecarga de chamados em dias de pico'],
    maquina: ['Sistema de atendimento não bloqueia encerramento com campo em branco', 'Lentidão esporádica na ferramenta de chamados'],
    material: ['Base de conhecimento interna desatualizada sobre rotinas fiscais'],
    medicao: ['Auditoria realizada apenas no fechamento do ciclo, sem amostragem intermediária'],
    meioAmbiente: ['Ruído operacional durante horários de pico de plantão'],
  });

  // Estado dos 5 Porquês
  const [porques, setPorques] = useState([
    { nivel: 1, pergunta: 'Por que o atendimento foi concluído sem documentação técnica?', resposta: 'Porque o analista apenas alterou o status para "Resolvido" sem preencher o resumo técnico.' },
    { nivel: 2, pergunta: 'Por que ele não preencheu o resumo técnico?', resposta: 'Porque acreditava que a resposta fornecida no chat do cliente era suficiente para rastreabilidade.' },
    { nivel: 3, pergunta: 'Por que acreditava que a resposta do chat era suficiente?', resposta: 'Porque não havia orientação clara de que o histórico técnico deve ser registrado internamente no SUP.' },
    { nivel: 4, pergunta: 'Por que não havia essa orientação clara na ferramenta?', resposta: 'Porque a rotina de encerramento não possui um checklist de campos obrigatórios.' },
    { nivel: 5, pergunta: 'Por que não possui checklist obrigatório?', resposta: 'CAUSA RAIZ: A parametrização do fluxo de encerramento da ferramenta de tickets não impõe validação prévia de documentação.' },
  ]);

  return (
    <EnterpriseLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Banner de Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-md">
              <GitBranch size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-mono uppercase tracking-wider">Módulo de Diagnóstico</div>
              <h1 className="text-sm font-semibold text-white">Central de Investigação Causal & Estúdio Ishikawa</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href="/melhoria/planos"
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md transition-colors"
            >
              <span>Ir para Planos 5W2H</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Seletor de Investigação Ativa */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {investigacoes.map((inv) => {
            const isSelected = inv.id === investigacaoAtiva;
            return (
              <div 
                key={inv.id}
                onClick={() => setInvestigacaoAtiva(inv.id)}
                className={`p-4 rounded-md border cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-slate-900 border-blue-500/60 shadow-sm' 
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-mono font-bold text-blue-400">{inv.id}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase ${
                    inv.status === 'causa_validada' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {inv.status === 'causa_validada' ? 'Causa Validada' : 'Em Investigação'}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white leading-snug">{inv.titulo}</h3>
                <div className="text-xs text-slate-400 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Equipe: <strong className="text-slate-300">{inv.equipeAfetada}</strong></span>
                  <span>Impacto: <strong className="text-rose-400">{inv.perdaEstimada}</strong></span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Estúdio de Investigação: Ishikawa 6Ms ou 5 Porquês */}
        <div className="bg-slate-900 border border-slate-800 rounded-md overflow-hidden">
          
          {/* Barra de Abas */}
          <div className="flex border-b border-slate-800 bg-slate-950/60 px-4">
            <button
              onClick={() => setAbaAtiva('ishikawa')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                abaAtiva === 'ishikawa' 
                  ? 'border-blue-500 text-blue-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              Diagrama de Causa e Efeito (Ishikawa — 6Ms)
            </button>
            <button
              onClick={() => setAbaAtiva('5porques')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                abaAtiva === '5porques' 
                  ? 'border-blue-500 text-blue-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              Árvore dos 5 Porquês (Aprofundamento Causal)
            </button>
          </div>

          <div className="p-6">
            
            {/* Aba Ishikawa 6Ms */}
            {abaAtiva === 'ishikawa' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    Mapeamento de hipóteses de causa estruturadas pelos 6 fatores fundamentais de processo.
                  </div>
                  <button 
                    onClick={() => alert('Para adicionar nova hipótese, selecione a categoria desejada.')}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium"
                  >
                    <Plus size={14} /> Adicionar Hipótese
                  </button>
                </div>

                {/* Grade dos 6Ms */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Método */}
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-md">
                    <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-blue-500 rounded-sm" /> Método
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {ishikawaData.metodo.map((m, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-slate-600 mt-0.5">•</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Mão de Obra */}
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-md">
                    <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-amber-500 rounded-sm" /> Mão de Obra
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {ishikawaData.maoDeObra.map((m, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-slate-600 mt-0.5">•</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Máquina / Sistema */}
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-md">
                    <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-purple-500 rounded-sm" /> Máquina / Sistema
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {ishikawaData.maquina.map((m, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-slate-600 mt-0.5">•</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Material */}
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-md">
                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-500 rounded-sm" /> Material
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {ishikawaData.material.map((m, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-slate-600 mt-0.5">•</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Medição */}
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-md">
                    <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-rose-500 rounded-sm" /> Medição
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {ishikawaData.medicao.map((m, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-slate-600 mt-0.5">•</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Meio Ambiente */}
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-md">
                    <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-cyan-500 rounded-sm" /> Meio Ambiente
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {ishikawaData.meioAmbiente.map((m, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-slate-600 mt-0.5">•</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>
              </div>
            )}

            {/* Aba 5 Porquês */}
            {abaAtiva === '5porques' && (
              <div className="space-y-4">
                <div className="text-xs text-slate-400 mb-2">
                  Encadeamento lógico de causa e efeito partindo do sintoma observado até a causa raiz validada.
                </div>

                <div className="space-y-3">
                  {porques.map((p, idx) => {
                    const isRaiz = idx === porques.length - 1;
                    return (
                      <div 
                        key={p.nivel}
                        className={`p-4 rounded-md border text-xs ${
                          isRaiz 
                            ? 'bg-emerald-950/30 border-emerald-500/40' 
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <div className="font-semibold text-slate-400 mb-1 flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                            isRaiz ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {p.nivel}
                          </span>
                          <span>{p.pergunta}</span>
                        </div>
                        <div className={`mt-1 pl-7 ${isRaiz ? 'font-bold text-emerald-300 text-sm' : 'text-slate-200'}`}>
                          {p.resposta}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Ação Construtiva */}
                <div className="pt-4 flex items-center justify-between border-t border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle2 size={16} />
                    <span>Causa fundamental validada empiricamente pela equipe de qualidade.</span>
                  </div>
                  <Link 
                    href="/melhoria/planos?origem=INV-2026-001"
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md transition-colors"
                  >
                    <span>Transformar em Plano de Ação 5W2H</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </EnterpriseLayout>
  );
}
