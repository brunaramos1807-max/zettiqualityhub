'use client';

import React, { useState, useEffect, useMemo } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Activity, AlertTriangle, ShieldCheck, RefreshCw, Filter,  } from 'lucide-react';

import { fetchDadosCartaP } from '@/lib/services/qualityDataService';
import { PontoCartaControleP } from '@/lib/domain/types';

export default function CEPPage() {
  const [equipeSelecionada, setEquipeSelecionada] = useState<string>('all');
  const [pontos, setPontos] = useState<PontoCartaControleP[]>([]);
  const [pBarGlobal, setPBarGlobal] = useState<number>(0);
  const [totalAmostras, setTotalAmostras] = useState<number>(0);
  const [processoEstavel, setProcessoEstavel] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  const carregarCEP = async () => {
    setLoading(true);
    try {
      const res = await fetchDadosCartaP(equipeSelecionada);
      setPontos(res.pontos);
      setPBarGlobal(res.pBarGlobal);
      setTotalAmostras(res.totalAmostras);
      setProcessoEstavel(res.processoEstavel);
    } catch (err) {
      console.error('Erro ao carregar dados de CEP:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarCEP();
  }, [equipeSelecionada]);

  // Transformar pontos para plotagem (percentual para leitura humana)
  const dadosGrafico = useMemo(() => {
    return pontos.map((p) => ({
      ciclo: p.ciclo,
      periodo: p.periodo,
      amostra: p.tamanho_amostra_n,
      falhas: p.defeitos_conformidades,
      pPct: Number((p.proporcao_p * 100).toFixed(2)),
      clPct: Number((p.linha_central_cl * 100).toFixed(2)),
      uclPct: Number((p.limite_superior_ucl * 100).toFixed(2)),
      lclPct: Number((p.limite_inferior_lcl * 100).toFixed(2)),
      metaPct: p.meta_especificacao ? Number((p.meta_especificacao * 100).toFixed(2)) : 2.0,
      causaEspecial: p.causa_especial,
    }));
  }, [pontos]);

  const pontosInstaveis = dadosGrafico.filter((p) => p.causaEspecial);

  return (
    <EnterpriseLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Banner de Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-md shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 border border-blue-100 text-blue-700 rounded-md">
              <Activity size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-mono uppercase tracking-wider">
                Módulo de Controle
              </div>
              <h1 className="text-sm font-bold text-slate-900">
                Controle Estatístico de Processo (CEP — Carta p)
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700">
              <Filter size={14} className="text-slate-500" />
              <span className="font-semibold">Equipe:</span>
              <select
                value={equipeSelecionada}
                onChange={(e) => setEquipeSelecionada(e.target.value)}
                className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">Todas as Equipes</option>
                <option value="PDV">PDV</option>
                <option value="PDV N1">PDV N1</option>
                <option value="Compras e Estoque">Compras e Estoque</option>
                <option value="Financeiro Fiscal">Financeiro Fiscal</option>
              </select>
            </div>

            <button
              onClick={carregarCEP}
              className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
              title="Recarregar dados estatísticos do banco"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Resumo Estatístico do Processo */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-md shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Linha Central (p̄ Médio)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-blue-700">
                {(pBarGlobal * 100).toFixed(2)}%
              </span>
              <span className="text-xs text-slate-500">não-conformes</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Linha central do processo (p̄)</p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-md shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Estabilidade do Processo
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={`text-lg font-bold ${processoEstavel ? 'text-emerald-700' : 'text-red-600'}`}
              >
                {processoEstavel ? 'SOB CONTROLE' : 'FORA DE CONTROLE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {pontosInstaveis.length === 0
                ? 'Nenhuma causa especial detectada'
                : `${pontosInstaveis.length} ciclo(s) além de ±3σ`}
            </p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-md shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Meta de Especificação
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-800">&le; 2.00%</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Requisito de qualidade do cliente</p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-md shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Volume Amostral Total
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-800">{totalAmostras}</span>
              <span className="text-xs text-slate-500">atendimentos</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Base de cálculo dos limites ±3σ</p>
          </div>
        </div>

        {/* Carta p (Proporção de Não-Conformes com Limites de Controle ±3-sigma) */}
        <div className="p-5 bg-white border border-slate-200 rounded-md shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Carta p — Proporção de Unidades Defeituosas por Ciclo
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Os Limites de Controle (LSC e LIC em cinza) são calculados matematicamente a partir
                da variação natural (±3σ). A Linha Verde é a Meta de Especificação.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="h-72 flex items-center justify-center text-xs text-slate-400">
              Calculando parâmetros estatísticos no banco...
            </div>
          ) : dadosGrafico.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-xs text-slate-400">
              Dados insuficientes para cálculo de CEP no filtro selecionado.
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={dadosGrafico}
                  margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="ciclo" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    unit="%"
                    label={{
                      value: 'Proporção Defeituosa (%)',
                      angle: -90,
                      position: 'insideLeft',
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
                            <div className="font-bold text-blue-400">{data.ciclo}</div>
                            <div>
                              Amostra auditada (n):{' '}
                              <span className="font-mono">{data.amostra}</span>
                            </div>
                            <div>
                              Falhas/NCs (d):{' '}
                              <span className="font-mono text-red-400">{data.falhas}</span>
                            </div>
                            <div>
                              Proporção (p):{' '}
                              <span className="font-mono font-bold text-blue-300">
                                {data.pPct}%
                              </span>
                            </div>
                            <div className="border-t border-slate-700 pt-1 mt-1 text-[11px] text-slate-400">
                              <div>LSC (+3σ): {data.uclPct}%</div>
                              <div>Linha Central (p̄): {data.clPct}%</div>
                              <div>LIC (-3σ): {data.lclPct}%</div>
                              <div>Meta Especificação: {data.metaPct}%</div>
                            </div>
                            {data.causaEspecial && (
                              <div className="text-red-400 font-bold text-[10px] mt-1">
                                ⚠ PONTO FORA DE CONTROLE ESTATÍSTICO
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {/* Linha de Especificação (Meta desejada) */}
                  <ReferenceLine
                    y={2.0}
                    stroke="#10B981"
                    strokeDasharray="4 4"
                    label={{
                      value: 'Meta <= 2.0%',
                      fill: '#10B981',
                      fontSize: 10,
                      position: 'right',
                    }}
                  />

                  {/* Linha Central (p̄) */}
                  {dadosGrafico[0] && (
                    <ReferenceLine
                      y={dadosGrafico[0].clPct}
                      stroke="#1E3A8A"
                      strokeWidth={1.5}
                      label={{
                        value: `LC: ${dadosGrafico[0].clPct}%`,
                        fill: '#1E3A8A',
                        fontSize: 10,
                        position: 'left',
                      }}
                    />
                  )}

                  {/* Limite Superior de Controle (LSC) */}
                  {dadosGrafico[0] && (
                    <ReferenceLine
                      y={dadosGrafico[0].uclPct}
                      stroke="#DC2626"
                      strokeDasharray="3 3"
                      label={{
                        value: `LSC: ${dadosGrafico[0].uclPct}%`,
                        fill: '#DC2626',
                        fontSize: 10,
                        position: 'right',
                      }}
                    />
                  )}

                  {/* Limite Inferior de Controle (LIC) */}
                  {dadosGrafico[0] && (
                    <ReferenceLine
                      y={dadosGrafico[0].lclPct}
                      stroke="#64748B"
                      strokeDasharray="3 3"
                      label={{
                        value: `LIC: ${dadosGrafico[0].lclPct}%`,
                        fill: '#64748B',
                        fontSize: 10,
                        position: 'right',
                      }}
                    />
                  )}

                  {/* Linha Real do Processo */}
                  <Line
                    type="monotone"
                    dataKey="pPct"
                    name="Proporção Observada"
                    stroke="#1D4ED8"
                    strokeWidth={2.5}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      const isAlert = payload.causaEspecial;
                      return (
                        <circle
                          key={`dot-${cx}-${cy}`}
                          cx={cx}
                          cy={cy}
                          r={isAlert ? 6 : 4}
                          fill={isAlert ? '#DC2626' : '#1D4ED8'}
                          stroke="#FFFFFF"
                          strokeWidth={2}
                        />
                      );
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Tabela de Amostras e Regras de Decisão */}
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Registros Amostrais e Verificação de Causas Especiais
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Ciclo</th>
                  <th className="px-4 py-3 text-right">Tamanho da Amostra (n)</th>
                  <th className="px-4 py-3 text-right">Falhas (d)</th>
                  <th className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                    Proporção Observada (p)
                  </th>
                  <th className="px-4 py-3 text-right font-mono text-slate-500">LSC (+3σ)</th>
                  <th className="px-4 py-3 text-right font-mono text-slate-500">LIC (-3σ)</th>
                  <th className="px-4 py-3 text-center">Diagnóstico Estatístico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dadosGrafico.map((p) => (
                  <tr key={p.ciclo} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{p.ciclo}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{p.amostra}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-600 font-bold">
                      {p.falhas}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                      {p.pPct}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">{p.uclPct}%</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">{p.lclPct}%</td>
                    <td className="px-4 py-3 text-center">
                      {p.causaEspecial ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-50 text-red-700 border border-red-200 inline-flex items-center gap-1">
                          <AlertTriangle size={11} /> Causa Especial Detectada
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                          <ShieldCheck size={11} /> Variação Comum (Estável)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </EnterpriseLayout>
  );
}
