'use client';
import React, { useState, useEffect, useMemo } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, TrendingDown, Star, Award, Search, RefreshCw, Activity, Minus, X, BarChart2, BookOpen, Phone, Clock, UserCheck, UserPlus, Gift, ChevronRight } from 'lucide-react';

// --- Interfaces e Funções Auxiliares permanecem as mesmas ---
interface AnalistaGestao {
  id: string;
  analista_id?: string;
  nome: string;
  nome_completo?: string;
  cargo_operacional?: string;
  squad?: string;
  equipe?: string;
  coordenador?: string;
  email?: string;
  telefone?: string;
  data_admissao?: string;
  data_nascimento?: string;
  ultima_promocao?: string;
  status?: string;
  avgQA: number;
  avgIEPC: number;
  totalNCs: number;
  ciclos: number;
  lastQA: number;
  lastIEPC: number;
  trend: 'up' | 'down' | 'stable';
  risco: 'alto' | 'medio' | 'baixo';
  ranking: number;
  tempoEmpresa: string;
  mesesEmpresa: number;
  pdiAtivo: boolean;
  reincidencia: number;
  scores: { periodo: string; qa: number; iepc: number }[];
}

function calcTempoEmpresa(dataAdmissao?: string): { label: string; meses: number } {
  if (!dataAdmissao) return { label: '—', meses: 0 };
  try {
    const admissao = new Date(dataAdmissao + 'T00:00:00');
    const hoje = new Date();
    const meses = (hoje.getFullYear() - admissao.getFullYear()) * 12 + (hoje.getMonth() - admissao.getMonth());
    if (meses < 1) return { label: 'Menos de 1 mês', meses: 0 };
    if (meses < 12) return { label: `${meses} mês${meses !== 1 ? 'es' : ''}`, meses };
    const anos = Math.floor(meses / 12);
    const resto = meses % 12;
    const label = resto > 0 ? `${anos} ano${anos !== 1 ? 's' : ''} e ${resto} mês${resto !== 1 ? 'es' : ''}` : `${anos} ano${anos !== 1 ? 's' : ''}`;
    return { label, meses };
  } catch { return { label: '—', meses: 0 }; }
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#22C55E';
  if (score >= 75) return '#84CC16';
  if (score >= 60) return '#EAB308';
  if (score >= 45) return '#F97316';
  return '#EF4444';
}

function getStatusColor(status?: string): string {
  if (status === 'ativo') return '#22C55E';
  if (status === 'ferias') return '#EAB308';
  if (status === 'afastado') return '#F97316';
  if (status === 'desligado') return '#EF4444';
  return '#94A3B8';
}

function getStatusLabel(status?: string): string {
  if (status === 'ativo') return 'Ativo';
  if (status === 'ferias') return 'Férias';
  if (status === 'afastado') return 'Afastado';
  if (status === 'desligado') return 'Desligado';
  return status || '—';
}

function getBirthdayMonth(dataNascimento?: string): number | null {
  if (!dataNascimento) return null;
  try { return new Date(dataNascimento + 'T00:00:00').getMonth(); } catch { return null; }
}

function formatBirthday(dataNascimento?: string): string {
  if (!dataNascimento) return '—';
  try {
    const d = new Date(dataNascimento + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  } catch { return '—'; }
}

// --- Componentes (AnalystDetailDrawer, AnalystCard, BirthdayWidget, CompanyTimeRanking) ---
// (Mantenha os componentes como estavam no código que funcionava)

function GestaoContent() {
  const [analistas, setAnalistas] = useState<AnalistaGestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEquipe, setFilterEquipe] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState<'nome' | 'tempo' | 'aniversario' | 'pdi'>('nome');
  const [selectedAnalista, setSelectedAnalista] = useState<AnalistaGestao | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;

      const { data: analistasData } = await supabase.from('analistas').select('*').order('nome');
      const { data: scoresData } = await supabase.from('cycle_scores').select('analista, periodo, nota_final_qa, iepc_total, total_ncs').order('periodo');
      const { data: pdisData } = await supabase.from('pdi_records').select('analista, status').eq('status', 'ativo');

      const analistasList = analistasData || [];
      const scores = scoresData || [];
      const pdis = new Set((pdisData || []).map((p: any) => (p.analista || '').toLowerCase().trim()));

      const computed: AnalistaGestao[] = analistasList.map((a: any) => {
        const nomeLower = (a.nome_completo || a.nome || '').toLowerCase().trim();
        const analistaScores = scores.filter((s: any) => (s.analista || '').toLowerCase().includes(a.nome.toLowerCase()));
        
        const avgQA = analistaScores.length > 0 ? analistaScores.reduce((sum: number, s: any) => sum + (s.nota_final_qa || 0), 0) / analistaScores.length : 0;
        const avgIEPC = analistaScores.length > 0 ? analistaScores.reduce((sum: number, s: any) => sum + (s.iepc_total || 0), 0) / analistaScores.length : 0;
        const totalNCs = analistaScores.reduce((sum: number, s: any) => sum + (s.total_ncs || 0), 0);
        
        const { label: tempoLabel, meses: mesesEmpresa } = calcTempoEmpresa(a.data_admissao);

        return {
          id: a.id,
          nome: a.nome,
          cargo_operacional: a.cargo_operacional,
          squad: a.squad,
          coordenador: a.coordenador,
          status: a.status,
          avgQA, avgIEPC, totalNCs, ciclos: analistaScores.length,
          tempoEmpresa: tempoLabel, mesesEmpresa, pdiAtivo: pdis.has(nomeLower),
          scores: analistaScores.map((s: any) => ({ periodo: s.periodo, qa: s.nota_final_qa, iepc: s.iepc_total }))
        } as AnalistaGestao;
      });

      setAnalistas(computed);
    } catch (e) {
      console.error('Erro na Gestão:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ... (mantenha a lógica de filters, stats, return JSX iguais ao que você tinha)
  return (
    <EnterpriseLayout>
        {/* Conteúdo funcional que você tinha */}
    </EnterpriseLayout>
  );
}

export default function GestaoPage() { return <EnterpriseLayout><GestaoContent /></EnterpriseLayout>; }