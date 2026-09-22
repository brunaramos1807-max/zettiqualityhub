import React from 'react';
import Link from 'next/link';
import {
  BarChart2,
  TrendingUp,
  AlertTriangle,
  ThumbsUp,
  ClipboardCheck,
  History,
  ArrowRight,
} from 'lucide-react';

const SHORTCUTS = [
  {
    id: 'shortcut-dashboard',
    label: 'Dashboard do Ciclo',
    description: 'KPIs, rankings e pilares do ciclo atual',
    icon: BarChart2,
    href: '/cycle-dashboard',
    color: '#60A5FA',
    bg: 'rgba(96,165,250,0.08)',
  },
  {
    id: 'shortcut-evolucao',
    label: 'Evolução Geral',
    description: 'Tendências históricas e insights',
    icon: TrendingUp,
    href: '/evolucao-geral',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.08)',
  },
  {
    id: 'shortcut-ncs',
    label: 'Não Conformidades',
    description: 'Auditoria completa de NCs do ciclo',
    icon: AlertTriangle,
    href: '/nao-conformidades',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.08)',
  },
  {
    id: 'shortcut-elogios',
    label: 'Elogios',
    description: 'Mural de reconhecimento da equipe',
    icon: ThumbsUp,
    href: '/mural-elogios',
    color: '#EAB308',
    bg: 'rgba(234,179,8,0.08)',
  },
  {
    id: 'shortcut-auditoria',
    label: 'Gestão de Auditoria',
    description: 'Controle operacional de interações',
    icon: ClipboardCheck,
    href: '/auditoria',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.08)',
  },
  {
    id: 'shortcut-historico',
    label: 'Histórico',
    description: 'Ciclos anteriores e dados históricos',
    icon: History,
    href: '/historico',
    color: '#8B949E',
    bg: 'rgba(139,148,158,0.08)',
  },
];

export default function NavigationShortcuts() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3
          className="font-display text-base font-semibold text-white"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Painel de Atalhos
        </h3>
        <p className="text-xs" style={{ color: '#8B949E' }}>
          Acesso rápido às seções do portal
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-6 gap-3">
        {SHORTCUTS?.map((shortcut) => (
          <Link
            key={shortcut?.id}
            href={shortcut?.href}
            className="group rounded-xl p-4 transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg flex flex-col gap-3"
            style={{ backgroundColor: shortcut?.bg, border: `1px solid ${shortcut?.color}22` }}
          >
            <shortcut.icon size={22} style={{ color: shortcut?.color }} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white leading-tight mb-1">
                {shortcut?.label}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: '#8B949E' }}>
                {shortcut?.description}
              </p>
            </div>
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-1"
              style={{ color: shortcut?.color }}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
