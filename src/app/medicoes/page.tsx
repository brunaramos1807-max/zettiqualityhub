'use client';

import React, { useState, useEffect, useMemo } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import {
  AlertTriangle,
  Target,
  Calendar,
  Filter,
  Download,
  ChevronRight,
  ShieldCheck,
  Activity,
  CheckCircle2,
  RefreshCw,
  Search,
  Building2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { fetchMedicoesOficiais, fetchCiclos } from '@/lib/services/qualityDataService';
import { Ciclo, MetricasAgregadasEquipe } from '@/lib/domain/types';

export default function MedicoesPage() {
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [cicloSelecionado, setCicloSelecionado] = useState<string>('08/2026');
  const [equipeFiltro, setEquipeFiltro] = useState<string>('all');
  const [statusFiltro, setStatusFiltro] = useState<string>('todos');
  const [busca, setBusca] = useState<string>('');

  const [metricasEquipes, setMetricasEquipes] = useState<MetricasAgregadasEquipe[]>([]);
  const [resumoGeral, setResumoGeral] = useState({
    mediaQA: 0,
    mediaIEPC: 0,
    totalNCs: 0,
    totalPontosNC: 0,
    totalAvaliados: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Carregar lista de ciclos do Supabase
  useEffect(() => {
    fetchCiclos().then((lista) => {
      setCiclos(lista);
      if (lista.length > 0 && !lista.some((c) => c.periodo === cicloSelecionado)) {
        setCicloSelecionado(lista[0].periodo);
      }
    });
  }, []);

  // Carregar medições reais do Supabase
  const carregarMedicoes = async () => {
    setLoading(true);
    try {
      const cicloAtual = ciclos.find((c) => c.periodo === cicloSelecionado);
      const res = await fetchMedicoesOficiais({
        periodo: cicloSelecionado,
        equipe: equipeFiltro,
        dataInicio: cicloAtual?.data_inicio,
        dataFim: cicloAtual?.data_fim,
      });

      setMetricasEquipes(res.metricasEquipes);
      const totalAv = res.metricasEquipes.reduce((s, e) => s + e.total_avaliados, 0);
      setResumoGeral({
        mediaQA: res.mediaGeralQA,
        mediaIEPC: res.mediaGeralIEPC,
        totalNCs: res.totalGeralNCs,
        totalPontosNC: res.totalPontosDeduzidosNC,
        totalAvaliados: totalAv,
      });
    } catch (err) {
      console.error('Erro ao buscar medições:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ciclos.length > 0) {
      carregarMedicoes();
    }
  }, [cicloSelecionado, equipeFiltro, ciclos]);

  // Lista única de equipes para filtro
  const listaEquipes = useMemo(() => {
    const set = new Set<string>();
    metricasEquipes.forEach((e) => set.add(e.equipe_nome));
    return Array.from(set);
  }, [metricasEquipes]);

  // Filtragem de tabela
  const equipesFiltradas = useMemo(() => {
    return metricasEquipes.filter((e) => {
      const matchStatus = statusFiltro === 'todos' || e.status === statusFiltro;
      const matchBusca = busca === '' || e.equipe_nome.toLowerCase().includes(busca.toLowerCase());
      return matchStatus && matchBusca;
    });
  }, [metricasEquipes, statusFiltro, busca]);

  const cicloObj = ciclos.find((c) => c.periodo === cicloSelecionado);

  return (
    <EnterpriseLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Banner de Contexto e Governança do Ciclo */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-md shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 border border-blue-100 text-blue-700 rounded-md">
              <Activity size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Medição Integrada da Qualidade
                </h1>
                {cicloObj?.is_closed ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                    Homologado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                    Em Apuração
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Resultados consolidados por equipe. QA Técnico e IEPC Percepção mantidos formalmente
                separados.
                {cicloObj?.data_inicio && cicloObj?.data_fim && (
                  <span className="ml-2 font-mono text-slate-400">
                    (Vigência: {cicloObj.data_inicio} até {cicloObj.data_fim})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700">
              <Calendar size={14} className="text-slate-500" />
              <span className="font-semibold">Ciclo:</span>
              <select
                value={cicloSelecionado}
                onChange={(e) => setCicloSelecionado(e.target.value)}
                className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
              >
                {ciclos.map((c) => (
                  <option key={c.periodo} value={c.periodo}>
                    {c.identificacao}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={carregarMedicoes}
              className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
              title="Atualizar dados do banco"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Cards de Resumo Geral da Qualidade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                QA Técnico Oficial
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                P1–P5 (0–100)
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-blue-700">
                {resumoGeral.mediaQA > 0 ? `${resumoGeral.mediaQA}%` : '—'}
              </span>
              <span className="text-xs text-slate-500">média oficial</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Conformidade com os padrões operacionais
            </p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                IEPC Percepção Oficial
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded border border-sky-200">
                E1–E5 (0–100)
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-sky-700">
                {resumoGeral.mediaIEPC > 0 ? `${resumoGeral.mediaIEPC}%` : '—'}
              </span>
              <span className="text-xs text-slate-500">experiência</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Resolução, esforço e clareza percebida
            </p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Não Conformidades
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-50 text-red-700 rounded border border-red-200">
                Eventos
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-red-600">
                {resumoGeral.totalNCs}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                (-{resumoGeral.totalPontosNC} pts deduzidos)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Desvios graves registrados no ciclo</p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Amostragem Auditada
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                Avaliados
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-800">
                {resumoGeral.totalAvaliados}
              </span>
              <span className="text-xs text-slate-500">profissionais</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Cobertura nas equipes operacionais</p>
          </div>
        </div>

        {/* Tabela de Medição por Equipe com Pilares Detalhados */}
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-slate-500" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Desempenho por Equipe / Squad
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar equipe..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-7 pr-3 py-1 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-600 w-40 font-medium"
                />
              </div>

              <select
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-md text-slate-700 font-medium focus:outline-none"
              >
                <option value="todos">Todos os Status</option>
                <option value="conforme">Conforme (&gt;= 85%)</option>
                <option value="alerta">Alerta (75%–84%)</option>
                <option value="critico">Crítico (&lt; 75% ou &gt;= 5 NCs)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Equipe / Squad</th>
                  <th className="px-4 py-3 text-right">Avaliados</th>
                  <th className="px-4 py-3 text-right font-mono text-blue-700">QA Técnico</th>
                  <th className="px-4 py-3 text-center">P1..P5 Médias</th>
                  <th className="px-4 py-3 text-right font-mono text-sky-700">IEPC Percepção</th>
                  <th className="px-4 py-3 text-center">E1..E5 Médias</th>
                  <th className="px-4 py-3 text-right text-red-600">NCs</th>
                  <th className="px-4 py-3 text-right text-red-600 font-mono">Dedução NC</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                      Consultando medições do banco de dados...
                    </td>
                  </tr>
                ) : equipesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                      Nenhum registro encontrado para este ciclo e filtros.
                    </td>
                  </tr>
                ) : (
                  equipesFiltradas.map((eq) => (
                    <tr key={eq.equipe_nome} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{eq.equipe_nome}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {eq.total_avaliados}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                        {eq.media_qa.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-center text-[10px] font-mono text-slate-500">
                        P1:{eq.p1} | P2:{eq.p2} | P3:{eq.p3} | P4:{eq.p4} | P5:{eq.p5}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-sky-700">
                        {eq.media_iepc.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-center text-[10px] font-mono text-slate-500">
                        E1:{eq.e1} | E2:{eq.e2} | E3:{eq.e3} | E4:{eq.e4} | E5:{eq.e5}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">
                        {eq.total_ncs}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-red-600 font-semibold">
                        -{eq.pontos_deduzidos_nc} pts
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            eq.status === 'conforme'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : eq.status === 'alerta'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {eq.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/analises/pareto?periodo=${cicloSelecionado}&equipe=${encodeURIComponent(eq.equipe_nome)}`}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-bold"
                        >
                          Ver Desvios <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </EnterpriseLayout>
  );
}
