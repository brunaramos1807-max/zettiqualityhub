'use client';

import React, { useState, useEffect, useMemo } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Filter,
  Download,
  Info,
  Layers,
  RefreshCw,
  GitBranch,
} from 'lucide-react';
import Link from 'next/link';
import { fetchParetoDinamico, fetchCiclos, ItemPareto } from '@/lib/services/qualityDataService';
import { Ciclo } from '@/lib/domain/types';

export default function ParetoPage() {
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [cicloSelecionado, setCicloSelecionado] = useState<string>('08/2026');
  const [itensPareto, setItensPareto] = useState<ItemPareto[]>([]);
  const [totalPerda, setTotalPerda] = useState<number>(0);
  const [fatorPrincipal, setFatorPrincipal] = useState<string>('');
  const [percentualTop3, setPercentualTop3] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Carregar ciclos do Supabase
  useEffect(() => {
    fetchCiclos().then((lista) => {
      setCiclos(lista);
      if (lista.length > 0 && !lista.some((c) => c.periodo === cicloSelecionado)) {
        setCicloSelecionado(lista[0].periodo);
      }
    });
  }, []);

  // Carregar dados reais do Pareto
  const carregarPareto = async () => {
    setLoading(true);
    try {
      const res = await fetchParetoDinamico(cicloSelecionado);
      setItensPareto(res.itens);
      setTotalPerda(res.totalPerdaPontos);
      setFatorPrincipal(res.fatorPrincipalConcentracao);
      setPercentualTop3(res.percentualTop3);
    } catch (err) {
      console.error('Erro ao calcular Pareto:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cicloSelecionado) {
      carregarPareto();
    }
  }, [cicloSelecionado]);

  // Fatores críticos que respondem pela maior parte das perdas
  const fatoresCriticos = useMemo(() => {
    return itensPareto.filter((d) => d.acumulado <= 85);
  }, [itensPareto]);

  const dadosGrafico = useMemo(() => {
    return itensPareto.map((item) => ({
      fator: item.fator.length > 25 ? item.fator.substring(0, 22) + '...' : item.fator,
      fatorCompleto: item.fator,
      perdaPontos: item.perda_pontos,
      pctAcumulado: item.acumulado,
      pctIndividual: item.percentual,
      categoria: item.categoria,
      squad: item.squad_mais_afetado,
    }));
  }, [itensPareto]);

  return (
    <EnterpriseLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Banner de Contexto */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-md shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 border border-blue-100 text-blue-700 rounded-md">
              <BarChart3 size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-mono uppercase tracking-wider">
                Módulo de Análise
              </div>
              <h1 className="text-sm font-bold text-slate-900">
                Curva de Pareto — Concentração Real de Falhas e Perdas
              </h1>
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
              onClick={carregarPareto}
              className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
              title="Recalcular Pareto com dados do banco"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Diagnóstico Executivo de Concentração */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-md shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
              <AlertTriangle size={15} className="text-amber-600" />
              Fator de Maior Perda
            </div>
            <div
              className="mt-2 text-base font-bold text-slate-900 truncate"
              title={fatorPrincipal}
            >
              {loading ? 'Calculando...' : fatorPrincipal}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Origem primária da perda de conformidade no ciclo
            </p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-md shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
              <TrendingUp size={15} className="text-blue-600" />
              Concentração nos Top 3
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-blue-700">
              {loading ? '—' : `${percentualTop3}%`}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Dos pontos perdidos estão concentrados nos 3 maiores desvios
            </p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-md shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
              <Layers size={15} className="text-slate-600" />
              Total de Perdas no Ciclo
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-red-600">
              {loading ? '—' : `-${totalPerda} pts`}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Soma de deduções de NC e gaps em critérios técnicos
            </p>
          </div>
        </div>

        {/* Gráfico Composto de Pareto (Barras de Perda + Linha de Acumulado %) */}
        <div className="p-5 bg-white border border-slate-200 rounded-md shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Diagrama de Pareto — Perda Ponderada (Pontos) vs Acumulado (%)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cálculo dinâmico sobre os registros reais do banco. A linha tracejada vermelha
                representa a referência de corte de 80%.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="h-72 flex items-center justify-center text-xs text-slate-400">
              Processando curva de Pareto com dados do banco...
            </div>
          ) : dadosGrafico.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-xs text-slate-400">
              Nenhuma perda de qualidade registrada para o ciclo selecionado.
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={dadosGrafico}
                  margin={{ top: 20, right: 30, left: 10, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="fator"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    label={{
                      value: 'Perda de Pontos',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#64748B',
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    unit="%"
                    label={{
                      value: '% Acumulado',
                      angle: 90,
                      position: 'insideRight',
                      fill: '#64748B',
                      fontSize: 11,
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-800 p-3 rounded-md shadow-xl text-xs text-white space-y-1">
                            <div className="font-bold text-blue-400">{data.fatorCompleto}</div>
                            <div>
                              Categoria: <span className="font-mono">{data.categoria}</span>
                            </div>
                            {data.squad && (
                              <div>
                                Squad mais afetado:{' '}
                                <span className="text-amber-400 font-semibold">{data.squad}</span>
                              </div>
                            )}
                            <div>
                              Perda Total:{' '}
                              <span className="font-mono font-bold text-red-400">
                                -{data.perdaPontos} pts
                              </span>
                            </div>
                            <div>
                              Impacto Individual:{' '}
                              <span className="font-mono text-slate-300">
                                {data.pctIndividual}%
                              </span>
                            </div>
                            <div>
                              Acumulado Pareto:{' '}
                              <span className="font-mono font-bold text-emerald-400">
                                {data.pctAcumulado}%
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    yAxisId="right"
                    y={80}
                    stroke="#DC2626"
                    strokeDasharray="4 4"
                    label={{ value: 'Corte 80%', fill: '#DC2626', fontSize: 10, position: 'right' }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="perdaPontos"
                    fill="#1D4ED8"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={45}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="pctAcumulado"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10B981' }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Tabela de Fatores Prioritários e Conexão Direta ao Diagnóstico */}
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Priorização para Diagnóstico de Causa Raiz
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Fatores ordenados por severidade. Inicie uma investigação imediata nos desvios
                concentrados.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Ordem</th>
                  <th className="px-4 py-3">Fator de Desvio / Critério</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Squad mais Afetado</th>
                  <th className="px-4 py-3 text-right">Ocorrências</th>
                  <th className="px-4 py-3 text-right text-red-600 font-mono">Perda (pts)</th>
                  <th className="px-4 py-3 text-right font-mono">% Individual</th>
                  <th className="px-4 py-3 text-right font-mono text-emerald-700">% Acumulado</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itensPareto.map((item, idx) => {
                  const ehCritico = item.acumulado <= 80 || idx === 0;
                  return (
                    <tr key={item.fator} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-400">#{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          {item.fator}
                          {ehCritico && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-red-50 text-red-700 border border-red-200 rounded">
                              Zona 80%
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {item.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {item.squad_mais_afetado || 'Geral'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {item.ocorrencias}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-red-600">
                        -{item.perda_pontos}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {item.percentual}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                        {item.acumulado}%
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/diagnostico?fator=${encodeURIComponent(item.fator)}&periodo=${cicloSelecionado}&squad=${encodeURIComponent(item.squad_mais_afetado || '')}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded text-[11px] font-bold transition-colors"
                        >
                          <GitBranch size={12} /> Investigar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </EnterpriseLayout>
  );
}
