'use client';
import React, { useState, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { fetchCycleScores, fetchAllPeriodos, buildAnalystsFromScores } from '@/lib/services/dataService';
import { BarChart2, TrendingUp, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CalibrationEntry {
  analista: string;
  squad: string;
  periodo: string;
  qa: number;
  iepc: number;
  calibratedQa?: number;
  calibratedIepc?: number;
  justificativa?: string;
}

function CalibragemContent() {
  const [entries, setEntries] = useState<CalibrationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriodo, setSelectedPeriodo] = useState('');
  const [periodos, setPeriodos] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [scores, pList] = await Promise.all([fetchCycleScores(), fetchAllPeriodos()]);
      setPeriodos(pList);
      const latest = pList[pList.length - 1] || '';
      setSelectedPeriodo(latest);
      const pScores = scores.filter((s: any) => s.periodo === latest);
      const analysts = buildAnalystsFromScores(pScores);
      setEntries(analysts.map((a: any) => ({
        analista: a.nome || a.analista || '',
        squad: a.squad || '',
        periodo: latest,
        qa: a.qaScore || 0,
        iepc: a.iepcScore || 0,
      })));
      setLoading(false);
    };
    load();
  }, []);

  const handlePeriodoChange = async (periodo: string) => {
    setSelectedPeriodo(periodo);
    setLoading(true);
    const scores = await fetchCycleScores();
    const pScores = scores.filter((s: any) => s.periodo === periodo);
    const analysts = buildAnalystsFromScores(pScores);
    setEntries(analysts.map((a: any) => ({
      analista: a.nome || a.analista || '',
      squad: a.squad || '',
      periodo,
      qa: a.qaScore || 0,
      iepc: a.iepcScore || 0,
    })));
    setLoading(false);
  };

  const chartData = entries.slice(0, 15).map((e) => ({
    name: e.analista.split(' ')[0],
    qa: parseFloat(e.qa.toFixed(1)),
    iepc: parseFloat(e.iepc.toFixed(1)),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl p-3 text-xs shadow-xl" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="font-semibold text-white mb-2">{label}</p>
        {payload.map((p: any) => <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}%</p>)}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Calibragem</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Análise comparativa e calibração de indicadores</p>
        </div>
        <select
          value={selectedPeriodo}
          onChange={(e) => handlePeriodoChange(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm text-white outline-none"
          style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {periodos.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Analistas no Ciclo', value: entries.length, color: '#38BDF8', icon: <Users size={16} /> },
          { label: 'QA Médio', value: entries.length > 0 ? `${(entries.reduce((s, e) => s + e.qa, 0) / entries.length).toFixed(1)}%` : '—', color: '#22C55E', icon: <BarChart2 size={16} /> },
          { label: 'IEPC Médio', value: entries.length > 0 ? `${(entries.reduce((s, e) => s + e.iepc, 0) / entries.length).toFixed(1)}%` : '—', color: '#06B6D4', icon: <TrendingUp size={16} /> },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>{s.label}</span>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {!loading && chartData.length > 0 && (
        <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-semibold text-white mb-4">Distribuição QA & IEPC — {selectedPeriodo}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="qa" name="QA" fill="#38BDF8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="iepc" name="IEPC" fill="#06B6D4" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Analista', 'Squad', 'QA', 'IEPC', 'Status QA'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#94A3B8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} className="hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td className="px-4 py-3 font-medium text-white">{e.analista}</td>
                  <td className="px-4 py-3" style={{ color: '#94A3B8' }}>{e.squad}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: e.qa >= 85 ? '#22C55E' : e.qa >= 70 ? '#F59E0B' : '#EF4444' }}>{e.qa.toFixed(1)}%</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: e.iepc >= 85 ? '#22C55E' : e.iepc >= 70 ? '#F59E0B' : '#EF4444' }}>{e.iepc.toFixed(1)}%</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: e.qa >= 85 ? 'rgba(34,197,94,0.1)' : e.qa >= 70 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', color: e.qa >= 85 ? '#22C55E' : e.qa >= 70 ? '#F59E0B' : '#EF4444' }}>
                      {e.qa >= 85 ? 'Acima da Meta' : e.qa >= 70 ? 'Na Meta' : 'Abaixo da Meta'}
                    </span>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-xs" style={{ color: '#94A3B8' }}>Nenhum dado para o ciclo selecionado</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function CalibragemPage() {
  return (
    <EnterpriseLayout>
      <CalibragemContent />
    </EnterpriseLayout>
  );
}
