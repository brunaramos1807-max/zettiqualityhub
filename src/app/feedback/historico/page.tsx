'use client';
import React, { useState, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { History, Eye, TrendingUp, TrendingDown, Upload, Trash2, Edit2, Copy, Check, ChevronDown, ChevronUp, Plus } from 'lucide-react';
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

const ENDPOINT = 'https://qualivisao.tec.br/api/feedbacks/import';
const TOKEN = 'qualivisao-lovable-token-2026';

export default function FeedbackHistoricoPage() {
  const supabase = createClient();
  const [grupos, setGrupos] = useState<AnalistaGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedAnalista, setExpandedAnalista] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showApiInfo, setShowApiInfo] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState('');

  const fetchData = async (q: string) => {
    setLoading(true);
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
    if (q) result = result.filter((g) => g.nome.toLowerCase().includes(q.toLowerCase()));
    setGrupos(result);
    setLoading(false);
  };

  useEffect(() => { fetchData(search); }, [search]);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!confirm('Excluir este feedback e seu histórico?')) return;
    await supabase.from('feedbacks').delete().eq('id', feedbackId);
    fetchData(search);
  };

  const handleImportFile = async () => {
    if (!importFile) return;
    setImportStatus('Importando...');
    try {
      const text = await importFile.text();
      const json = JSON.parse(text);
      const res = await fetch('/api/feedbacks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify(json),
      });
      let result = await res.json();
      if (res.ok) {
        setImportStatus('✅ Importado com sucesso!');
        setImportFile(null);
        fetchData(search);
      } else {
        setImportStatus(`❌ Erro: ${result.error || 'Falha na importação'}`);
      }
    } catch {
      setImportStatus('❌ JSON inválido');
    }
    setTimeout(() => setImportStatus(''), 4000);
  };

  return (
    <EnterpriseLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <History size={24} className="text-sky-400" /> Histórico Administrativo
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Gestão, importação e acompanhamento de feedbacks</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/feedback/import" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
              <Upload size={14} /> Importar JSON
            </Link>
            <Link href="/feedback/manual" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors">
              <Plus size={14} /> Novo Feedback
            </Link>
          </div>
        </div>

        {/* API Integration (admin) */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(56,189,248,0.15)' }}>
          <button
            onClick={() => setShowApiInfo(!showApiInfo)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-sky-400 transition-colors hover:bg-sky-400/5"
            style={{ backgroundColor: 'rgba(56,189,248,0.04)' }}
          >
            <span>🔗 Integração API — Credenciais e configuração</span>
            {showApiInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showApiInfo && (
            <div className="p-4 space-y-3" style={{ backgroundColor: 'rgba(56,189,248,0.03)', borderTop: '1px solid rgba(56,189,248,0.1)' }}>
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>ENDPOINT</p>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-xs font-mono text-sky-300 flex-1">{ENDPOINT}</span>
                  <button onClick={() => copyText(ENDPOINT, 'endpoint')} className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {copied === 'endpoint' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>BEARER TOKEN</p>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-xs font-mono text-yellow-300 flex-1">{TOKEN}</span>
                  <button onClick={() => copyText(TOKEN, 'token')} className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {copied === 'token' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
              <div className="text-xs rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.45)' }}>
                <span className="font-semibold text-white">Método:</span> POST &nbsp;|&nbsp;
                <span className="font-semibold text-white">Content-Type:</span> application/json &nbsp;|&nbsp;
                <span className="font-semibold text-white">Idempotência:</span> por email + ciclo
              </div>
            </div>
          )}
        </div>

        {/* Quick import */}
        <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>IMPORTAÇÃO RÁPIDA</p>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".json"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="text-xs text-white file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-sky-600 file:text-white hover:file:bg-sky-500"
            />
            {importFile && (
              <button onClick={handleImportFile} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 hover:bg-green-500 text-white transition-colors">
                Importar
              </button>
            )}
            {importStatus && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{importStatus}</span>}
          </div>
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
                      {isOpen ? <ChevronUp size={14} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />}
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
                            <div className="flex items-center gap-1">
                              {item.feedback_id && (
                                <Link href={`/feedback/${item.feedback_id}`} className="p-1 rounded hover:bg-white/10 transition-colors" title="Visualizar" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                  <Eye size={12} />
                                </Link>
                              )}
                              {item.feedback_id && (
                                <Link href={`/feedback/manual?id=${item.feedback_id}`} className="p-1 rounded hover:bg-white/10 transition-colors" title="Editar" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                  <Edit2 size={12} />
                                </Link>
                              )}
                              {item.feedback_id && (
                                <button onClick={() => handleDeleteFeedback(item.feedback_id!)} className="p-1 rounded hover:bg-red-500/10 transition-colors" title="Excluir" style={{ color: 'rgba(239,68,68,0.5)' }}>
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
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
