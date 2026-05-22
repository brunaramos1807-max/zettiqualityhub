'use client';
import React, { useState, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { BarChart3, Users, TrendingUp, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface AnalyticsData {
  nome: string;
  qa_score: number;
  iepc_score: number;
  equipe: string;
}

interface EquipeMedia {
  equipe: string;
  media_qa: number;
  media_iepc: number;
  total: number;
}

export default function PeopleAnalyticsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [topPerformers, setTopPerformers] = useState<AnalyticsData[]>([]);
  const [equipeMedias, setEquipeMedias] = useState<EquipeMedia[]>([]);
  const [mediaGlobalQa, setMediaGlobalQa] = useState(0);
  const [mediaGlobalIepc, setMediaGlobalIepc] = useState(0);
  const [totalFeedbacks, setTotalFeedbacks] = useState(0);
  const [filterEquipe, setFilterEquipe] = useState('');
  const [equipes, setEquipes] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('feedbacks')
        .select('qa_score, iepc_score, equipe, analistas(nome)')
        .in('status', ['approved', 'sent', 'generated'])
        .not('qa_score', 'is', null);

      if (!data) { setLoading(false); return; }

      const list = data.map((d) => ({
        nome: (d.analistas as { nome: string } | null)?.nome || 'Desconhecido',
        qa_score: d.qa_score || 0,
        iepc_score: d.iepc_score || 0,
        equipe: d.equipe || 'Sem equipe',
      }));

      const eq = [...new Set(list.map((l) => l.equipe))];
      setEquipes(eq);

      const filtered = filterEquipe ? list.filter((l) => l.equipe === filterEquipe) : list;

      // Top performers by QA
      const sorted = [...filtered].sort((a, b) => b.qa_score - a.qa_score).slice(0, 10);
      setTopPerformers(sorted);

      // Global averages
      if (filtered.length > 0) {
        setMediaGlobalQa(Math.round(filtered.reduce((s, l) => s + l.qa_score, 0) / filtered.length * 10) / 10);
        setMediaGlobalIepc(Math.round(filtered.reduce((s, l) => s + l.iepc_score, 0) / filtered.length * 10) / 10);
      }
      setTotalFeedbacks(filtered.length);

      // Per equipe
      const equipeMap: Record<string, { qa: number[]; iepc: number[] }> = {};
      filtered.forEach((l) => {
        if (!equipeMap[l.equipe]) equipeMap[l.equipe] = { qa: [], iepc: [] };
        equipeMap[l.equipe].qa.push(l.qa_score);
        equipeMap[l.equipe].iepc.push(l.iepc_score);
      });
      const medias = Object.entries(equipeMap).map(([equipe, vals]) => ({
        equipe,
        media_qa: Math.round(vals.qa.reduce((s, v) => s + v, 0) / vals.qa.length * 10) / 10,
        media_iepc: Math.round(vals.iepc.reduce((s, v) => s + v, 0) / vals.iepc.length * 10) / 10,
        total: vals.qa.length,
      }));
      setEquipeMedias(medias);
      setLoading(false);
    })();
  }, [filterEquipe]);

  return (
    <EnterpriseLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 size={24} className="text-sky-400" /> People Analytics
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Visão estratégica de evolução e desenvolvimento da equipe
            </p>
          </div>
          <select
            value={filterEquipe}
            onChange={(e) => setFilterEquipe(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <option value="">Todas as equipes</option>
            {equipes.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Média QA Squad', value: loading ? '...' : `${mediaGlobalQa}`, sub: '/100', color: '#38BDF8', icon: <Award size={18} /> },
            { label: 'Média IEPC Squad', value: loading ? '...' : `${mediaGlobalIepc}`, sub: '%', color: '#22C55E', icon: <TrendingUp size={18} /> },
            { label: 'Total Feedbacks', value: loading ? '...' : String(totalFeedbacks), sub: 'avaliações', color: '#A78BFA', icon: <Users size={18} /> },
            { label: 'Equipes', value: loading ? '...' : String(equipes.length), sub: 'ativas', color: '#FB923C', icon: <BarChart3 size={18} /> },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold tracking-widest" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px' }}>{kpi.label.toUpperCase()}</p>
                <span style={{ color: kpi.color }}>{kpi.icon}</span>
              </div>
              <p className="text-3xl font-bold text-white">{kpi.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Ranking Top Performers */}
        {topPerformers.length > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-sm font-semibold tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>🏆 TOP PERFORMERS — QA</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topPerformers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} />
                <YAxis type="category" dataKey="nome" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} width={120} />
                <Tooltip contentStyle={{ backgroundColor: '#0f1f3d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="qa_score" fill="#38BDF8" name="QA" radius={[0, 4, 4, 0]} />
                <Bar dataKey="iepc_score" fill="#22C55E" name="IEPC" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Por Equipe */}
        {equipeMedias.length > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-sm font-semibold tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>PERFORMANCE POR EQUIPE</h3>
            <div className="space-y-3">
              {equipeMedias.map((e) => (
                <div key={e.equipe} className="flex items-center gap-4">
                  <div className="w-32 text-sm truncate text-white">{e.equipe}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 text-xs text-sky-400">QA</div>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full bg-sky-400" style={{ width: `${e.media_qa}%` }} />
                      </div>
                      <span className="text-xs text-white w-8 text-right">{e.media_qa}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 text-xs text-green-400">IEPC</div>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full bg-green-400" style={{ width: `${e.media_iepc}%` }} />
                      </div>
                      <span className="text-xs text-white w-8 text-right">{e.media_iepc}</span>
                    </div>
                  </div>
                  <div className="text-xs w-16 text-right" style={{ color: 'rgba(255,255,255,0.3)' }}>{e.total} avaliações</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.3)' }}>Carregando analytics...</div>
        )}

        {!loading && totalFeedbacks === 0 && (
          <div className="text-center py-12 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <BarChart3 size={40} className="mx-auto mb-3 opacity-20 text-white" />
            <p className="text-white font-medium">Nenhum dado disponível ainda</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Importe ou crie feedbacks para visualizar analytics</p>
          </div>
        )}
      </div>
    </EnterpriseLayout>
  );
}
