'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppImage from '@/components/ui/AppImage';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, BarChart3, ClipboardCheck, Upload, AlertTriangle, Award, History, FileText, Settings, ChevronLeft, ChevronRight, LogOut, Activity, UserSquare2, Zap, MessageSquare, GitBranch, Users, ChevronDown, ScrollText, ShieldAlert, BookOpen, Brain,  } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  color: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'EXECUTIVO',
    color: '#60A5FA',
    items: [
      { id: 'painel', label: 'Home Executiva', href: '/', icon: <LayoutDashboard size={14} /> },
      { id: 'analytics', label: 'Analytics Operacional', href: '/cycle-dashboard', icon: <BarChart3 size={14} /> },
    ],
  },
  {
    title: 'OPERAÇÃO',
    color: '#818CF8',
    items: [
      { id: 'ciclo-atual', label: 'Ciclo Atual', href: '/ciclo-atual', icon: <Activity size={14} /> },
      { id: 'ciclos', label: 'Gestão de Ciclos', href: '/ciclos', icon: <RefreshCw size={14} /> },
      { id: 'auditoria', label: 'Auditoria', href: '/auditoria', icon: <ClipboardCheck size={14} /> },
    ],
  },
  {
    title: 'QUALIDADE',
    color: '#34D399',
    items: [
      { id: 'qa-iepc', label: 'QA & IEPC', href: '/qa-iepc', icon: <Zap size={14} /> },
      { id: 'ncs', label: 'Não Conformidades', href: '/nao-conformidades', icon: <AlertTriangle size={14} /> },
      { id: 'reconhecimento', label: 'Reconhecimento', href: '/mural-elogios', icon: <Award size={14} /> },
    ],
  },
  {
    title: 'DESENVOLVIMENTO HUMANO',
    color: '#FBBF24',
    items: [
      { id: 'feedback', label: 'Gestão de Feedbacks', href: '/feedback', icon: <MessageSquare size={14} /> },
      { id: 'pdis', label: 'PDI', href: '/feedback/pdi', icon: <GitBranch size={14} /> },
      { id: 'gestao', label: 'Gestão de Pessoas', href: '/gestao', icon: <Users size={14} /> },
      { id: 'people-analytics', label: 'People Analytics', href: '/feedback/people-analytics', icon: <Brain size={14} /> },
      { id: 'advertencias', label: 'Advertências', href: '/advertencias', icon: <ShieldAlert size={14} /> },
    ],
  },
  {
    title: 'GOVERNANÇA',
    color: '#94A3B8',
    items: [
      { id: 'historico', label: 'Histórico', href: '/historico', icon: <History size={14} /> },
      { id: 'documentos', label: 'Documentos', href: '/documentos', icon: <FileText size={14} /> },
    ],
  },
  {
    title: 'BASE DE CONHECIMENTO',
    color: '#A78BFA',
    items: [
      { id: 'base-conhecimento', label: 'Base Notion', href: '/configuracoes?tab=notion', icon: <BookOpen size={14} />, adminOnly: true },
    ],
  },
  {
    title: 'ADMINISTRAÇÃO',
    color: '#64748B',
    items: [
      { id: 'configuracoes', label: 'Configurações', href: '/configuracoes', icon: <Settings size={14} />, adminOnly: true },
      { id: 'analistas', label: 'Analistas', href: '/analistas', icon: <UserSquare2 size={14} /> },
      { id: 'importacoes', label: 'Importações', href: '/importacoes', icon: <Upload size={14} /> },
      { id: 'admin-diagnostico', label: 'Logs & Diagnóstico', href: '/admin-diagnostico', icon: <ScrollText size={14} />, adminOnly: true },
    ],
  },
];

function getActiveSection(pathname: string): string {
  if (pathname === '/' || pathname.startsWith('/cycle-dashboard')) return 'EXECUTIVO';
  if (pathname.startsWith('/ciclo-atual') || pathname.startsWith('/auditoria')) return 'OPERAÇÃO';
  if (pathname.startsWith('/qa-iepc') || pathname.startsWith('/nao-conformidades') || pathname.startsWith('/mural-elogios')) return 'QUALIDADE';
  if (pathname.startsWith('/feedback') || pathname.startsWith('/gestao') || pathname.startsWith('/advertencias')) return 'DESENVOLVIMENTO HUMANO';
  if (pathname.startsWith('/documentos') || pathname.startsWith('/historico')) return 'GOVERNANÇA';
  if (pathname.startsWith('/configuracoes') || pathname.startsWith('/analistas') || pathname.startsWith('/importacoes') || pathname.startsWith('/admin-diagnostico')) return 'ADMINISTRAÇÃO';
  return 'EXECUTIVO';
}

function getActiveId(pathname: string, search?: string): string {
  if (pathname === '/') return 'painel';
  if (pathname.startsWith('/cycle-dashboard')) return 'analytics';
  if (pathname.startsWith('/ciclo-atual')) return 'ciclo-atual';
  if (pathname.startsWith('/auditoria')) return 'auditoria';
  if (pathname.startsWith('/qa-iepc')) return 'qa-iepc';
  if (pathname.startsWith('/nao-conformidades')) return 'ncs';
  if (pathname.startsWith('/mural-elogios')) return 'reconhecimento';
  if (pathname.startsWith('/feedback/pdi')) return 'pdis';
  if (pathname.startsWith('/feedback/people-analytics')) return 'people-analytics';
  if (pathname.startsWith('/feedback')) return 'feedback';
  if (pathname.startsWith('/gestao')) return 'gestao';
  if (pathname.startsWith('/advertencias')) return 'advertencias';
  if (pathname.startsWith('/historico')) return 'historico';
  if (pathname.startsWith('/documentos')) return 'documentos';
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
      style={{
        width: collapsed ? '64px' : '248px',
        backgroundColor: '#0C1220',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        zIndex: 40,
      }}
    >
      {/* ── Logo / Brand ── */}
      <div
        className="flex items-center gap-3 px-4 flex-shrink-0"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          minHeight: '72px',
        }}
      >
        <div
          className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #1E40AF, #3B82F6)' }}
        >
          <AppImage
            src="/assets/images/ChatGPT_Image_18_de_mai._de_2026_16_36_10-1779133005009.png"
            alt="QualiVisão logo"
            width={36}
            height={36}
            className="w-full h-full object-cover"
          />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white leading-tight" style={{ fontSize: '13px', letterSpacing: '0.1em' }}>
              QUALIVISÃO
            </p>
            <p className="font-medium" style={{ color: '#475569', fontSize: '10px', letterSpacing: '0.06em', marginTop: '1px' }}>
              Inteligência Operacional
            </p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="flex-shrink-0 p-1.5 rounded-md transition-all hover:bg-white/[0.05]"
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => !item.adminOnly || isAdmin);
          if (visibleItems.length === 0) return null;
          const isOpen = openSections[section.title] ?? false;
          const hasActive = visibleItems.some((item) => item.id === activeId);

          if (collapsed) {
            return (
              <div key={section.title} className="mb-1">
                <div className="my-1.5 mx-3 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
                {visibleItems.map((item) => {
                  const isActive = activeId === item.id;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      title={item.label}
                      className="flex items-center justify-center mx-2 p-2.5 rounded-md transition-all mb-0.5"
                      style={{
                        color: isActive ? section.color : 'rgba(255,255,255,0.3)',
                        backgroundColor: isActive ? `${section.color}14` : 'transparent',
                      }}
                    >
                      {item.icon}
                    </Link>
                  );
                })}
              </div>
            );
          }

          return (
            <div key={section.title} className="mb-0.5">
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-4 py-2 transition-all"
                style={{ color: hasActive ? section.color : 'rgba(255,255,255,0.25)' }}
              >
                <span className="text-[10px] font-bold tracking-widest">{section.title}</span>
                <ChevronDown
                  size={11}
                  className="transition-transform duration-200"
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>

              {isOpen && (
                <div className="pb-1">
                  {visibleItems.map((item) => {
                    const isActive = activeId === item.id;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="flex items-center gap-2.5 mx-2 px-3 py-2 rounded-md transition-all text-[13px] font-medium"
                        style={{
                          color: isActive ? '#F1F5F9' : 'rgba(255,255,255,0.45)',
                          backgroundColor: isActive ? `${section.color}16` : 'transparent',
                          borderLeft: isActive ? `2px solid ${section.color}` : '2px solid transparent',
                        }}
                      >
                        <span style={{ color: isActive ? section.color : 'rgba(255,255,255,0.3)' }}>{item.icon}</span>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── User Footer ── */}
      <div
        className="flex-shrink-0 p-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ backgroundColor: '#1E3A5F' }}
            >
              {displayAvatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{displayName}</p>
              {displayRole && <p className="text-[10px] truncate" style={{ color: '#475569' }}>{displayRole}</p>}
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-md transition-all hover:bg-white/[0.05]"
              style={{ color: 'rgba(255,255,255,0.2)' }}
              title="Sair"
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center w-full p-2 rounded-md transition-all hover:bg-white/[0.05]"
            style={{ color: 'rgba(255,255,255,0.2)' }}
            title="Sair"
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
    </aside>
  );
}
