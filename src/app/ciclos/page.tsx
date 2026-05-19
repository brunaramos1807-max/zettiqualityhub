'use client';
import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { fetchCycleScores, fetchAllPeriodos, fetchNCRecords, fetchElogios, buildAnalystsFromScores, syncClosedCyclesFromSupabase, deletePeriodDataFromDB } from '@/lib/services/dataService';
import { createClient } from '@/lib/supabase/client';
import { RefreshCw, Lock, Unlock, BarChart2, ChevronRight, Activity, CheckCircle, X, Clock, History, Loader2, Trash2, RotateCcw, Shield } from 'lucide-react';
import Link from 'next/link';
import { useSystemAuth } from '@/contexts/SystemAuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type CycleStatus = 'aberto' | 'em_andamento' | 'fechado' | 'reaberto';

interface CycleSummary {
  periodo: string;
  analistas: number;
  qa: number;
  iepc: number;
  ncs: number;
  elogios: number;
  isClosed: boolean;
  status: CycleStatus;
  cycleId?: string;
  closed_at?: string;
  closed_by_email?: string;
  reopened_at?: string;
  reopened_by_email?: string;
}

interface ClosureHistoryEntry {
  id: string;
  periodo: string;
  action: string;
  actor_email: string;
  actor_name: string;
  notes: string;
  created_at: string;
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<CycleStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  aberto: { label: 'Aberto', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', icon: <Unlock size={10} /> },
  em_andamento: { label: 'Em Andamento', color: '#38BDF8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.25)', icon: <Activity size={10} /> },
  fechado: { label: 'Fechado', color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', icon: <Lock size={10} /> },
  reaberto: { label: 'Reaberto', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)', icon: <RotateCcw size={10} /> },
};

// ─── Close Cycle Modal ────────────────────────────────────────────────────────

interface CloseCycleModalProps {
  periodo: string;
  onConfirm: (notes: string) => void;
  onClose: () => void;
  loading: boolean;
}

function CloseCycleModal({ periodo, onConfirm, onClose, loading }: CloseCycleModalProps) {
  const [notes, setNotes] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(34,197,94,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.1)' }}>
              <Lock size={18} style={{ color: '#22C55E' }} />
            </div>
            <div>
              <h3 className="font-bold text-white">Fechar Ciclo</h3>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{periodo}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#94A3B8' }}><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="p-4 rounded-xl space-y-2" style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <p className="text-xs font-semibold" style={{ color: '#F59E0B' }}>⚠️ Atenção — Ação irreversível sem autorização</p>
            <p className="text-xs" style={{ color: '#94A3B8' }}>Ao fechar o ciclo, as seguintes ações serão bloqueadas para usuários comuns:</p>
            <ul className="text-xs space-y-1 mt-2" style={{ color: '#94A3B8' }}>
              {['Edição de dados', 'Exclusão de registros', 'Importação de planilhas', 'Alteração de rankings', 'Alteração de analytics'].map((item) => (
                <li key={item} className="flex items-center gap-2"><span style={{ color: '#EF4444' }}>✗</span> {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white mb-2">Observações do fechamento (opcional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: Ciclo ABR/2026 encerrado com consolidação completa..." rows={3}
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.625rem', color: '#F8FAFC', padding: '0.625rem 0.875rem', fontSize: '0.875rem', width: '100%', outline: 'none', resize: 'none' }} />
          </div>
        </div>
        <div className="flex gap-3 p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
          <button onClick={() => onConfirm(notes)} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: '#166534', border: '1px solid rgba(34,197,94,0.3)' }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            {loading ? 'Fechando...' : 'Confirmar Fechamento'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reopen Cycle Modal ───────────────────────────────────────────────────────

interface ReopenCycleModalProps {
  periodo: string;
  onConfirm: (notes: string) => void;
  onClose: () => void;
  loading: boolean;
}

function ReopenCycleModal({ periodo, onConfirm, onClose, loading }: ReopenCycleModalProps) {
  const [notes, setNotes] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(167,139,250,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(167,139,250,0.1)' }}>
              <RotateCcw size={18} style={{ color: '#A78BFA' }} />
            </div>
            <div>
              <h3 className="font-bold text-white">Reabrir Ciclo</h3>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{periodo}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#94A3B8' }}><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}>
            <p className="text-xs" style={{ color: '#94A3B8' }}>Reabrir o ciclo permitirá edições e importações novamente. O histórico de fechamento será preservado.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white mb-2">Motivo da reabertura *</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informe o motivo da reabertura..." rows={3}
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.625rem', color: '#F8FAFC', padding: '0.625rem 0.875rem', fontSize: '0.875rem', width: '100%', outline: 'none', resize: 'none' }} />
          </div>
        </div>
        <div className="flex gap-3 p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
          <button onClick={() => onConfirm(notes)} disabled={loading || !notes.trim()} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: '#5B21B6' }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            {loading ? 'Reabrindo...' : 'Reabrir Ciclo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Data Cleanup Modal ───────────────────────────────────────────────────────

interface CleanupModalProps {
  onClose: () => void;
  onSuccess: () => void;
  actorEmail: string;
}

function CleanupModal({ onClose, onSuccess, actorEmail }: CleanupModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'confirm' | 'running' | 'done'>('confirm');
  const [log, setLog] = useState<string[]>([]);
  const [confirm, setConfirm] = useState('');

  const runCleanup = async () => {
    if (confirm !== 'LIMPAR') return;
    setStep('running');
    const msgs: string[] = [];
    setLoading(true);
    try {
      const supabase = createClient();
      if (supabase) {
        // Delete operational data — preserve structure, users, permissions, squads
        const tables = [
          { name: 'cycle_scores', label: 'Avaliações QA/IEPC' },
          { name: 'nc_records', label: 'Não Conformidades' },
          { name: 'elogios', label: 'Elogios' },
          { name: 'import_cycles', label: 'Ciclos de importação' },
          { name: 'cycle_summaries', label: 'Resumos de ciclos' },
          { name: 'strategic_indicators', label: 'Indicadores estratégicos' },
          { name: 'manual_evaluations', label: 'Avaliações manuais' },
          { name: 'cycle_closure_history', label: 'Histórico de fechamentos' },
        ];
        for (const t of tables) {
          try {
            const { error } = await supabase.from(t.name).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (error) { msgs.push(`⚠️ ${t.label}: ${error.message}`); }
            else { msgs.push(`✓ ${t.label} limpo`); }
          } catch { msgs.push(`⚠️ ${t.label}: tabela não encontrada (ok)`); }
          setLog([...msgs]);
        }
        // Log the cleanup action
        await supabase.from('permission_logs').insert({ actor_email: actorEmail, action: 'limpeza_dados_operacionais', entity_type: 'sistema', details: 'Limpeza completa de dados operacionais realizada' });
        msgs.push('✓ Ação registrada nos logs de auditoria');
      }
      // Clear localStorage operational keys
      if (typeof window !== 'undefined') {
        const keysToRemove = ['zetti_cycle_scores', 'zetti_nc_records', 'zetti_elogios', 'zetti_import_cycles', 'zetti_closed_cycles', 'zetti_manual_cycles', 'zetti_andamento_scores', 'zetti_andamento_ncs'];
        keysToRemove.forEach((k) => { localStorage.removeItem(k); msgs.push(`✓ Cache local "${k}" removido`); });
      }
      msgs.push('');
      msgs.push('✅ Limpeza concluída. Sistema pronto para operação oficial.');
      setLog([...msgs]);
      setStep('done');
    } catch (e: any) {
      msgs.push(`❌ Erro: ${e?.message}`);
      setLog([...msgs]);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(239,68,68,0.25)', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
              <Trash2 size={18} style={{ color: '#EF4444' }} />
            </div>
            <div>
              <h3 className="font-bold text-white">Limpeza de Dados Operacionais</h3>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Preparar sistema para operação oficial</p>
            </div>
          </div>
          {step !== 'running' && <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#94A3B8' }}><X size={16} /></button>}
        </div>

        {step === 'confirm' && (
          <div className="p-5 space-y-4">
            <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p className="text-xs font-semibold" style={{ color: '#EF4444' }}>🗑️ Será excluído:</p>
              <div className="grid grid-cols-2 gap-1">
                {['Avaliações QA', 'Avaliações IEPC', 'Não Conformidades', 'Elogios', 'Ciclos de teste', 'Rankings', 'Analytics', 'Insights IA', 'Imports antigos', 'Cache local'].map((item) => (
                  <span key={item} className="text-xs flex items-center gap-1.5" style={{ color: '#94A3B8' }}><span style={{ color: '#EF4444' }}>✗</span> {item}</span>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <p className="text-xs font-semibold" style={{ color: '#22C55E' }}>✅ Será mantido:</p>
              <div className="grid grid-cols-2 gap-1">
                {['Usuários', 'Cargos', 'Permissões', 'Squads', 'Configurações', 'Layout', 'Autenticação', 'Supabase', 'Gemini', 'Regras RBAC'].map((item) => (
                  <span key={item} className="text-xs flex items-center gap-1.5" style={{ color: '#94A3B8' }}><span style={{ color: '#22C55E' }}>✓</span> {item}</span>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white mb-2">Digite <strong style={{ color: '#EF4444' }}>LIMPAR</strong> para confirmar</label>
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="LIMPAR" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${confirm === 'LIMPAR' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '0.625rem', color: '#F8FAFC', padding: '0.625rem 0.875rem', fontSize: '0.875rem', width: '100%', outline: 'none', height: '44px' }} />
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
              <button onClick={runCleanup} disabled={confirm !== 'LIMPAR'} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#DC2626' }}>
                <Trash2 size={14} /> Executar Limpeza
              </button>
            </div>
          </div>
        )}

        {(step === 'running' || step === 'done') && (
          <div className="p-5 space-y-4">
            <div className="p-4 rounded-xl font-mono text-xs space-y-1 max-h-64 overflow-y-auto" style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {log.map((line, i) => (
                <p key={i} style={{ color: line.startsWith('✓') ? '#22C55E' : line.startsWith('⚠️') ? '#F59E0B' : line.startsWith('❌') ? '#EF4444' : line.startsWith('✅') ? '#22C55E' : '#94A3B8' }}>{line || '\u00A0'}</p>
              ))}
              {step === 'running' && <p className="animate-pulse" style={{ color: '#38BDF8' }}>Processando...</p>}
            </div>
            {step === 'done' && (
              <button onClick={() => { onSuccess(); onClose(); }} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: '#166534' }}>
                <CheckCircle size={14} className="inline mr-2" />Concluído
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function CiclosContent() {
  const { session, isAdmin } = useSystemAuth();
  const [cycles, setCycles] = useState<CycleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<Record<string, string>>({});
  const [aiLoadingPeriodo, setAiLoadingPeriodo] = useState<string | null>(null);
  const [closingCycle, setClosingCycle] = useState<string | null>(null);
  const [reopeningCycle, setReopeningCycle] = useState<string | null>(null);
  const [deletingCycle, setDeletingCycle] = useState<string | null>(null);
  const [showCleanup, setShowCleanup] = useState(false);
  const [closureHistory, setClosureHistory] = useState<ClosureHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const actorEmail = session?.email || 'sistema';
  const actorName = session?.nome || 'Sistema';

  // Can close/reopen: Admin or Coordenadora Qualidade
  const canManageCycles = isAdmin || session?.cargo === 'Administrador' || session?.cargo === 'Coordenadora Qualidade' || session?.cargo === 'Coordenador Geral';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [scores, periodos, ncs, elogios] = await Promise.all([
        fetchCycleScores(),
        fetchAllPeriodos(),
        fetchNCRecords(),
        fetchElogios(),
      ]);

      const supabase = createClient();
      let cycleData: Record<string, any> = {};
      if (supabase) {
        const { data } = await supabase.from('import_cycles').select('periodo, is_closed, status, closed_at, closed_by_email, reopened_at, reopened_by_email, id');
        if (data) {
          data.forEach((d: any) => { cycleData[d.periodo] = d; });
          // Sync Supabase closed status into localStorage cache so isCycleClosed() works everywhere
          syncClosedCyclesFromSupabase(data.map((d: any) => ({ periodo: d.periodo, is_closed: !!d.is_closed, closed_at: d.closed_at, status: d.status })));
        }
      }

      const summaries: CycleSummary[] = periodos.map((periodo) => {
        const pScores = scores.filter((s: any) => s.periodo === periodo);
        const pNCs = ncs.filter((n: any) => n.periodo === periodo);
        const pElogios = elogios.filter((e: any) => e.periodo === periodo);
        const analysts = buildAnalystsFromScores(pScores);
        const qa = analysts.length > 0 ? analysts.reduce((s: number, a: any) => s + a.qaScore, 0) / analysts.length : 0;
        const iepc = analysts.length > 0 ? analysts.reduce((s: number, a: any) => s + a.iepcScore, 0) / analysts.length : 0;
        const cd = cycleData[periodo];
        const isClosed = cd?.is_closed || false;
        let status: CycleStatus = cd?.status || (isClosed ? 'fechado' : 'aberto');
        return {
          periodo, analistas: analysts.length,
          qa: parseFloat(qa.toFixed(2)), iepc: parseFloat(iepc.toFixed(2)),
          ncs: pNCs.length, elogios: pElogios.length,
          isClosed, status, cycleId: cd?.id,
          closed_at: cd?.closed_at, closed_by_email: cd?.closed_by_email,
          reopened_at: cd?.reopened_at, reopened_by_email: cd?.reopened_by_email,
        };
      });

      setCycles([...summaries].reverse());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const supabase = createClient();
      if (!supabase) return;
      const { data } = await supabase.from('cycle_closure_history').select('*').order('created_at', { ascending: false }).limit(50);
      if (data) setClosureHistory(data as ClosureHistoryEntry[]);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadData();
    loadHistory();
    const handler = () => { loadData(); loadHistory(); };
    window.addEventListener('zetti_data_changed', handler);
    return () => window.removeEventListener('zetti_data_changed', handler);
  }, [loadData, loadHistory]);

  const handleCloseCycle = async (periodo: string, notes: string) => {
    if (!canManageCycles) return;
    setActionLoading(periodo);
    try {
      const supabase = createClient();
      if (supabase) {
        const now = new Date().toISOString();
        // Use upsert so it works even if no import_cycles row exists yet for this period
        await supabase.from('import_cycles').upsert(
          {
            periodo,
            is_closed: true,
            status: 'fechado',
            closed_at: now,
            closed_by_email: actorEmail,
            closure_notes: notes,
            file_name: 'Ciclo',
            record_count: 0,
          },
          { onConflict: 'periodo' }
        );

        // Log to closure history
        const cycle = cycles.find((c) => c.periodo === periodo);
        await supabase.from('cycle_closure_history').insert({
          periodo, action: 'fechado',
          actor_email: actorEmail, actor_name: actorName,
          notes: notes || 'Ciclo fechado',
          snapshot: { qa: cycle?.qa, iepc: cycle?.iepc, ncs: cycle?.ncs, elogios: cycle?.elogios, analistas: cycle?.analistas },
          created_at: now,
        });

        // Audit log
        await supabase.from('permission_logs').insert({ actor_email: actorEmail, action: 'ciclo_fechado', entity_type: 'ciclo', entity_id: periodo, details: `Ciclo ${periodo} fechado por ${actorEmail}` });
      }
      // Sync localStorage cache so isCycleClosed() works everywhere without a full reload
      syncClosedCyclesFromSupabase([{ periodo, is_closed: true, closed_at: new Date().toISOString(), status: 'fechado' }]);
      setClosingCycle(null);
      await loadData(); await loadHistory();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleReopenCycle = async (periodo: string, notes: string) => {
    if (!canManageCycles) return;
    setActionLoading(periodo);
    try {
      const supabase = createClient();
      if (supabase) {
        const now = new Date().toISOString();
        // Use upsert so it works even if no import_cycles row exists yet for this period
        await supabase.from('import_cycles').upsert(
          {
            periodo,
            is_closed: false,
            status: 'reaberto',
            reopened_at: now,
            reopened_by_email: actorEmail,
            file_name: 'Ciclo',
            record_count: 0,
          },
          { onConflict: 'periodo' }
        );

        await supabase.from('cycle_closure_history').insert({
          periodo, action: 'reaberto',
          actor_email: actorEmail, actor_name: actorName,
          notes, created_at: now,
        });

        await supabase.from('permission_logs').insert({ actor_email: actorEmail, action: 'ciclo_reaberto', entity_type: 'ciclo', entity_id: periodo, details: `Ciclo ${periodo} reaberto por ${actorEmail}. Motivo: ${notes}` });
      }
      // Sync localStorage cache
      syncClosedCyclesFromSupabase([{ periodo, is_closed: false, status: 'reaberto' }]);
      setReopeningCycle(null);
      await loadData(); await loadHistory();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleDeleteCycle = async (periodo: string) => {
    if (!isAdmin) return;
    setActionLoading(periodo);
    try {
      const result = await deletePeriodDataFromDB(periodo);
      if (result.success) {
        setDeletingCycle(null);
        await loadData();
        await loadHistory();
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleGenerateSummary = async (cycle: CycleSummary) => {
    if (aiLoadingPeriodo) return;
    setAiLoadingPeriodo(cycle.periodo);
    try {
      const { getChatCompletion } = await import('@/lib/ai/chatCompletion');
      const prompt = `Gere um resumo executivo em 2 frases do ciclo ${cycle.periodo}: QA ${cycle.qa.toFixed(1)}%, IEPC ${cycle.iepc.toFixed(1)}%, ${cycle.ncs} NCs, ${cycle.elogios} elogios, ${cycle.analistas} analistas. Seja objetivo e destaque o ponto mais crítico.`;
      const result = await getChatCompletion('GEMINI', 'gemini/gemini-2.5-flash', [{ role: 'user', content: prompt }], { temperature: 0.5, max_tokens: 150 });
      const content = result?.choices?.[0]?.message?.content;
      if (content) {
        setAiSummary((prev) => ({ ...prev, [cycle.periodo]: content }));
      }
    } catch {
      // AI is optional — silently ignore errors
    } finally {
      setAiLoadingPeriodo(null);
    }
  };

  const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    fechado: { label: 'Fechado', color: '#22C55E' },
    reaberto: { label: 'Reaberto', color: '#A78BFA' },
    editado: { label: 'Editado', color: '#F59E0B' },
  };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Ciclos</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Gestão e acompanhamento de ciclos operacionais</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button onClick={() => setShowCleanup(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              <Trash2 size={13} /> Limpar Dados
            </button>
          )}
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: showHistory ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.05)', color: showHistory ? '#38BDF8' : '#94A3B8', border: `1px solid ${showHistory ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
            <History size={13} /> Histórico
          </button>
          <button onClick={loadData} className="p-2 rounded-lg transition-colors" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Ciclos', value: cycles.length, color: '#38BDF8', icon: <Activity size={16} /> },
          { label: 'Fechados', value: cycles.filter((c) => c.status === 'fechado').length, color: '#22C55E', icon: <Lock size={16} /> },
          { label: 'Abertos', value: cycles.filter((c) => c.status === 'aberto' || c.status === 'em_andamento').length, color: '#F59E0B', icon: <Unlock size={16} /> },
          { label: 'Reabertos', value: cycles.filter((c) => c.status === 'reaberto').length, color: '#A78BFA', icon: <RotateCcw size={16} /> },
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

      {/* Closure History Panel */}
      {showHistory && (
        <div className="mb-6 rounded-xl overflow-hidden" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(56,189,248,0.15)' }}>
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><History size={14} style={{ color: '#38BDF8' }} /> Histórico de Fechamentos</h3>
            <button onClick={() => setShowHistory(false)} className="p-1 rounded hover:bg-white/10" style={{ color: '#94A3B8' }}><X size={14} /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Data/Hora', 'Ciclo', 'Ação', 'Responsável', 'Observações'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {closureHistory.map((entry) => {
                  const actionMeta = ACTION_LABELS[entry.action] || { label: entry.action, color: '#94A3B8' };
                  return (
                    <tr key={entry.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td className="py-3 px-4" style={{ color: '#94A3B8' }}>
                        <span className="flex items-center gap-1"><Clock size={11} />{new Date(entry.created_at).toLocaleString('pt-BR')}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">{entry.periodo}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${actionMeta.color}15`, color: actionMeta.color, border: `1px solid ${actionMeta.color}25` }}>{actionMeta.label}</span>
                      </td>
                      <td className="py-3 px-4" style={{ color: '#94A3B8' }}>{entry.actor_name || entry.actor_email || '—'}</td>
                      <td className="py-3 px-4" style={{ color: '#94A3B8' }}>{entry.notes || '—'}</td>
                    </tr>
                  );
                })}
                {closureHistory.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center" style={{ color: '#94A3B8' }}>Nenhum histórico registrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cycles List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : cycles.length === 0 ? (
        <div className="text-center py-16">
          <BarChart2 size={40} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
          <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhum ciclo encontrado. Importe dados para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle) => {
            const statusCfg = STATUS_CONFIG[cycle.status] || STATUS_CONFIG.aberto;
            const isClosed = cycle.status === 'fechado';
            const isReaberto = cycle.status === 'reaberto';
            return (
              <div key={cycle.periodo} className="rounded-xl p-5 transition-all" style={{ backgroundColor: '#0F1B31', border: `1px solid ${isClosed ? 'rgba(34,197,94,0.15)' : isReaberto ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.06)'}` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white">{cycle.periodo}</h3>
                        {/* Status Badge */}
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}>
                          {statusCfg.icon}{statusCfg.label}
                        </span>
                        {isClosed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'rgba(34,197,94,0.08)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.15)' }}>
                            <Shield size={9} /> Bloqueado
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                        {cycle.analistas} analistas avaliados
                        {cycle.closed_at && isClosed && <span> · Fechado em {new Date(cycle.closed_at).toLocaleDateString('pt-BR')} por {cycle.closed_by_email}</span>}
                        {cycle.reopened_at && isReaberto && <span> · Reaberto em {new Date(cycle.reopened_at).toLocaleDateString('pt-BR')}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {canManageCycles && !isClosed && (
                      <button onClick={() => setClosingCycle(cycle.periodo)} disabled={actionLoading === cycle.periodo}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                        style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>
                        {actionLoading === cycle.periodo ? <Loader2 size={11} className="animate-spin" /> : <Lock size={11} />}
                        Fechar Ciclo
                      </button>
                    )}
                    {canManageCycles && (isClosed || isReaberto) && (
                      <button onClick={() => setReopeningCycle(cycle.periodo)} disabled={actionLoading === cycle.periodo}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                        style={{ backgroundColor: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.2)' }}>
                        {actionLoading === cycle.periodo ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                        Reabrir
                      </button>
                    )}
                    {isAdmin && !isClosed && (
                      <button onClick={() => setDeletingCycle(cycle.periodo)} disabled={actionLoading === cycle.periodo}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                        style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <Trash2 size={11} /> Excluir
                      </button>
                    )}
                    <button onClick={() => handleGenerateSummary(cycle)} disabled={aiLoadingPeriodo === cycle.periodo}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                      style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}>
                      {aiLoadingPeriodo === cycle.periodo ? <Loader2 size={11} className="animate-spin" /> : <Activity size={11} />} IA
                    </button>
                    <Link href={`/cycle-dashboard?periodo=${encodeURIComponent(cycle.periodo)}`}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#94A3B8' }}>
                      Detalhes <ChevronRight size={11} />
                    </Link>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'QA Médio', value: `${cycle.qa.toFixed(1)}%`, color: cycle.qa >= 85 ? '#22C55E' : cycle.qa >= 70 ? '#F59E0B' : '#EF4444' },
                    { label: 'IEPC Médio', value: `${cycle.iepc.toFixed(1)}%`, color: cycle.iepc >= 85 ? '#22C55E' : cycle.iepc >= 70 ? '#F59E0B' : '#EF4444' },
                    { label: 'NCs', value: cycle.ncs, color: cycle.ncs > 10 ? '#EF4444' : '#94A3B8' },
                    { label: 'Elogios', value: cycle.elogios, color: '#F59E0B' },
                  ].map((m) => (
                    <div key={m.label}>
                      <p className="text-xs" style={{ color: '#94A3B8' }}>{m.label}</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: m.color }}>{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Closed overlay message */}
                {isClosed && (
                  <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg" style={{ backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
                    <Lock size={12} style={{ color: '#22C55E', flexShrink: 0 }} />
                    <p className="text-xs" style={{ color: '#22C55E' }}>Ciclo fechado — edições, importações e exclusões bloqueadas para usuários comuns</p>
                  </div>
                )}

                {aiSummary[cycle.periodo] && (
                  <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.1)' }}>
                    <p className="text-xs" style={{ color: '#94A3B8' }}><span style={{ color: '#38BDF8' }}>IA:</span> {aiSummary[cycle.periodo]}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {closingCycle && (
        <CloseCycleModal periodo={closingCycle} loading={actionLoading === closingCycle}
          onConfirm={(notes) => handleCloseCycle(closingCycle, notes)}
          onClose={() => setClosingCycle(null)} />
      )}

      {reopeningCycle && (
        <ReopenCycleModal periodo={reopeningCycle} loading={actionLoading === reopeningCycle}
          onConfirm={(notes) => handleReopenCycle(reopeningCycle, notes)}
          onClose={() => setReopeningCycle(null)} />
      )}

      {showCleanup && (
        <CleanupModal actorEmail={actorEmail} onClose={() => setShowCleanup(false)} onSuccess={() => { loadData(); loadHistory(); }} />
      )}

      {deletingCycle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(239,68,68,0.25)' }}>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
                  <Trash2 size={18} style={{ color: '#EF4444' }} />
                </div>
                <div>
                  <h3 className="font-bold text-white">Excluir Ciclo</h3>
                  <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{deletingCycle}</p>
                </div>
              </div>
              <p className="text-sm mb-5" style={{ color: '#94A3B8' }}>Todos os dados deste ciclo (avaliações, NCs, elogios, PDIs) serão excluídos permanentemente do banco de dados.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingCycle(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
                <button onClick={() => handleDeleteCycle(deletingCycle)} disabled={actionLoading === deletingCycle}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: '#DC2626' }}>
                  {actionLoading === deletingCycle ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CiclosPage() {
  return (
    <EnterpriseLayout>
      <CiclosContent />
    </EnterpriseLayout>
  );
}
