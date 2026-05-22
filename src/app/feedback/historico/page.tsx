'use client';
import React, { useState, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { History, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HistoricoItem {
  id: string;
  ciclo: string;
  qa_score: number | null;
  iepc_score: number | null;
  aderencia_score: number | null;
  posicao_squad: number | null;
  created_at: string;
  feedback_id: string | null;
  analistas?: { nome: string; equipe: string } | null;
}

interface AnalistaGroup {
  nome: string;
  equipe: string;
  items: HistoricoItem[];
}

export default function FeedbackHistoricoPage() {
  const supabase = createClient();
  const [grupos, setGrupos] = useState<AnalistaGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedAnalista, setExpandedAnalista] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('feedback_historico')
        .select('*, analistas(nome, equipe)')
        .order('created_at', { ascending: false });

      if (!data) { setLoading(false); return; }

      const map: Record<string, AnalistaGroup> = {};
      (data as HistoricoItem[]).forEach((item) => {
        const nome = item.analistas?.nome || 'Desconhecido';
        if (!map[nome]) map[nome] = { nome, equipe: item.analistas?.equipe || '—', items: [] };
        map[nome].items.push(item);
      });

      let result = Object.values(map).sort((a, b) => a.nome.localeCompare(b.nome));
      if (search) result = result.filter((g) => g.nome.toLowerCase().includes(search.toLowerCase()));
      setGrupos(result);
      setLoading(false);
    })();
  }, [search]);

  return (
    <EnterpriseLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History size={24} className="text-sky-400" /> Histórico de Feedbacks
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Evolução histórica por analista</p>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar analista..."
          className="w-full max-w-sm px-3 py-2 rounded-lg text-sm text-white outline-none"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        />

        {loading ? (
          <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.3)' }}>Carregando histórico...</div>
        ) : grupos.length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <History size={40} className="mx-auto mb-3 opacity-20 text-white" />
            <p className="text-white">Nenhum histórico encontrado</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>O histórico é gerado automaticamente quando feedbacks são aprovados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {grupos.map((grupo) => {
              const isOpen = expandedAnalista === grupo.nome;
              const chartData = [...grupo.items].reverse().map((i) => ({ ciclo: i.ciclo, QA: i.qa_score, IEPC: i.iepc_score }));
              const latest = grupo.items[0];
              const prev = grupo.items[1];
              const qaVar = latest && prev ? (latest.qa_score || 0) - (prev.qa_score || 0) : null;

              return (
                <div key={grupo.nome} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                  <button
                    onClick={() => setExpandedAnalista(isOpen ? null : grupo.nome)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
                    style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #1E40AF, #0EA5E9)' }}>
                        {grupo.nome.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-white">{grupo.nome}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{grupo.equipe} • {grupo.items.length} ciclos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {latest && (
                        <>
                          <div className="text-right">
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Último QA</p>
                            <p className="font-bold text-sky-400">{latest.qa_score ?? '—'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Último IEPC</p>
                            <p className="font-bold text-green-400">{latest.iepc_score ?? '—'}</p>
                          </div>
                          {qaVar !== null && (
                            <div className={`flex items-center gap-1 text-sm font-medium ${qaVar >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {qaVar >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                              {qaVar >= 0 ? '+' : ''}{qaVar}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="p-5 space-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      {chartData.length > 1 && (
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="ciclo" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                            <YAxis domain={[60, 100]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f1f3d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                            <Line type="monotone" dataKey="QA" stroke="#38BDF8" strokeWidth={2} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="IEPC" stroke="#22C55E" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                      <div className="space-y-1">
                        {grupo.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <span className="font-mono text-xs text-sky-400">{item.ciclo}</span>
                            <span className="text-white">QA {item.qa_score ?? '—'}</span>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>IEPC {item.iepc_score ?? '—'}</span>
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>{item.posicao_squad ? `#${item.posicao_squad}` : '—'}</span>
                            {item.feedback_id && (
                              <Link href={`/feedback/${item.feedback_id}`} className="p-1 rounded hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                <Eye size={12} />
                              </Link>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </EnterpriseLayout>
  );
}
