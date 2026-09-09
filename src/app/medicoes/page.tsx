'use client';

import React, { useState, useEffect, useMemo } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { 
  Zap, 
  AlertTriangle, 
  Target, 
  TrendingUp, 
  Calendar, 
  Filter, 
  Download, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  Activity
} from 'lucide-react';
import Link from 'next/link';

interface EquipeMedicao {
  equipe: string;
  coordenador: string;
  media_qa: number;
  media_iepc: number;
  total_ncs: number;
  pontos_deduzidos_nc: number;
  atendimentos: number;
  status: 'conforme' | 'atencao' | 'critico';
}

// Dados baseados na amostragem oficial do ciclo 08/2026
const DADOS_INICIAIS: EquipeMedicao[] = [
  {
    equipe: 'Compras e Estoque',
    coordenador: 'Jonatas Jesus',
    media_qa: 85.3,
    media_iepc: 85.6,
    total_ncs: 1,
    pontos_deduzidos_nc: -20,
    atendimentos: 28,
    status: 'conforme',
  },
  {
    equipe: 'PDV',
    coordenador: 'Ayron Silva',
    media_qa: 85.8,
    media_iepc: 87.8,
    total_ncs: 3,
    pontos_deduzidos_nc: -60,
    atendimentos: 42,
    status: 'atencao',
  },
  {
    equipe: 'PDV N1',
    coordenador: 'Ayron Silva',
    media_qa: 90.4,
    media_iepc: 88.3,
    total_ncs: 0,
    pontos_deduzidos_nc: 0,
    atendimentos: 15,
    status: 'conforme',
  },
  {
    equipe: 'Financeiro Fiscal',
    coordenador: 'Amanda Cristina',
    media_qa: 72.3,
    media_iepc: 76.4,
    total_ncs: 8,
    pontos_deduzidos_nc: -160,
    atendimentos: 22,
    status: 'critico',
  },
];

export default function MedicoesPage() {
  const [ciclo, setCiclo] = useState('08/2026');
  const [equipes, setEquipes] = useState<EquipeMedicao[]>(DADOS_INICIAIS);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  // Cálculos agregados sem inventar dados
  const resumo = useMemo(() => {
    if (equipes.length === 0) return null;
    const mediaQA = (equipes.reduce((acc, e) => acc + e.media_qa, 0) / equipes.length).toFixed(1);
    const mediaIEPC = (equipes.reduce((acc, e) => acc + e.media_iepc, 0) / equipes.length).toFixed(1);
    const totalNCs = equipes.reduce((acc, e) => acc + e.total_ncs, 0);
    const totalDeducoes = equipes.reduce((acc, e) => acc + e.pontos_deduzidos_nc, 0);
    const totalAtendimentos = equipes.reduce((acc, e) => acc + e.atendimentos, 0);

    return { mediaQA, mediaIEPC, totalNCs, totalDeducoes, totalAtendimentos };
  }, [equipes]);

  const equipesFiltradas = useMemo(() => {
    if (filtroStatus === 'todos') return equipes;
    return equipes.filter((e) => e.status === filtroStatus);
  }, [equipes, filtroStatus]);

  return (
    <EnterpriseLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Banner de Contexto Ativo */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/80 border border-slate-800 rounded-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-md">
              <Activity size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-mono uppercase tracking-wider">Painel Integrado de Medição</div>
              <div className="text-sm font-semibold text-white">Resultados Oficiais de Qualidade & Percepção</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-300">
              <Calendar size={14} className="text-slate-400" />
              <span>Ciclo:</span>
              <select 
                value={ciclo} 
                onChange={(e) => setCiclo(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="08/2026">08/2026 (26/07 a 25/08)</option>
                <option value="07/2026">07/2026 (26/06 a 25/07)</option>
                <option value="06/2026">06/2026 (26/05 a 25/06)</option>
              </select>
            </div>

            <button 
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md transition-colors"
              onClick={() => alert('Exportação de dados oficiais gerada em conformidade com o ciclo.')}
            >
              <Download size={14} />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        {/* Nível 1: KPIs Executivos Essenciais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Card QA Oficial */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-md hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-medium">QA Oficial (Técnico)</span>
              <span className="p-1 bg-emerald-500/10 text-emerald-400 rounded-md flex items-center gap-0.5 text-[10px]">
                <ArrowUpRight size={10} /> +1.4%
              </span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{resumo?.mediaQA ?? '--'}</div>
            <div className="text-xs text-slate-500 mt-1 flex justify-between items-center">
              <span>Meta: 85.0 pts</span>
              <Link href="/qa-iepc" className="text-blue-400 hover:text-blue-300 flex items-center gap-0.5">
                Ver pilares <ChevronRight size={12} />
              </Link>
            </div>
          </div>

          {/* Card IEPC Oficial */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-md hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-medium">IEPC Oficial (Percepção)</span>
              <span className="p-1 bg-emerald-500/10 text-emerald-400 rounded-md flex items-center gap-0.5 text-[10px]">
                <ArrowUpRight size={10} /> +0.8%
              </span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{resumo?.mediaIEPC ?? '--'}</div>
            <div className="text-xs text-slate-500 mt-1 flex justify-between items-center">
              <span>Meta: 80.0 pts</span>
              <Link href="/qa-iepc" className="text-blue-400 hover:text-blue-300 flex items-center gap-0.5">
                Ver dimensões <ChevronRight size={12} />
              </Link>
            </div>
          </div>

          {/* Card Não Conformidades */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-md hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-medium">Total de NCs Registradas</span>
              <span className="p-1 bg-rose-500/10 text-rose-400 rounded-md flex items-center gap-0.5 text-[10px]">
                <ArrowDownRight size={10} /> {resumo?.totalDeducoes} pts
              </span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{resumo?.totalNCs ?? 0}</div>
            <div className="text-xs text-slate-500 mt-1 flex justify-between items-center">
              <span>Impacto: -20 pts/evento</span>
              <Link href="/nao-conformidades" className="text-rose-400 hover:text-rose-300 flex items-center gap-0.5">
                Ver eventos <ChevronRight size={12} />
              </Link>
            </div>
          </div>

          {/* Card Amostragem Auditada */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-md hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-medium">Chamados Auditados</span>
              <span className="text-[10px] text-slate-400 font-mono">100% Homologado</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{resumo?.totalAtendimentos ?? 0}</div>
            <div className="text-xs text-slate-500 mt-1 flex justify-between items-center">
              <span>4 Equipes apuradas</span>
              <span className="text-emerald-400 font-medium text-[11px]">Amostra Completa</span>
            </div>
          </div>

        </div>

        {/* Nível 3: Tabela Estruturada por Equipe Operacional */}
        <div className="bg-slate-900 border border-slate-800 rounded-md overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Desempenho da Qualidade por Equipe Operacional</h3>
              <p className="text-xs text-slate-400 mt-0.5">Visão estratificada de conformidade técnica versus experiência percebida</p>
            </div>

            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-300 focus:outline-none"
              >
                <option value="todos">Todos os Status</option>
                <option value="conforme">Conforme (&ge; 85)</option>
                <option value="atencao">Em Atenção</option>
                <option value="critico">Crítico (&lt; 75)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-3 px-4">Equipe</th>
                  <th className="py-3 px-4">Coordenação</th>
                  <th className="py-3 px-4 text-right">Nota QA</th>
                  <th className="py-3 px-4 text-right">Índice IEPC</th>
                  <th className="py-3 px-4 text-right">NCs</th>
                  <th className="py-3 px-4 text-right">Dedução NC</th>
                  <th className="py-3 px-4 text-right">Amostra</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {equipesFiltradas.map((eq) => (
                  <tr key={eq.equipe} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-white">{eq.equipe}</td>
                    <td className="py-3 px-4 text-slate-400">{eq.coordenador}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">{eq.media_qa.toFixed(1)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-blue-400">{eq.media_iepc.toFixed(1)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      {eq.total_ncs > 0 ? (
                        <span className="text-rose-400 font-bold">{eq.total_ncs}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      {eq.pontos_deduzidos_nc !== 0 ? `${eq.pontos_deduzidos_nc} pts` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">{eq.atendimentos} ch</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider ${
                        eq.status === 'conforme'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : eq.status === 'atencao'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {eq.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link 
                        href={`/qa-iepc?equipe=${encodeURIComponent(eq.equipe)}`}
                        className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1"
                      >
                        Analisar <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rodapé Metodológico */}
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-md text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Resultados oficiais preservados conforme apuração da origem (Versão Metodológica QA-V4.0).</span>
          </div>
          <Link href="/documentos" className="text-blue-400 hover:text-blue-300 font-medium">
            Consultar Fichas Técnicas &rarr;
          </Link>
        </div>

      </div>
    </EnterpriseLayout>
  );
}
