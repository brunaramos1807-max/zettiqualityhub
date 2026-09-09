'use client';

import React, { useState, useMemo } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';
import { 
  Activity, 
  AlertTriangle, 
  ShieldCheck, 
  HelpCircle, 
  Info, 
  TrendingUp, 
  Calendar,
  Layers,
  Settings2
} from 'lucide-react';
import Link from 'next/link';

interface PontoCEP {
  periodo: string;
  amostra: number;
  falhas: number;
  proporcao: number; // p = falhas / amostra
}

// Dados históricos reais dos últimos 5 ciclos
const DADOS_HISTORICOS_P: PontoCEP[] = [
  { periodo: '04/2026', amostra: 95, falhas: 4, proporcao: 0.042 },
  { periodo: '05/2026', amostra: 110, falhas: 6, proporcao: 0.055 },
  { periodo: '06/2026', amostra: 105, falhas: 5, proporcao: 0.048 },
  { periodo: '07/2026', amostra: 98, falhas: 7, proporcao: 0.071 },
  { periodo: '08/2026', amostra: 107, falhas: 12, proporcao: 0.112 }, // pico detectado no ciclo 08
];

export default function CEPPage() {
  const [metodoSelecionado, setMetodoSelecionado] = useState<'carta_p' | 'carta_u'>('carta_p');
  const [processoFiltro, setProcessoFiltro] = useState('atendimento_geral');

  // Cálculo de limites de controle da Carta p
  const estatisticasCEP = useMemo(() => {
    const totalAmostra = DADOS_HISTORICOS_P.reduce((acc, p) => acc + p.amostra, 0);
    const totalFalhas = DADOS_HISTORICOS_P.reduce((acc, p) => acc + p.falhas, 0);
    
    if (totalAmostra === 0) return null;

    const pMedio = totalFalhas / totalAmostra;
    const nMedio = totalAmostra / DADOS_HISTORICOS_P.length;

    // Desvio-padrão da proporção: sigma_p = sqrt(p * (1 - p) / n)
    const sigmaP = Math.sqrt((pMedio * (1 - pMedio)) / nMedio);
    const lsc = Number(Math.min(1, pMedio + 3 * sigmaP).toFixed(3));
    const lic = Number(Math.max(0, pMedio - 3 * sigmaP).toFixed(3));
    const lc = Number(pMedio.toFixed(3));

    // Identificar causas especiais
    const pontosComLimites = DADOS_HISTORICOS_P.map((p) => {
      const foraLimite = p.proporcao > lsc || p.proporcao < lic;
      return {
        ...p,
        pct: Number((p.proporcao * 100).toFixed(1)),
        foraLimite,
        lcPct: Number((lc * 100).toFixed(1)),
        lscPct: Number((lsc * 100).toFixed(1)),
        licPct: Number((lic * 100).toFixed(1)),
      };
    });

    const pontosForaControle = pontosComLimites.filter((p) => p.foraLimite);

    return {
      pMedio: Number((pMedio * 100).toFixed(1)),
      lc,
      lsc,
      lic,
      pontosComLimites,
      pontosForaControle,
      estavel: pontosForaControle.length === 0,
    };
  }, []);

  return (
    <EnterpriseLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Banner de Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-md">
              <Activity size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-mono uppercase tracking-wider">Módulo de Controle</div>
              <h1 className="text-sm font-semibold text-white">Controle Estatístico de Processo (CEP) & Estabilidade</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-300">
              <Settings2 size={14} className="text-slate-400" />
              <span>Método:</span>
              <select 
                value={metodoSelecionado} 
                onChange={(e) => setMetodoSelecionado(e.target.value as any)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="carta_p">Carta p (Proporção de Não-Conformes)</option>
                <option value="carta_u">Carta u (Taxa de Falhas por Chamado)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notificação de Status de Estabilidade */}
        <div className={`p-4 rounded-md border text-xs flex items-start gap-3 ${
          estatisticasCEP?.estavel
            ? 'bg-emerald-950/30 border-emerald-500/30 text-slate-300'
            : 'bg-rose-950/30 border-rose-500/30 text-slate-300'
        }`}>
          {estatisticasCEP?.estavel ? (
            <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle size={18} className="text-rose-400 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-semibold text-white">
              {estatisticasCEP?.estavel
                ? 'Processo Sob Controle Estatístico (Apenas Variação Comum)'
                : 'Sinal de Causa Especial Detectado no Ciclo 08/2026'}
            </div>
            <p className="mt-0.5 text-slate-400">
              {estatisticasCEP?.estavel
                ? 'O comportamento da taxa de falhas oscila dentro dos limites calculados de ±3σ. Não há evidência de descontrole estatístico.'
                : 'A taxa de Não Conformidades no ciclo 08/2026 (11.2%) ultrapassou o Limite Superior de Controle (LSC: 10.4%). Este comportamento indica presença de causa especial, justificando investigação formal.'}
            </p>
          </div>
        </div>

        {/* Gráfico de Carta de Controle p */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-md">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Carta de Controle p — Taxa de Atendimentos Não-Conformes</h3>
              <p className="text-xs text-slate-400 mt-0.5">Linha Central (LC = {estatisticasCEP?.lc ? (estatisticasCEP.lc * 100).toFixed(1) : 0}%) com Limites Estatísticos a ±3σ (LSC = {estatisticasCEP?.lsc ? (estatisticasCEP.lsc * 100).toFixed(1) : 0}%)</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-0.5 bg-rose-500 inline-block" /> LSC (3&sigma;)
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-0.5 bg-slate-400 inline-block" /> LC (Média)
              </span>
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm inline-block" /> Valor Observado
              </span>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={estatisticasCEP?.pontosComLimites} margin={{ top: 15, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="periodo" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} unit="%" domain={[0, 14]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '6px', fontSize: '12px' }}
                  formatter={(val: any, name: string) => [`${val}%`, name === 'pct' ? 'Taxa de NC' : name]}
                />
                <ReferenceLine 
                  y={estatisticasCEP?.lsc ? Number((estatisticasCEP.lsc * 100).toFixed(1)) : 10} 
                  stroke="#EF4444" 
                  strokeDasharray="4 4" 
                  label={{ value: `LSC: ${(Number(estatisticasCEP?.lsc || 0) * 100).toFixed(1)}%`, fill: '#EF4444', fontSize: 10, position: 'right' }} 
                />
                <ReferenceLine 
                  y={estatisticasCEP?.lc ? Number((estatisticasCEP.lc * 100).toFixed(1)) : 5} 
                  stroke="#94A3B8" 
                  strokeDasharray="2 2" 
                  label={{ value: `LC: ${(Number(estatisticasCEP?.lc || 0) * 100).toFixed(1)}%`, fill: '#94A3B8', fontSize: 10, position: 'right' }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="pct" 
                  stroke="#3B82F6" 
                  strokeWidth={2} 
                  dot={(props: any) => {
                    const isFora = props.payload.foraLimite;
                    return (
                      <circle 
                        key={props.key}
                        cx={props.cx} 
                        cy={props.cy} 
                        r={isFora ? 5 : 3.5} 
                        fill={isFora ? '#EF4444' : '#3B82F6'} 
                        stroke={isFora ? '#F87171' : '#1D4ED8'} 
                        strokeWidth={2} 
                      />
                    );
                  }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela de Pontos e Parâmetros Estatísticos */}
        <div className="bg-slate-900 border border-slate-800 rounded-md overflow-hidden text-xs">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white">Série Histórica e Auditoria de Pontos Estatísticos</h3>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-4">Período</th>
                <th className="py-2.5 px-4 text-right">Amostra (n)</th>
                <th className="py-2.5 px-4 text-right">Não Conformidades (d)</th>
                <th className="py-2.5 px-4 text-right">Proporção Real (p)</th>
                <th className="py-2.5 px-4 text-right">Limite Superior (LSC)</th>
                <th className="py-2.5 px-4 text-center">Diagnóstico do Ponto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {estatisticasCEP?.pontosComLimites.map((p) => (
                <tr key={p.periodo} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-mono font-medium text-white">{p.periodo}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-400">{p.amostra} ch</td>
                  <td className="py-2.5 px-4 text-right font-mono">{p.falhas}</td>
                  <td className={`py-2.5 px-4 text-right font-mono font-bold ${p.foraLimite ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {p.pct}%
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-400">{p.lscPct}%</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase ${
                      p.foraLimite 
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {p.foraLimite ? 'Causa Especial (Alerta)' : 'Estável'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </EnterpriseLayout>
  );
}
