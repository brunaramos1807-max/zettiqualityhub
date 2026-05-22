'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppImage from '@/components/ui/AppImage';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, TrendingUp, BarChart3, RefreshCw, ClipboardCheck, Upload, AlertTriangle, Star, BookOpen, Sliders, History, ScrollText, FileText, Users, Settings, ChevronLeft, ChevronRight, LogOut, Activity, UserSquare2, Shield, Zap } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  roles?: string[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'EXECUTIVO',
    items: [
      { id: 'painel', label: 'Painel Executivo', href: '/', icon: <LayoutDashboard size={16} /> },
      { id: 'evolucao', label: 'Evolução', href: '/evolucao-geral', icon: <TrendingUp size={16} /> },
      { id: 'analytics', label: 'Analytics', href: '/cycle-dashboard', icon: <BarChart3 size={16} /> },
    ],
  },
  {
    title: 'OPERAÇÃO',
    items: [
      { id: 'ciclo-atual', label: 'Ciclo Atual', href: '/ciclo-atual', icon: <Activity size={16} /> },
      { id: 'ciclos', label: 'Ciclos', href: '/ciclos', icon: <RefreshCw size={16} /> },
      { id: 'auditoria', label: 'Auditoria', href: '/auditoria', icon: <ClipboardCheck size={16} /> },
      { id: 'importacoes', label: 'Importações', href: '/importacoes', icon: <Upload size={16} /> },
    ],
  },
  {
    title: 'QUALIDADE',
    items: [
      { id: 'qa-iepc', label: 'QA & IEPC 360°', href: '/qa-iepc', icon: <Zap size={16} /> },
      { id: 'ncs', label: 'Não Conformidades', href: '/nao-conformidades', icon: <AlertTriangle size={16} /> },
      { id: 'elogios', label: 'Elogios', href: '/mural-elogios', icon: <Star size={16} /> },
      { id: 'pdis', label: 'PDIs', href: '/pdis', icon: <BookOpen size={16} /> },
      { id: 'calibragem', label: 'Calibragem', href: '/calibragem', icon: <Sliders size={16} /> },
    ],
  },
  {
    title: 'GOVERNANÇA',
    items: [
      { id: 'historico', label: 'Histórico', href: '/historico', icon: <History size={16} /> },
      { id: 'logs', label: 'Logs', href: '/logs', icon: <ScrollText size={16} /> },
      { id: 'documentos', label: 'Documentos ISO', href: '/documentos', icon: <FileText size={16} /> },
    ],
  },
  {
    title: 'ADMIN',
    items: [
      { id: 'analistas', label: 'Analistas', href: '/analistas', icon: <UserSquare2 size={16} /> },
      { id: 'gestao', label: 'Gestão', href: '/gestao', icon: <Users size={16} />, adminOnly: true },
      { id: 'configuracoes', label: 'Configurações', href: '/configuracoes', icon: <Settings size={16} />, adminOnly: true },
      { id: 'admin-diagnostico', label: 'Logs & Diagnóstico', href: '/admin-diagnostico', icon: <Shield size={16} />, adminOnly: true },
    ],
  },
];

function getActiveId(pathname: string): string {
  if (pathname === '/') return 'painel';
  if (pathname.startsWith('/evolucao-geral')) return 'evolucao';
  if (pathname.startsWith('/cycle-dashboard')) return 'analytics';
  if (pathname.startsWith('/ciclo-atual')) return 'ciclo-atual';
  if (pathname.startsWith('/ciclos')) return 'ciclos';
  if (pathname.startsWith('/auditoria')) return 'auditoria';
  if (pathname.startsWith('/importacoes')) return 'importacoes';
  if (pathname.startsWith('/qa-iepc')) return 'qa-iepc';
  if (pathname.startsWith('/nao-conformidades')) return 'ncs';
  if (pathname.startsWith('/mural-elogios')) return 'elogios';
  if (pathname.startsWith('/pdis')) return 'pdis';
  if (pathname.startsWith('/calibragem')) return 'calibragem';
  if (pathname.startsWith('/historico')) return 'historico';
  if (pathname.startsWith('/logs')) return 'logs';
  if (pathname.startsWith('/documentos')) return 'documentos';
  if (pathname.startsWith('/analistas')) return 'analistas';
  if (pathname.startsWith('/gestao')) return 'gestao';
  if (pathname.startsWith('/admin-diagnostico')) return 'admin-diagnostico';
  if (pathname.startsWith('/configuracoes')) return 'configuracoes';
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
  const { session: systemSession, isAdmin, logout: systemLogout } = useSystemAuth();
  const { user, signOut } = useAuth();

  const displayName = systemSession?.nome || user?.email?.split('@')[0] || 'Usuário';
  const displayRole = systemSession?.cargo || '';
  const displayAvatar = getInitials(displayName);

  const handleSignOut = async () => {
    try {
      systemLogout();
      await signOut();
    } catch { /* ignore */ }
  };

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 transition-all duration-300 flex-shrink-0"
      style={{
        width: collapsed ? '64px' : '240px',
        backgroundColor: '#081120',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        zIndex: 40,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', minHeight: '72px' }}
      >
        <div
          className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: '#1E40AF' }}
        >
          <AppImage
            src="/assets/images/ChatGPT_Image_18_de_mai._de_2026_16_36_10-1779133005009.png"
            alt="QualiVisão logo"
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-white tracking-widest leading-tight" style={{ fontSize: '15px', letterSpacing: '0.12em' }}>QUALIVISÃO</p>
            <p className="font-medium" style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px', letterSpacing: '0.04em' }}>Enterprise Platform</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="flex-shrink-0 p-1 rounded-md transition-colors hover:bg-white/5"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => !item.adminOnly || isAdmin);
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title} className="mb-1">
              {!collapsed && (
                <p
                  className="px-4 py-1.5 text-xs font-semibold tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}
                >
                  {section.title}
                </p>
              )}
              {collapsed && <div className="my-2 mx-3 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />}
              {visibleItems.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className="flex items-center gap-3 mx-2 px-3 py-2 rounded-lg transition-all text-sm font-medium"
                    style={{
                      color: isActive ? '#38BDF8' : 'rgba(255,255,255,0.5)',
                      backgroundColor: isActive ? 'rgba(56,189,248,0.1)' : 'transparent',
                      borderLeft: isActive ? '2px solid #38BDF8' : '2px solid transparent',
                    }}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div
        className="flex-shrink-0 p-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        {!collapsed ? (
          <div
            className="flex items-center gap-2 p-2 rounded-lg"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
              style={{ backgroundColor: '#1E40AF' }}
            >
              {displayAvatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-tight">{displayName}</p>
              {displayRole && (
                <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px' }}>{displayRole}</p>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="p-1 rounded transition-colors hover:bg-white/5"
              style={{ color: '#EF4444' }}
              title="Sair"
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center p-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: '#EF4444' }}
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
