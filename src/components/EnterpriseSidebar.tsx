'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppImage from '@/components/ui/AppImage';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, TrendingUp, BarChart3, RefreshCw, ClipboardCheck, Upload, AlertTriangle, Star, History, FileText, Settings, ChevronLeft, ChevronRight, LogOut, Activity, UserSquare2, Zap, MessageSquare, GitBranch, Users, ChevronDown, ChevronUp, Plug, ScrollText, ShieldAlert,  } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  emoji: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'EXECUTIVO',
    emoji: '◆',
    items: [
      { id: 'painel', label: 'Painel Executivo', href: '/', icon: <LayoutDashboard size={15} /> },
      { id: 'evolucao', label: 'Evolução', href: '/evolucao-geral', icon: <TrendingUp size={15} /> },
      { id: 'analytics', label: 'Analytics', href: '/cycle-dashboard', icon: <BarChart3 size={15} /> },
    ],
  },
  {
    title: 'OPERAÇÃO',
    emoji: '◆',
    items: [
      { id: 'ciclo-atual', label: 'Ciclo Atual', href: '/ciclo-atual', icon: <Activity size={15} /> },
      { id: 'ciclos', label: 'Ciclos', href: '/ciclos', icon: <RefreshCw size={15} /> },
      { id: 'auditoria', label: 'Auditoria', href: '/auditoria', icon: <ClipboardCheck size={15} /> },
    ],
  },
  {
    title: 'QUALIDADE',
    emoji: '◆',
    items: [
      { id: 'qa-iepc', label: 'QA & IEPC 360°', href: '/qa-iepc', icon: <Zap size={15} /> },
      { id: 'ncs', label: 'Não Conformidades', href: '/nao-conformidades', icon: <AlertTriangle size={15} /> },
      { id: 'elogios', label: 'Elogios', href: '/mural-elogios', icon: <Star size={15} /> },
    ],
  },
  {
    title: 'DESENVOLVIMENTO HUMANO',
    emoji: '◆',
    items: [
      { id: 'feedback', label: 'Feedback', href: '/feedback', icon: <MessageSquare size={15} /> },
      { id: 'feedback-pdi', label: 'Plano de Desenvolvimento', href: '/feedback/pdi', icon: <GitBranch size={15} /> },
      { id: 'gestao', label: 'Gestão de Pessoas', href: '/gestao', icon: <Users size={15} /> },
      { id: 'advertencias', label: 'Advertências', href: '/advertencias', icon: <ShieldAlert size={15} /> },
    ],
  },
  {
    title: 'GOVERNANÇA',
    emoji: '◆',
    items: [
      { id: 'documentos', label: 'Documentos', href: '/documentos', icon: <FileText size={15} /> },
      { id: 'historico', label: 'Histórico', href: '/historico', icon: <History size={15} /> },
    ],
  },
  {
    title: 'ADMIN',
    emoji: '◆',
    items: [
      { id: 'configuracoes', label: 'Configurações', href: '/configuracoes', icon: <Settings size={15} />, adminOnly: true },
      { id: 'analistas', label: 'Analistas', href: '/analistas', icon: <UserSquare2 size={15} /> },
      { id: 'integracoes', label: 'Integrações', href: '/configuracoes', icon: <Plug size={15} />, adminOnly: true },
      { id: 'importacoes', label: 'Importações', href: '/importacoes', icon: <Upload size={15} /> },
      { id: 'admin-diagnostico', label: 'Logs & Diagnóstico', href: '/admin-diagnostico', icon: <ScrollText size={15} />, adminOnly: true },
    ],
  },
];

function getActiveSection(pathname: string): string {
  if (pathname === '/' || pathname.startsWith('/evolucao-geral') || pathname.startsWith('/cycle-dashboard')) return 'EXECUTIVO';
  if (pathname.startsWith('/ciclo-atual') || pathname.startsWith('/ciclos') || pathname.startsWith('/auditoria')) return 'OPERAÇÃO';
  if (pathname.startsWith('/qa-iepc') || pathname.startsWith('/nao-conformidades') || pathname.startsWith('/mural-elogios')) return 'QUALIDADE';
  if (pathname.startsWith('/feedback') || pathname.startsWith('/gestao') || pathname.startsWith('/advertencias')) return 'DESENVOLVIMENTO HUMANO';
  if (pathname.startsWith('/documentos') || pathname.startsWith('/historico')) return 'GOVERNANÇA';
  if (pathname.startsWith('/configuracoes') || pathname.startsWith('/analistas') || pathname.startsWith('/importacoes') || pathname.startsWith('/admin-diagnostico')) return 'ADMIN';
  return 'EXECUTIVO';
}

function getActiveId(pathname: string): string {
  if (pathname === '/') return 'painel';
  if (pathname.startsWith('/evolucao-geral')) return 'evolucao';
  if (pathname.startsWith('/cycle-dashboard')) return 'analytics';
  if (pathname.startsWith('/ciclo-atual')) return 'ciclo-atual';
  if (pathname.startsWith('/ciclos')) return 'ciclos';
  if (pathname.startsWith('/auditoria')) return 'auditoria';
  if (pathname.startsWith('/qa-iepc')) return 'qa-iepc';
  if (pathname.startsWith('/nao-conformidades')) return 'ncs';
  if (pathname.startsWith('/mural-elogios')) return 'elogios';
  if (pathname.startsWith('/feedback/pdi')) return 'feedback-pdi';
  if (pathname.startsWith('/feedback')) return 'feedback';
  if (pathname.startsWith('/gestao')) return 'gestao';
  if (pathname.startsWith('/advertencias')) return 'advertencias';
  if (pathname.startsWith('/documentos')) return 'documentos';
  if (pathname.startsWith('/historico')) return 'historico';
  if (pathname.startsWith('/analistas')) return 'analistas';
  if (pathname.startsWith('/admin-diagnostico')) return 'admin-diagnostico';
  if (pathname.startsWith('/configuracoes')) return 'configuracoes';
  if (pathname.startsWith('/importacoes')) return 'importacoes';
  return 'painel';
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase() || '').join('');
}

interface EnterpriseSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function EnterpriseSidebar({ collapsed = false, onToggle }: EnterpriseSidebarProps) {
  const pathname = usePathname();
  const activeId = getActiveId(pathname);
  const activeSection = getActiveSection(pathname);
  const { session: systemSession, isAdmin, logout: systemLogout } = useSystemAuth();
  const { user, signOut } = useAuth();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_SECTIONS.forEach((s) => { initial[s.title] = s.title === activeSection; });
    return initial;
  });

  const displayName = systemSession?.nome || user?.email?.split('@')[0] || 'Usuário';
  const displayRole = systemSession?.cargo || '';
  const displayAvatar = getInitials(displayName);

  const handleSignOut = async () => {
    try { systemLogout(); await signOut(); } catch { /* ignore */ }
  };

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 transition-all duration-300 flex-shrink-0"
      style={{ width: collapsed ? '64px' : '248px', backgroundColor: '#060E1E', borderRight: '1px solid rgba(255,255,255,0.05)', zIndex: 40 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', minHeight: '68px' }}>
        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#1E40AF' }}>
          <AppImage src="/assets/images/ChatGPT_Image_18_de_mai._de_2026_16_36_10-1779133005009.png" alt="QualiVisão logo" width={36} height={36} className="w-full h-full object-cover" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-white tracking-widest leading-tight" style={{ fontSize: '13px', letterSpacing: '0.14em' }}>QUALIVISÃO</p>
            <p className="font-medium" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '0.04em' }}>People Analytics</p>
          </div>
        )}
        <button onClick={onToggle} className="flex-shrink-0 p-1 rounded-md transition-colors hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => !item.adminOnly || isAdmin);
          if (visibleItems.length === 0) return null;
          const isOpen = openSections[section.title] ?? false;
          const hasActive = visibleItems.some((item) => item.id === activeId);

          if (collapsed) {
            return (
              <div key={section.title} className="mb-1">
                <div className="my-1.5 mx-3 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
                {visibleItems.map((item) => {
                  const isActive = activeId === item.id;
                  return (
                    <Link key={item.id} href={item.href} title={item.label}
                      className="flex items-center justify-center mx-2 p-2.5 rounded-lg transition-all"
                      style={{ color: isActive ? '#38BDF8' : 'rgba(255,255,255,0.4)', backgroundColor: isActive ? 'rgba(56,189,248,0.1)' : 'transparent' }}>
                      {item.icon}
                    </Link>
                  );
                })}
              </div>
            );
          }

          return (
            <div key={section.title} className="mb-0.5">
              {/* Section header — accordion toggle */}
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-4 py-2 transition-colors hover:bg-white/[0.02]"
              >
                <span className="text-xs font-bold tracking-widest flex items-center gap-1.5"
                  style={{ color: hasActive ? 'rgba(56,189,248,0.7)' : 'rgba(255,255,255,0.22)', fontSize: '9.5px' }}>
                  {section.title}
                </span>
                {isOpen
                  ? <ChevronUp size={11} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  : <ChevronDown size={11} style={{ color: 'rgba(255,255,255,0.2)' }} />}
              </button>

              {/* Items */}
              {isOpen && (
                <div className="pb-1">
                  {visibleItems.map((item) => {
                    const isActive = activeId === item.id;
                    return (
                      <Link key={item.id} href={item.href}
                        className="flex items-center gap-2.5 mx-2 px-3 py-2 rounded-lg transition-all text-sm font-medium"
                        style={{
                          color: isActive ? '#38BDF8' : 'rgba(255,255,255,0.48)',
                          backgroundColor: isActive ? 'rgba(56,189,248,0.09)' : 'transparent',
                          borderLeft: isActive ? '2px solid #38BDF8' : '2px solid transparent',
                          fontSize: '13px',
                        }}>
                        <span className="flex-shrink-0" style={{ opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className="flex-shrink-0 p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {!collapsed ? (
          <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white" style={{ backgroundColor: '#1E40AF' }}>
              {displayAvatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-tight">{displayName}</p>
              {displayRole && <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{displayRole}</p>}
            </div>
            <button onClick={handleSignOut} className="p-1 rounded transition-colors hover:bg-white/5" style={{ color: '#EF4444' }} title="Sair">
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <button onClick={handleSignOut} className="w-full flex items-center justify-center p-2 rounded-lg transition-colors hover:bg-white/5" style={{ color: '#EF4444' }} title="Sair">
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
