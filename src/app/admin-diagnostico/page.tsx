'use client';
import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { fetchAdminLogs, type AdminLog } from '@/lib/services/dataService';
import { createClient } from '@/lib/supabase/client';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import { Shield, RefreshCw, AlertTriangle, Info, CheckCircle, XCircle, Activity, Database, Users, Download, Clock } from 'lucide-react';

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  info: { label: 'Info', color: '#38BDF8', bg: 'rgba(56,189,248,0.1)', icon: <Info size={11} /> },
  warning: { label: 'Aviso', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: <AlertTriangle size={11} /> },
  error: { label: 'Erro', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', icon: <XCircle size={11} /> },
  success: { label: 'Sucesso', color: '#22C55E', bg: 'rgba(34,197,94,0.1)', icon: <CheckCircle size={11} /> },
  critical: { label: 'Crítico', color: '#DC2626', bg: 'rgba(220,38,38,0.15)', icon: <AlertTriangle size={11} /> },
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  sistema: { label: 'Sistema', color: '#94A3B8' },
  autenticacao: { label: 'Autenticação', color: '#38BDF8' },
  importacao: { label: 'Importação', color: '#06B6D4' },
  ciclo: { label: 'Ciclo', color: '#22C55E' },
  permissao: { label: 'Permissão', color: '#A78BFA' },
  api: { label: 'API', color: '#F59E0B' },
  banco: { label: 'Banco de Dados', color: '#EF4444' },
  pdi: { label: 'PDI', color: '#10B981' },
};

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalCycles: number;
  totalScores: number;
  totalNCs: number;
  totalPDIs: number;
  totalLogs: number;
  recentErrors: number;
}

function AdminDiagnosticContent() {
  const { session, isAdmin } = useSystemAuth();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [activeTab, setActiveTab] = useState<'logs' | 'diagnostics' | 'users'>('diagnostics');
  const [users, setUsers] = useState<any[]>([]);
  const [permissionLogs, setPermissionLogs] = useState<any[]>([]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const data = await fetchAdminLogs({ category: filterCategory, severity: filterSeverity, limit: 200 });
    setLogs(data);
    setLoading(false);
  }, [filterCategory, filterSeverity]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;
      const [usersRes, cyclesRes, scoresRes, ncsRes, pdisRes, logsRes, permLogsRes] = await Promise.all([
        supabase.from('user_profiles').select('id, email, full_name, role, is_active, last_login_at, created_at').order('created_at', { ascending: false }),
        supabase.from('import_cycles').select('id, periodo, status, is_closed, imported_at').order('imported_at', { ascending: false }),
        supabase.from('cycle_scores').select('id', { count: 'exact', head: true }),
        supabase.from('nc_records').select('id', { count: 'exact', head: true }),
        supabase.from('pdi_records').select('id', { count: 'exact', head: true }),
        supabase.from('admin_logs').select('id', { count: 'exact', head: true }),
        supabase.from('permission_logs').select('*').order('created_at', { ascending: false }).limit(50),
      ]);

      const allUsers = usersRes.data || [];
      setUsers(allUsers);
      setPermissionLogs(permLogsRes.data || []);

      const recentErrors = logs.filter((l) => l.severity === 'error' || l.severity === 'critical').length;

      setStats({
        totalUsers: allUsers.length,
        activeUsers: allUsers.filter((u: any) => u.is_active).length,
        totalCycles: cyclesRes.data?.length || 0,
        totalScores: scoresRes.count || 0,
        totalNCs: ncsRes.count || 0,
        totalPDIs: pdisRes.count || 0,
        totalLogs: logsRes.count || 0,
        recentErrors,
      });
    } catch { /* ignore */ }
    setStatsLoading(false);
  }, [logs]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const exportLogs = () => {
    const csv = [
      ['Data', 'Severidade', 'Categoria', 'Ação', 'Ator', 'Detalhes', 'Duração (ms)'].join(','),
      ...logs.map((l) => [
        new Date(l.created_at).toLocaleString('pt-BR'),
        l.severity,
        l.category,
        l.action,
        l.actor_email || '',
        JSON.stringify(l.details || {}),
        l.duration_ms || '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin && session?.cargo !== 'Administrador') {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-center">
          <Shield size={40} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
          <p className="text-sm font-semibold text-white">Acesso Restrito</p>
          <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Esta área é exclusiva para administradores do sistema.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield size={20} style={{ color: '#38BDF8' }} /> Admin — Logs & Diagnóstico
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Monitoramento completo do sistema Qualivisão</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { loadLogs(); loadStats(); }} className="p-2 rounded-lg transition-colors" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={exportLogs} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}>
            <Download size={13} /> Exportar Logs
          </button>
        </div>
      </div>

      {/* System Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 animate-pulse" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)', height: 88 }} />
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Usuários Totais', value: stats.totalUsers, sub: `${stats.activeUsers} ativos`, color: '#38BDF8', icon: <Users size={16} /> },
            { label: 'Ciclos Importados', value: stats.totalCycles, sub: 'no banco', color: '#22C55E', icon: <Activity size={16} /> },
            { label: 'Avaliações QA', value: stats.totalScores.toLocaleString('pt-BR'), sub: 'registros', color: '#06B6D4', icon: <Database size={16} /> },
            { label: 'Não Conformidades', value: stats.totalNCs.toLocaleString('pt-BR'), sub: 'registros', color: '#F59E0B', icon: <AlertTriangle size={16} /> },
            { label: 'PDIs Ativos', value: stats.totalPDIs, sub: 'planos', color: '#10B981', icon: <CheckCircle size={16} /> },
            { label: 'Logs do Sistema', value: stats.totalLogs.toLocaleString('pt-BR'), sub: 'entradas', color: '#A78BFA', icon: <Shield size={16} /> },
            { label: 'Erros Recentes', value: stats.recentErrors, sub: 'últimos logs', color: stats.recentErrors > 0 ? '#EF4444' : '#22C55E', icon: <XCircle size={16} /> },
            { label: 'Status Geral', value: stats.recentErrors === 0 ? 'OK' : 'Atenção', sub: 'sistema', color: stats.recentErrors === 0 ? '#22C55E' : '#F59E0B', icon: <Activity size={16} /> },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>{s.label}</span>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', width: 'fit-content' }}>
        {[
          { id: 'diagnostics', label: 'Diagnóstico', icon: <Activity size={13} /> },
          { id: 'logs', label: 'Logs do Sistema', icon: <Shield size={13} /> },
          { id: 'users', label: 'Usuários', icon: <Users size={13} /> },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ backgroundColor: activeTab === tab.id ? 'rgba(56,189,248,0.15)' : 'transparent', color: activeTab === tab.id ? '#38BDF8' : '#94A3B8' }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Diagnostics Tab */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-4">
          {/* Permission Logs */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white">Logs de Permissão e Auditoria</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Data', 'Ator', 'Ação', 'Entidade', 'Detalhes'].map((h) => (
                      <th key={h} className="text-left py-3 px-4 font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissionLogs.slice(0, 20).map((log: any) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td className="py-3 px-4" style={{ color: '#94A3B8' }}>
                        <span className="flex items-center gap-1"><Clock size={10} />{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                      </td>
                      <td className="py-3 px-4 text-white">{log.actor_email || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8' }}>{log.action}</span>
                      </td>
                      <td className="py-3 px-4" style={{ color: '#94A3B8' }}>{log.entity_type || '—'}</td>
                      <td className="py-3 px-4" style={{ color: '#94A3B8', maxWidth: 200 }}>
                        <span className="truncate block">{log.details || '—'}</span>
                      </td>
                    </tr>
                  ))}
                  {permissionLogs.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center" style={{ color: '#94A3B8' }}>Nenhum log de permissão registrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div>
          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-2 rounded-lg text-sm text-white outline-none" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.08)' }}>
              <option value="all">Todas as Categorias</option>
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="px-3 py-2 rounded-lg text-sm text-white outline-none" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.08)' }}>
              <option value="all">Todas as Severidades</option>
              {Object.entries(SEVERITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <span className="flex items-center text-xs" style={{ color: '#64748B' }}>{logs.length} registros</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {['Data/Hora', 'Severidade', 'Categoria', 'Ação', 'Ator', 'Duração', 'Detalhes'].map((h) => (
                        <th key={h} className="text-left py-3 px-4 font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const sev = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;
                      const cat = CATEGORY_CONFIG[log.category];
                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td className="py-3 px-4" style={{ color: '#94A3B8' }}>
                            <span className="flex items-center gap-1"><Clock size={10} />{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: sev.bg, color: sev.color }}>
                              {sev.icon} {sev.label}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium" style={{ color: cat?.color || '#94A3B8' }}>{cat?.label || log.category}</span>
                          </td>
                          <td className="py-3 px-4 text-white font-medium">{log.action}</td>
                          <td className="py-3 px-4" style={{ color: '#94A3B8' }}>{log.actor_email || '—'}</td>
                          <td className="py-3 px-4" style={{ color: '#64748B' }}>{log.duration_ms ? `${log.duration_ms}ms` : '—'}</td>
                          <td className="py-3 px-4" style={{ color: '#94A3B8', maxWidth: 200 }}>
                            {log.error_message ? (
                              <span style={{ color: '#EF4444' }}>{log.error_message}</span>
                            ) : (
                              <span className="truncate block">{log.details ? JSON.stringify(log.details).slice(0, 60) : '—'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {logs.length === 0 && (
                      <tr><td colSpan={7} className="py-8 text-center" style={{ color: '#94A3B8' }}>Nenhum log encontrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Usuário', 'Email', 'Cargo/Role', 'Status', 'Último Login', 'Criado em'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user: any) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="py-3 px-4 font-semibold text-white">{user.full_name || '—'}</td>
                    <td className="py-3 px-4" style={{ color: '#94A3B8' }}>{user.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8' }}>{user.role || '—'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: user.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: user.is_active ? '#22C55E' : '#EF4444' }}>
                        {user.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3 px-4" style={{ color: '#94A3B8' }}>
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleString('pt-BR') : '—'}
                    </td>
                    <td className="py-3 px-4" style={{ color: '#94A3B8' }}>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center" style={{ color: '#94A3B8' }}>Nenhum usuário encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDiagnosticPage() {
  return (
    <EnterpriseLayout>
      <AdminDiagnosticContent />
    </EnterpriseLayout>
  );
}
