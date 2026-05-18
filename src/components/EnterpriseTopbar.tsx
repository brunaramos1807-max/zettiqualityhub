'use client';
import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, ChevronRight } from 'lucide-react';
import { useSystemAuth } from '@/contexts/SystemAuthContext';

const ROUTE_LABELS: Record<string, string[]> = {
  '/': ['Executivo', 'Painel Executivo'],
  '/evolucao-geral': ['Executivo', 'Evolução'],
  '/cycle-dashboard': ['Executivo', 'Analytics'],
  '/ciclo-atual': ['Operação', 'Ciclo Atual'],
  '/ciclos': ['Operação', 'Ciclos'],
  '/auditoria': ['Operação', 'Auditoria'],
  '/importacoes': ['Operação', 'Importações'],
  '/nao-conformidades': ['Qualidade', 'Não Conformidades'],
  '/mural-elogios': ['Qualidade', 'Elogios'],
  '/pdis': ['Qualidade', 'PDIs'],
  '/calibragem': ['Qualidade', 'Calibragem'],
  '/historico': ['Governança', 'Histórico'],
  '/logs': ['Governança', 'Logs'],
  '/documentos': ['Governança', 'Documentos ISO'],
  '/gestao': ['Admin', 'Gestão'],
  '/configuracoes': ['Admin', 'Configurações'],
};

function getBreadcrumb(pathname: string): string[] {
  for (const [route, labels] of Object.entries(ROUTE_LABELS)) {
    if (route === '/' ? pathname === '/' : pathname.startsWith(route)) {
      return labels;
    }
  }
  return ['QUALIVISÃO'];
}

export default function EnterpriseTopbar() {
  const pathname = usePathname();
  const { session } = useSystemAuth();
  const breadcrumb = getBreadcrumb(pathname);
  const [notifOpen, setNotifOpen] = useState(false);

  const currentDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 flex-shrink-0"
      style={{
        backgroundColor: '#071426',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        minHeight: '56px',
      }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5">
        {breadcrumb.map((crumb, i) => (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.2)' }} />}
            <span
              className="text-sm font-medium"
              style={{
                color: i === breadcrumb.length - 1 ? '#F8FAFC' : 'rgba(255,255,255,0.35)',
                fontSize: i === 0 ? '11px' : '13px',
              }}
            >
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <span className="hidden md:block text-xs capitalize" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {currentDate}
        </span>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative p-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <Bell size={16} />
            <span
              className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: '#38BDF8' }}
            />
          </button>
          {notifOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-72 rounded-xl shadow-2xl z-50 py-2"
              style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-semibold text-white">Notificações</p>
              </div>
              <div className="px-4 py-6 text-center">
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Nenhuma notificação pendente</p>
              </div>
            </div>
          )}
        </div>

        {/* Role badge */}
        {session?.cargo && (
          <span
            className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}
          >
            {session.cargo}
          </span>
        )}
      </div>
    </header>
  );
}
