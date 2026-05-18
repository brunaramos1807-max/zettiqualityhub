'use client';
import React, { useState, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { RefreshCw, Search } from 'lucide-react';

interface LogEntry {
  id: string;
  user_email?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  created_at: string;
}

function LogsContent() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      if (supabase) {
        const { data } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
        if (data) setLogs(data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, []);

  const actions = ['all', ...Array.from(new Set(logs.map((l) => l.action).filter(Boolean)))];

  const filtered = logs.filter((l) => {
    if (filterAction !== 'all' && l.action !== filterAction) return false;
    if (search && !(l.user_email || '').toLowerCase().includes(search.toLowerCase()) && !(l.action || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('exclu')) return '#EF4444';
    if (action.includes('create') || action.includes('import')) return '#22C55E';
    if (action.includes('update') || action.includes('edit')) return '#F59E0B';
    return '#38BDF8';
  };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Logs de Auditoria</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Rastreabilidade completa de ações no sistema</p>
        </div>
        <button onClick={loadLogs} className="p-2 rounded-lg transition-colors" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Registros', value: logs.length, color: '#38BDF8' },
          { label: 'Usuários Ativos', value: new Set(logs.map((l) => l.user_email).filter(Boolean)).size, color: '#22C55E' },
          { label: 'Tipos de Ação', value: new Set(logs.map((l) => l.action).filter(Boolean)).size, color: '#F59E0B' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#94A3B8' }}>{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por usuário ou ação..." className="w-full pl-8 pr-3 py-2 rounded-lg text-sm text-white outline-none" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.08)' }} />
        </div>
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="px-3 py-2 rounded-lg text-sm text-white outline-none" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.08)' }}>
          {actions.map((a) => <option key={a} value={a}>{a === 'all' ? 'Todas as Ações' : a}</option>)}
        </select>
      </div>

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
                {['Data/Hora', 'Usuário', 'Ação', 'Entidade', 'Detalhes'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#94A3B8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td className="px-4 py-3 text-xs" style={{ color: '#94A3B8' }}>{formatDate(log.created_at)}</td>
                  <td className="px-4 py-3 text-xs text-white">{log.user_email || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: `${getActionColor(log.action)}15`, color: getActionColor(log.action) }}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#94A3B8' }}>{log.entity_type}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#94A3B8' }}>{log.entity_id || '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-xs" style={{ color: '#94A3B8' }}>
                  {logs.length === 0 ? 'Nenhum log registrado ainda' : 'Nenhum log encontrado com os filtros aplicados'}
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function LogsPage() {
  return (
    <EnterpriseLayout>
      <LogsContent />
    </EnterpriseLayout>
  );
}
