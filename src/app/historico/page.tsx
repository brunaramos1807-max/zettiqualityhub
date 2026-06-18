'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import ImportModal from '@/components/ImportModal';
import { createClient } from '@/lib/supabase/client';
import { Clock, BarChart2, AlertTriangle, RefreshCw, Users } from 'lucide-react';

interface CycleSummary {
  periodo: string;
  label: string;
  analysts: number;
  avgQA: number;
  avgIEPC: number;
  totalNCs: number;
  totalElogios: number;
  status: 'ativo' | 'encerrado';
}

function formatPeriodoLabel(periodo: string): string {
  const months: Record<string, string> = {
    '01': 'JAN', '02': 'FEV', '03': 'MAR', '04': 'ABR',
    '05': 'MAI', '06': 'JUN', '07': 'JUL', '08': 'AGO',
    '09': 'SET', '10': 'OUT', '11': 'NOV', '12': 'DEZ',
  };
  const m = periodo.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) return `${months[m[1].padStart(2, '0')] || m[1]}/${m[2]}`;
  return periodo;
}

function parsePeriodo(p: string): number {
  const m = p.match(/^(\d{1,2})\/(\d{4})$/);
  if (!m) return 0;
  return parseInt(m[2]) * 100 + parseInt(m[1]);
}

function HistoricoContent() {
  const [importOpen, setImportOpen] = useState(false);
  const [cycles, setCycles] = useState<CycleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCycle, setActiveCycle] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Fetch active cycle setting
      const { data: settings } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'active_cycle')
        .maybeSingle();
      const active = settings?.value || '';
      setActiveCycle(active);

      // Fetch all cycle_scores grouped by periodo
      const { data: scores } = await supabase
        .from('cycle_scores')
        .select('periodo, analista, nota_final_qa, iepc_total');

      // Fetch all nc_records grouped by periodo
      const { data: ncs } = await supabase
        .from('nc_records')
        .select('periodo');

      // Fetch all elogios grouped by periodo
      const { data: elogios } = await supabase
        .from('elogios')
        .select('periodo');

      // Build cycle map
      const cycleMap: Record<string, {
        analistas: Set<string>;
        qaSum: number;
        iepcSum: number;
        qaCount: number;
        iepcCount: number;
        ncs: number;
        elogios: number;
      }> = {};

      (scores || []).forEach((s: any) => {
        if (!s.periodo) return;
        if (!cycleMap[s.periodo]) {
          cycleMap[s.periodo] = { analistas: new Set(), qaSum: 0, iepcSum: 0, qaCount: 0, iepcCount: 0, ncs: 0, elogios: 0 };
        }
        if (s.analista) cycleMap[s.periodo].analistas.add(s.analista);
        if (s.nota_final_qa != null) { cycleMap[s.periodo].qaSum += s.nota_final_qa; cycleMap[s.periodo].qaCount++; }
        if (s.iepc_total != null) { cycleMap[s.periodo].iepcSum += s.iepc_total; cycleMap[s.periodo].iepcCount++; }
      });

      (ncs || []).forEach((n: any) => {
        if (!n.periodo || !cycleMap[n.periodo]) return;
        cycleMap[n.periodo].ncs++;
      });

      (elogios || []).forEach((e: any) => {
        if (!e.periodo || !cycleMap[e.periodo]) return;
        cycleMap[e.periodo].elogios++;
      });

      const result: CycleSummary[] = Object.entries(cycleMap)
        .sort(([a], [b]) => parsePeriodo(b) - parsePeriodo(a))
        .map(([periodo, data]) => ({
          periodo,
          label: formatPeriodoLabel(periodo),
          analysts: data.analistas.size,
          avgQA: data.qaCount > 0 ? Math.round((data.qaSum / data.qaCount) * 10) / 10 : 0,
          avgIEPC: data.iepcCount > 0 ? Math.round((data.iepcSum / data.iepcCount) * 10) / 10 : 0,
          totalNCs: data.ncs,
          totalElogios: data.elogios,
          status: periodo === active ? 'ativo' : 'encerrado',
        }));

      setCycles(result);
    } catch (err) {
      console.error('Histórico load error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('zetti_import_done', handler);
    window.addEventListener('zetti_active_cycle_changed', handler);
    return () => {
      window.removeEventListener('zetti_import_done', handler);
      window.removeEventListener('zetti_active_cycle_changed', handler);
    };
  }, [loadData]);

  const avgQA = useMemo(() => {
    const valid = cycles.filter((c) => c.avgQA > 0);
    return valid.length > 0 ? valid.reduce((s, c) => s + c.avgQA, 0) / valid.length : 0;
  }, [cycles]);

  const avgIEPC = useMemo(() => {
    const valid = cycles.filter((c) => c.avgIEPC > 0);
    return valid.length > 0 ? valid.reduce((s, c) => s + c.avgIEPC, 0) / valid.length : 0;
  }, [cycles]);

  const totalNCs = useMemo(() => cycles.reduce((s, c) => s + c.totalNCs, 0), [cycles]);

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Histórico de Ciclos</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
            Registro histórico consolidado · Fonte: Supabase
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 rounded-lg transition-colors"
            style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}
            title="Atualizar"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
            style={{ backgroundColor: '#1E40AF' }}
          >
            Importar
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Ciclos Registrados', value: cycles.length, color: '#38BDF8', icon: <Clock size={16} /> },
          { label: 'QA Médio Geral', value: avgQA > 0 ? `${avgQA.toFixed(1)}%` : '—', color: '#22C55E', icon: <BarChart2 size={16} /> },
          { label: 'IEPC Médio Geral', value: avgIEPC > 0 ? `${avgIEPC.toFixed(1)}%` : '—', color: '#06B6D4', icon: <BarChart2 size={16} /> },
          { label: 'Total NCs', value: totalNCs, color: '#EF4444', icon: <AlertTriangle size={16} /> },
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

      {/* Cycles Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-semibold text-white">Ciclos Históricos</h3>
          <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
            Dados consolidados de cycle_scores, nc_records e elogios
          </p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : cycles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: '#64748B' }}>
            <Clock size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Nenhum ciclo encontrado</p>
            <p className="text-xs mt-1 opacity-60">Importe dados para visualizar o histórico</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Ciclo', 'Status', 'Analistas', 'QA Médio', 'IEPC Médio', 'NCs', 'Elogios'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#94A3B8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cycles.map((cycle) => (
                <tr key={cycle.periodo} className="hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td className="px-4 py-3 font-semibold text-white">{cycle.label}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: cycle.status === 'ativo' ? 'rgba(56,189,248,0.1)' : 'rgba(148,163,184,0.1)',
                        color: cycle.status === 'ativo' ? '#38BDF8' : '#94A3B8',
                      }}
                    >
                      {cycle.status === 'ativo' ? 'Ativo' : 'Encerrado'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5" style={{ color: '#94A3B8' }}>
                      <Users size={12} />
                      {cycle.analysts}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span style={{ color: cycle.avgQA >= 85 ? '#22C55E' : cycle.avgQA >= 70 ? '#F59E0B' : cycle.avgQA > 0 ? '#EF4444' : '#64748B' }}>
                      {cycle.avgQA > 0 ? `${cycle.avgQA.toFixed(1)}%` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span style={{ color: cycle.avgIEPC >= 85 ? '#22C55E' : cycle.avgIEPC >= 70 ? '#F59E0B' : cycle.avgIEPC > 0 ? '#EF4444' : '#64748B' }}>
                      {cycle.avgIEPC > 0 ? `${cycle.avgIEPC.toFixed(1)}%` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span style={{ color: cycle.totalNCs > 10 ? '#EF4444' : cycle.totalNCs > 0 ? '#F59E0B' : '#94A3B8' }}>
                      {cycle.totalNCs}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span style={{ color: cycle.totalElogios > 0 ? '#22C55E' : '#94A3B8' }}>
                      {cycle.totalElogios}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

export default function HistoricoPage() {
  return (
    <EnterpriseLayout>
      <HistoricoContent />
    </EnterpriseLayout>
  );
}
