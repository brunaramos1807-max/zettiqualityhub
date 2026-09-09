'use client';
import React, { useEffect, useState } from 'react';
import { Activity, Clock, TrendingUp, Lock, Unlock, CheckCircle, ExternalLink } from 'lucide-react';
import {
  fetchCycleScores,
  fetchAllPeriodos,
  closeCycle,
  reopenCycle,
  fetchClosedCycles,
  isCycleClosed,
} from '@/lib/services/dataService';
import type { ClosedCycle } from '@/lib/services/dataService';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const darkCard: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '0.75rem',
  padding: '1rem',
};

export default function HeroCycleStatus() {
  const router = useRouter();
  const [periodo, setPeriodo] = useState<string | null>(null);
  const [totalAnalistas, setTotalAnalistas] = useState(0);
  const [auditor, setAuditor] = useState('—');
  const [closed, setClosed] = useState(false);
  const [closedCycles, setClosedCycles] = useState<ClosedCycle[]>([]);
  const [closing, setClosing] = useState(false);
  const [hasData, setHasData] = useState(false);

  const loadData = async () => {
    const periodos = await fetchAllPeriodos();
    const scores = await fetchCycleScores();

    if (periodos.length === 0 || scores.length === 0) {
      setHasData(false);
      setClosedCycles(fetchClosedCycles());
      return;
    }

    setHasData(true);
    // Use the most recent period
    const latestPeriodo = periodos[0];
    setPeriodo(latestPeriodo);

    const periodScores = scores.filter((s: any) => s.periodo === latestPeriodo);
    setTotalAnalistas(periodScores.length);

    const firstAuditor = periodScores.find((s: any) => s.auditor)?.auditor || '—';
    setAuditor(firstAuditor);

    setClosed(isCycleClosed(latestPeriodo));
    setClosedCycles(fetchClosedCycles());
  };

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('zetti_import_done', handler);
    return () => window.removeEventListener('zetti_import_done', handler);
  }, []);

  const handleCloseCycle = async () => {
    if (!periodo) return;
    setClosing(true);
    const result = await closeCycle(periodo);
    if (result.success) {
      setClosed(true);
      setClosedCycles(fetchClosedCycles());
      toast.success(`Ciclo ${periodo} fechado com sucesso!`);
      window.dispatchEvent(new CustomEvent('zetti_import_done'));
    } else {
      toast.error('Erro ao fechar ciclo');
    }
    setClosing(false);
  };

  const handleReopenCycle = () => {
    if (!periodo) return;
    reopenCycle(periodo);
    setClosed(false);
    setClosedCycles(fetchClosedCycles());
    toast.success(`Ciclo ${periodo} reaberto`);
    window.dispatchEvent(new CustomEvent('zetti_import_done'));
  };

  // No data state
  if (!hasData) {
    return (
      <div className="space-y-4">
        <div
          className="relative rounded-2xl p-8 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1E3A5F 0%, #1E40AF 60%, #1D4ED8 100%)',
            border: '1px solid rgba(30,64,175,0.3)',
          }}
        >
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8B949E' }} />
              <span
                className="text-xs font-medium uppercase tracking-widest"
                style={{ color: '#8B949E' }}
              >
                Sem Ciclo Ativo
              </span>
            </div>
            <h1
              className="font-display text-3xl font-bold text-white mb-1"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Bem-vindo ao Portal de Qualidade
            </h1>
            <p className="text-base" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Importe uma planilha para iniciar o ciclo
            </p>
          </div>
        </div>

        {/* Show closed cycles summary if any */}
        {closedCycles.length > 0 && (
          <div className="space-y-3">
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: '#8B949E' }}
            >
              Ciclos Fechados
            </p>
            {closedCycles.map((cc) => (
              <ClosedCycleBanner
                key={cc.id}
                cycle={cc}
                onOpen={(p) => router.push(`/cycle-dashboard?periodo=${encodeURIComponent(p)}`)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="relative rounded-2xl p-8 overflow-hidden"
        style={{
          background: closed
            ? 'linear-gradient(135deg, #1a2a1a 0%, #14532d 60%, #166534 100%)'
            : 'linear-gradient(135deg, #1E3A5F 0%, #1E40AF 60%, #1D4ED8 100%)',
          border: `1px solid ${closed ? 'rgba(34,197,94,0.3)' : 'rgba(30,64,175,0.3)'}`,
        }}
      >
        {/* Background decorative elements */}
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5"
          style={{
            background: 'radial-gradient(circle, #2B4F81, transparent)',
            transform: 'translate(30%, -30%)',
          }}
        />
        <div
          className="absolute bottom-0 left-1/2 w-96 h-32 opacity-5"
          style={{ background: 'radial-gradient(ellipse, #22C55E, transparent)' }}
        />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left: Welcome */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2 h-2 rounded-full animate-pulse-subtle"
                style={{ backgroundColor: closed ? '#22C55E' : '#22C55E' }}
              />
              <span
                className="text-xs font-medium uppercase tracking-widest"
                style={{ color: '#22C55E' }}
              >
                {closed ? 'Ciclo Fechado' : 'Ciclo Ativo'}
              </span>
              {closed && (
                <span
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: 'rgba(34,197,94,0.15)',
                    color: '#22C55E',
                    border: '1px solid rgba(34,197,94,0.3)',
                  }}
                >
                  <CheckCircle size={10} />
                  Encerrado
                </span>
              )}
            </div>
            <h1
              className="font-display text-3xl font-bold text-white mb-1"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Bem-vindo ao Portal de Qualidade
            </h1>
            <p className="text-base" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Ciclo <span className="text-white font-medium">{periodo}</span> — {totalAnalistas}{' '}
              analistas
            </p>
          </div>

          {/* Right: Cycle info + actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Stats row */}
            <div className="flex gap-3">
              {[
                {
                  icon: Activity,
                  label: 'Analistas',
                  value: String(totalAnalistas),
                  color: '#22C55E',
                },
                { icon: Clock, label: 'Período', value: periodo || '—', color: '#EAB308' },
                { icon: TrendingUp, label: 'Auditor', value: auditor, color: '#60A5FA' },
              ].map((stat) => (
                <div
                  key={`hero-stat-${stat.label}`}
                  style={{
                    ...darkCard,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    minWidth: '7rem',
                  }}
                >
                  <stat.icon size={16} style={{ color: stat.color }} />
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {stat.label}
                  </p>
                  <p className="text-sm font-semibold text-white metric-value">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              {/* View full cycle button */}
              {periodo && (
                <button
                  onClick={() =>
                    router.push(`/cycle-dashboard?periodo=${encodeURIComponent(periodo)}`)
                  }
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: 'rgba(59,130,246,0.15)',
                    border: '1px solid rgba(59,130,246,0.4)',
                    color: '#60A5FA',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <ExternalLink size={14} />
                  Ver Ciclo Completo
                </button>
              )}

              {/* Fechar / Reabrir Ciclo button */}
              {!closed ? (
                <button
                  onClick={handleCloseCycle}
                  disabled={closing}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
                  style={{
                    backgroundColor: 'rgba(34,197,94,0.15)',
                    border: '1px solid rgba(34,197,94,0.4)',
                    color: '#22C55E',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Lock size={14} />
                  {closing ? 'Fechando...' : 'Fechar Ciclo'}
                </button>
              ) : (
                <button
                  onClick={handleReopenCycle}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: 'rgba(234,179,8,0.15)',
                    border: '1px solid rgba(234,179,8,0.4)',
                    color: '#EAB308',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Unlock size={14} />
                  Reabrir Ciclo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Closed cycles summary */}
      {closedCycles.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#8B949E' }}>
            Ciclos Fechados
          </p>
          {closedCycles.map((cc) => (
            <ClosedCycleBanner
              key={cc.id}
              cycle={cc}
              onOpen={(p) => router.push(`/cycle-dashboard?periodo=${encodeURIComponent(p)}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClosedCycleBanner({
  cycle,
  onOpen,
}: {
  cycle: ClosedCycle;
  onOpen: (periodo: string) => void;
}) {
  const closedDate = new Date(cycle.closed_at).toLocaleDateString('pt-BR');
  return (
    <div
      className="rounded-xl p-4 flex flex-wrap items-center gap-4 cursor-pointer transition-all"
      style={{ backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}
      onClick={() => onOpen(cycle.periodo)}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(34,197,94,0.5)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(34,197,94,0.2)')}
    >
      <div className="flex items-center gap-2 flex-shrink-0">
        <CheckCircle size={16} style={{ color: '#22C55E' }} />
        <span className="text-sm font-semibold text-white">Ciclo {cycle.periodo}</span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22C55E' }}
        >
          Fechado em {closedDate}
        </span>
      </div>
      <div className="flex flex-wrap gap-4 text-xs" style={{ color: '#8B949E' }}>
        <span>
          <span className="text-white font-semibold">{cycle.summary.totalAnalistas}</span> analistas
        </span>
        <span>
          QA Média:{' '}
          <span className="text-white font-semibold">{cycle.summary.qaMedia.toFixed(2)}</span>
        </span>
        <span>
          IEPC Médio:{' '}
          <span className="text-white font-semibold">{cycle.summary.iepcMedia.toFixed(2)}</span>
        </span>
        <span>
          NCs: <span className="text-white font-semibold">{cycle.summary.totalNCs}</span>
        </span>
        <span>
          Elogios: <span className="text-white font-semibold">{cycle.summary.totalElogios}</span>
        </span>
      </div>
      <div className="ml-auto flex items-center gap-1 text-xs" style={{ color: '#60A5FA' }}>
        <ExternalLink size={12} />
        <span>Ver detalhes</span>
      </div>
    </div>
  );
}
