'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppImage from '@/components/ui/AppImage';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  RefreshCw,
  ClipboardCheck,
  Upload,
  AlertTriangle,
  Star,
  History,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Activity,
  UserSquare2,
  Zap,
  MessageSquare,
  GitBranch,
  Users,
  ChevronDown,
  Plug,
  ScrollText,
  ShieldAlert,
} from 'lucide-react';

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
    color: '#38BDF8',
    items: [
      { id: 'cockpit', label: 'Cockpit Executivo', href: '/', icon: <LayoutDashboard size={14} /> },
      {
        id: 'evolucao',
        label: 'Evolução & Tendências',
        href: '/evolucao-geral',
        icon: <TrendingUp size={14} />,
      },
    ],
  },
  {
    title: 'OPERAÇÕES',
    color: '#A78BFA',
    items: [
      {
        id: 'ciclos',
        label: 'Governança de Ciclos',
        href: '/ciclos',
        icon: <RefreshCw size={14} />,
      },
      {
        id: 'auditoria',
        label: 'Auditoria & Amostragem',
        href: '/auditoria',
        icon: <ClipboardCheck size={14} />,
      },
      {
        id: 'estrutura',
        label: 'Estrutura Operacional',
        href: '/suporte',
        icon: <Users size={14} />,
      },
    ],
  },
  {
    title: 'MEDIÇÃO',
    color: '#22C55E',
    items: [
      { id: 'qa-iepc', label: 'QA & IEPC Oficial', href: '/qa-iepc', icon: <Zap size={14} /> },
      {
        id: 'ncs',
        label: 'Não Conformidades',
        href: '/nao-conformidades',
        icon: <AlertTriangle size={14} />,
      },
      {
        id: 'calibragem',
        label: 'Calibragem de Métodos',
        href: '/calibragem',
        icon: <Activity size={14} />,
      },
    ],
  },
  {
    title: 'ANÁLISE & GESTÃO',
    color: '#FB923C',
    items: [
      {
        id: 'historico',
        label: 'Histórico & Séries',
        href: '/historico',
        icon: <History size={14} />,
      },
      {
        id: 'documentos',
        label: 'Conhecimento & POPs',
        href: '/documentos',
        icon: <FileText size={14} />,
      },
    ],
  },
  {
    title: 'ADMINISTRAÇÃO',
    color: '#64748B',
    items: [
      {
        id: 'importacoes',
        label: 'Ingestão de Dados',
        href: '/importacoes',
        icon: <Upload size={14} />,
      },
      {
        id: 'configuracoes',
        label: 'Configurações do SaaS',
        href: '/configuracoes',
        icon: <Settings size={14} />,
        adminOnly: true,
      },
      {
        id: 'admin-diagnostico',
        label: 'Saúde da Plataforma',
        href: '/admin-diagnostico',
        icon: <ScrollText size={14} />,
        adminOnly: true,
      },
    ],
  },
];

function getActiveSection(pathname: string): string {
  if (
    pathname === '/' ||
    pathname.startsWith('/evolucao-geral') ||
    pathname.startsWith('/cycle-dashboard')
  )
    return 'EXECUTIVO';
  if (
    pathname.startsWith('/ciclo-atual') ||
    pathname.startsWith('/ciclos') ||
    pathname.startsWith('/auditoria') ||
    pathname.startsWith('/suporte')
  )
    return 'OPERAÇÕES';
  if (
    pathname.startsWith('/qa-iepc') ||
    pathname.startsWith('/nao-conformidades') ||
    pathname.startsWith('/calibragem')
  )
    return 'MEDIÇÃO';
  if (pathname.startsWith('/documentos') || pathname.startsWith('/historico'))
    return 'ANÁLISE & GESTÃO';
  if (
    pathname.startsWith('/configuracoes') ||
    pathname.startsWith('/importacoes') ||
    pathname.startsWith('/admin-diagnostico')
  )
    return 'ADMINISTRAÇÃO';
  return 'EXECUTIVO';
}

function getActiveId(pathname: string): string {
  if (pathname === '/') return 'cockpit';
  if (pathname.startsWith('/evolucao-geral')) return 'evolucao';
  if (pathname.startsWith('/ciclos')) return 'ciclos';
  if (pathname.startsWith('/auditoria')) return 'auditoria';
  if (pathname.startsWith('/suporte')) return 'estrutura';
  if (pathname.startsWith('/qa-iepc')) return 'qa-iepc';
  if (pathname.startsWith('/nao-conformidades')) return 'ncs';
  if (pathname.startsWith('/calibragem')) return 'calibragem';
  if (pathname.startsWith('/documentos')) return 'documentos';
  if (pathname.startsWith('/historico')) return 'historico';
  if (pathname.startsWith('/admin-diagnostico')) return 'admin-diagnostico';
  if (pathname.startsWith('/configuracoes')) return 'configuracoes';
  if (pathname.startsWith('/importacoes')) return 'importacoes';
  return 'cockpit';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('');
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
    NAV_SECTIONS.forEach((s) => {
      initial[s.title] = s.title === activeSection;
    });
    return initial;
  });

  const displayName = systemSession?.nome || user?.email?.split('@')[0] || 'Usuário';
  const displayRole = systemSession?.cargo || '';
  const displayAvatar = getInitials(displayName);

  const handleSignOut = async () => {
    try {
      systemLogout();
      await signOut();
    } catch {
      /* ignore */
    }
  };

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 transition-all duration-300 flex-shrink-0"
      style={{
        width: collapsed ? '64px' : '256px',
        backgroundColor: '#060E1E',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        zIndex: 40,
      }}
    >
      {/* ── Logo / Brand ── */}
      <div
        className="flex items-center gap-3 px-4 flex-shrink-0"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          minHeight: '76px',
          background: 'linear-gradient(180deg, rgba(30,64,175,0.12) 0%, transparent 100%)',
        }}
      >
        <div
          className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #1E40AF, #0EA5E9)',
            boxShadow: '0 0 16px rgba(56,189,248,0.25), 0 2px 8px rgba(0,0,0,0.4)',
          }}
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
            <p
              className="font-black text-white leading-tight"
              style={{
                fontSize: '14px',
                letterSpacing: '0.18em',
                textShadow: '0 0 20px rgba(56,189,248,0.4)',
              }}
            >
              QUALIVISÃO
            </p>
            <p
              className="font-semibold"
              style={{
                color: 'rgba(56,189,248,0.6)',
                fontSize: '9.5px',
                letterSpacing: '0.12em',
                marginTop: '1px',
              }}
            >
              Gestão da Qualidade
            </p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="flex-shrink-0 p-1.5 rounded-lg transition-all hover:bg-white/[0.06]"
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => !item.adminOnly || isAdmin);
          if (visibleItems.length === 0) return null;
          const isOpen = openSections[section.title] ?? false;
          const hasActive = visibleItems.some((item) => item.id === activeId);

          if (collapsed) {
            return (
              <div key={section.title} className="mb-1">
                <div
                  className="my-2 mx-3 h-px"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                />
                {visibleItems.map((item) => {
                  const isActive = activeId === item.id;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      title={item.label}
                      className="flex items-center justify-center mx-2 p-2.5 rounded-lg transition-all mb-0.5"
                      style={{
                        color: isActive ? section.color : 'rgba(255,255,255,0.35)',
                        backgroundColor: isActive ? `${section.color}12` : 'transparent',
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
            <div key={section.title} className="mb-1">
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-4 py-2.5 transition-all hover:bg-white/[0.02] group"
              >
                <span
                  className="text-xs font-bold tracking-widest flex items-center gap-2"
                  style={{
                    color: hasActive ? section.color : 'rgba(255,255,255,0.2)',
                    fontSize: '9px',
                    transition: 'color 0.2s',
                  }}
                >
                  {hasActive && (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: section.color,
                        boxShadow: `0 0 6px ${section.color}`,
                      }}
                    />
                  )}
                  {section.title}
                </span>
                <span
                  style={{
                    color: 'rgba(255,255,255,0.15)',
                    transition: 'transform 0.2s',
                    transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                  }}
                >
                  <ChevronDown size={11} />
                </span>
              </button>

              {/* Items with smooth animation */}
              <div
                style={{
                  maxHeight: isOpen ? `${visibleItems.length * 44}px` : '0px',
                  overflow: 'hidden',
                  transition: 'max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <div className="pb-1.5">
                  {visibleItems.map((item) => {
                    const isActive = activeId === item.id;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="flex items-center gap-2.5 mx-2 px-3 py-2.5 rounded-lg transition-all text-sm font-medium group"
                        style={{
                          color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                          backgroundColor: isActive ? `${section.color}14` : 'transparent',
                          borderLeft: isActive
                            ? `2px solid ${section.color}`
                            : '2px solid transparent',
                          fontSize: '13px',
                          boxShadow: isActive ? `inset 0 0 20px ${section.color}06` : 'none',
                        }}
                      >
                        <span
                          className="flex-shrink-0 transition-colors"
                          style={{ color: isActive ? section.color : 'rgba(255,255,255,0.3)' }}
                        >
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                        {isActive && (
                          <span
                            className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: section.color,
                              boxShadow: `0 0 6px ${section.color}`,
                            }}
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── User section ── */}
      <div className="flex-shrink-0 p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {!collapsed ? (
          <div
            className="flex items-center gap-2.5 p-2.5 rounded-xl"
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
              style={{
                background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
                boxShadow: '0 2px 8px rgba(30,64,175,0.4)',
              }}
            >
              {displayAvatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {displayName}
              </p>
              {displayRole && (
                <p
                  className="text-xs truncate"
                  style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}
                >
                  {displayRole}
                </p>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/5 flex-shrink-0"
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
            <LogOut size={14} />
          </button>
        )}
      </div>
    </aside>
  );
}
