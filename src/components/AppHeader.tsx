'use client';
import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppImage from '@/components/ui/AppImage';
import {
  Upload,
  Bell,
  ChevronDown,
  BarChart2,
  TrendingUp,
  ClipboardCheck,
  AlertTriangle,
  Star,
  Clock,
  FileUp,
  FolderOpen,
  Home,
  LogOut,
  Users,
  Shield,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemAuth } from '@/contexts/SystemAuthContext';

interface AppHeaderProps {
  onImportClick?: () => void;
  userName?: string;
  userRole?: string;
  userAvatar?: string;
  activeTab?: string;
}

interface TabDef {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  group: string;
  adminOnly?: boolean;
}

const TABS: TabDef[] = [
  { id: 'home', label: 'Painel Executivo', href: '/', icon: <Home size={13} />, group: 'VISÃO' },
  {
    id: 'ultimo-ciclo',
    label: 'Último Ciclo',
    href: '/cycle-dashboard',
    icon: <BarChart2 size={13} />,
    group: 'VISÃO',
  },
  {
    id: 'ciclo-atual',
    label: 'Ciclo Atual',
    href: '/ciclo-atual',
    icon: <Activity size={13} />,
    group: 'VISÃO',
  },
  {
    id: 'evolucao',
    label: 'Evolução',
    href: '/evolucao-geral',
    icon: <TrendingUp size={13} />,
    group: 'VISÃO',
  },
  {
    id: 'auditoria',
    label: 'Auditoria',
    href: '/auditoria',
    icon: <ClipboardCheck size={13} />,
    group: 'OPERAÇÃO',
  },
  {
    id: 'ncs',
    label: 'Não Conformidades',
    href: '/nao-conformidades',
    icon: <AlertTriangle size={13} />,
    group: 'OPERAÇÃO',
  },
  {
    id: 'elogios',
    label: 'Elogios',
    href: '/mural-elogios',
    icon: <Star size={13} />,
    group: 'OPERAÇÃO',
  },
  {
    id: 'historico',
    label: 'Histórico',
    href: '/historico',
    icon: <Clock size={13} />,
    group: 'HISTÓRICO',
  },
  {
    id: 'importacoes',
    label: 'Importações',
    href: '/importacoes',
    icon: <FileUp size={13} />,
    group: 'DADOS',
  },
  {
    id: 'documentos',
    label: 'Documentos',
    href: '/documentos',
    icon: <FolderOpen size={13} />,
    group: 'DADOS',
  },
  {
    id: 'gestao',
    label: 'Gestão',
    href: '/gestao',
    icon: <Users size={13} />,
    group: 'ADMIN',
    adminOnly: true,
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    href: '/configuracoes',
    icon: <Shield size={13} />,
    group: 'ADMIN',
    adminOnly: true,
  },
];

const GROUP_ORDER = ['VISÃO', 'OPERAÇÃO', 'HISTÓRICO', 'DADOS', 'ADMIN'];

function getActiveTabFromPath(pathname: string): string {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/cycle-dashboard')) return 'ultimo-ciclo';
  if (pathname.startsWith('/ciclo-atual')) return 'ciclo-atual';
  if (pathname.startsWith('/evolucao-geral')) return 'evolucao';
  if (pathname.startsWith('/auditoria')) return 'auditoria';
  if (pathname.startsWith('/nao-conformidades')) return 'ncs';
  if (pathname.startsWith('/mural-elogios')) return 'elogios';
  if (pathname.startsWith('/historico')) return 'historico';
  if (pathname.startsWith('/importacoes')) return 'importacoes';
  if (pathname.startsWith('/documentos')) return 'documentos';
  if (pathname.startsWith('/gestao')) return 'gestao';
  if (pathname.startsWith('/admin-config')) return 'admin';
  if (pathname.startsWith('/configuracoes')) return 'configuracoes';
  return 'home';
}

function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('');
}

export default function AppHeader({
  onImportClick,
  userName: userNameProp,
  userRole: userRoleProp,
  userAvatar: userAvatarProp,
}: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = getActiveTabFromPath(pathname);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [, startTransition] = useTransition();

  const { user, userProfile, signOut } = useAuth();
  const { session: systemSession, isAdmin: systemIsAdmin, logout: systemLogout } = useSystemAuth();

  const displayName =
    systemSession?.nome ||
    userProfile?.full_name ||
    userNameProp ||
    user?.email?.split('@')[0] ||
    'Usuário';
  const displayRole = systemSession?.cargo || userProfile?.role || userRoleProp || '';
  const displayAvatar = userAvatarProp || getInitials(displayName);

  const isAdmin = systemIsAdmin || displayRole === 'Admin';
  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  const handleSignOut = async () => {
    try {
      systemLogout();
      await signOut();
    } catch {
      // ignore
    }
  };

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    if (href === pathname) {
      e.preventDefault();
      return;
    }
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <header
      className="sticky top-0 z-50"
      style={{ backgroundColor: '#0F172A', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Top bar */}
      <div className="px-6 py-2.5 flex items-center justify-between">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: '#1E40AF' }}
          >
            <AppImage
              src="/assets/images/5f5559140_ChatGPTImage27deabrde202616_50_50-1777926706123.png"
              alt="QualiVisão logo"
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden md:block min-w-0">
            <h1 className="text-sm font-bold text-white leading-tight tracking-wide">QUALIVISÃO</h1>
            <p
              className="text-xs"
              style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.02em' }}
            >
              qualivisao.tec.br
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onImportClick && (
            <button
              onClick={onImportClick}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all"
              style={{ backgroundColor: '#1E40AF', border: '1px solid rgba(59,130,246,0.3)' }}
            >
              <Upload size={12} />
              <span>Importar</span>
            </button>
          )}

          <button
            className="relative p-1.5 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <Bell size={15} />
            <span
              className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: '#3B82F6' }}
            />
          </button>

          <div className="relative">
            <div
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-white/5"
              onClick={() => setUserMenuOpen((v) => !v)}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                style={{ backgroundColor: '#1E40AF' }}
              >
                {displayAvatar}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-white leading-tight">{displayName}</p>
                {displayRole && (
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {displayRole}
                  </p>
                )}
              </div>
              <ChevronDown size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
            </div>

            {userMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-52 rounded-xl shadow-2xl z-50 py-1"
                style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <div
                  className="px-3 py-2.5"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-xs font-semibold text-white truncate">{displayName}</p>
                  {user?.email && (
                    <p
                      className="text-xs truncate mt-0.5"
                      style={{ color: 'rgba(255,255,255,0.35)' }}
                    >
                      {user.email}
                    </p>
                  )}
                  {displayRole && (
                    <span
                      className="inline-block mt-1.5 px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#60A5FA' }}
                    >
                      {displayRole}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/5"
                  style={{ color: '#EF4444' }}
                >
                  <LogOut size={12} />
                  Sair da plataforma
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <nav
        className="px-4 overflow-x-auto scrollbar-hide"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-stretch min-w-max">
          {GROUP_ORDER.map((group, gi) => {
            const groupTabs = visibleTabs.filter((t) => t.group === group);
            if (groupTabs.length === 0) return null;
            return (
              <div key={group} className="flex items-stretch">
                {gi > 0 && (
                  <div
                    className="self-center mx-2 h-3 w-px"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                  />
                )}
                {groupTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <Link
                      key={tab.id}
                      href={tab.href}
                      prefetch={true}
                      onClick={(e) => handleNavClick(tab.href, e)}
                      className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-all relative"
                      style={{
                        color: isActive ? '#60A5FA' : 'rgba(255,255,255,0.45)',
                        borderBottom: isActive ? '2px solid #3B82F6' : '2px solid transparent',
                        backgroundColor: isActive ? 'rgba(59,130,246,0.06)' : 'transparent',
                      }}
                    >
                      <span style={{ color: isActive ? '#60A5FA' : 'rgba(255,255,255,0.3)' }}>
                        {tab.icon}
                      </span>
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
