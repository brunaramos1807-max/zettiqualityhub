'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import AppImage from '@/components/ui/AppImage';
import { createClient } from '@/lib/supabase/client';

export default function SystemLoginScreen() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [glowPulse, setGlowPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlowPulse((prev) => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const supabase = createClient();
      if (supabase) {
        // Use the configured site URL so the redirect always goes to the
        // authorised callback URL registered in Supabase, regardless of
        // which domain (qualivisao.tec.br or builtwithrocket.new) the user
        // is currently on.
        const siteUrl =
          process.env.NEXT_PUBLIC_SITE_URL ||
          (typeof window !== 'undefined' ? window.location.origin : '');
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${siteUrl}/auth/callback`,
          },
        });
        if (oauthError) setError(oauthError.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao iniciar login com Google');
    }
    setGoogleLoading(false);
  };

  const stats = [
    { value: '20+', label: 'INDICADORES', sublabel: 'Estratégicos' },
    { value: '4', label: 'SQUADS', sublabel: 'Operacionais' },
    { value: '32+', label: 'ANALISTAS', sublabel: 'Monitorados' },
  ];

  return (
    <div
      className="min-h-screen flex overflow-hidden"
      style={{ backgroundColor: '#071426', fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col justify-between relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #081120 0%, #0a1628 40%, #0F1B31 70%, #071426 100%)',
          borderRight: '1px solid rgba(56,189,248,0.08)',
        }}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(56,189,248,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Ambient glow blobs */}
        <div
          className="absolute pointer-events-none transition-opacity duration-3000"
          style={{
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 65%)',
            top: '-100px',
            left: '-150px',
            opacity: glowPulse ? 0.8 : 1,
            transition: 'opacity 3s ease-in-out',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 65%)',
            bottom: '0px',
            right: '-100px',
            opacity: glowPulse ? 1 : 0.6,
            transition: 'opacity 3s ease-in-out',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-12 xl:p-16">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-auto">
            <div
              className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{
                backgroundColor: 'rgba(56,189,248,0.12)',
                border: '1px solid rgba(56,189,248,0.25)',
                boxShadow: '0 0 20px rgba(56,189,248,0.15)',
              }}
            >
              <AppImage
                src="/assets/images/ChatGPT_Image_18_de_mai._de_2026__16_36_10-1779133005009.png"
                alt="QualiVisão logo"
                width={44}
                height={44}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-[0.18em]">QUALIVISÃO</p>
              <p className="text-xs tracking-[0.12em]" style={{ color: 'rgba(56,189,248,0.5)', fontSize: '0.65rem' }}>
                MONITORAMENTO EXECUTIVO
              </p>
            </div>
          </div>

          {/* Main headline */}
          <div className="mt-16 mb-10">
            <h1
              className="font-bold leading-[1.1] mb-6"
              style={{
                fontSize: 'clamp(2.4rem, 3.5vw, 3.2rem)',
                color: '#F8FAFC',
                letterSpacing: '-0.02em',
              }}
            >
              Gestão da{' '}
              <span
                style={{
                  color: '#38BDF8',
                  textShadow: '0 0 30px rgba(56,189,248,0.35)',
                }}
              >
                Qualidade
              </span>
              <br />
              Operacional
            </h1>
            <p
              className="leading-relaxed max-w-sm"
              style={{
                color: 'rgba(248,250,252,0.45)',
                fontSize: '0.9rem',
                lineHeight: '1.7',
              }}
            >
              Plataforma enterprise de indicadores estratégicos, dashboards executivos e inteligência gerencial para tomada de decisão.
            </p>
          </div>

          {/* Stat widgets */}
          <div className="grid grid-cols-3 gap-3 mt-auto">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="group relative p-5 rounded-2xl cursor-default transition-all duration-300"
                style={{
                  backgroundColor: 'rgba(15,27,49,0.6)',
                  border: '1px solid rgba(56,189,248,0.1)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(56,189,248,0.25)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 32px rgba(0,0,0,0.4), 0 0 20px rgba(56,189,248,0.08), inset 0 1px 0 rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(56,189,248,0.1)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)';
                }}
              >
                <p
                  className="font-bold mb-1"
                  style={{
                    fontSize: '1.75rem',
                    color: '#F8FAFC',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </p>
                <p
                  className="font-semibold tracking-widest"
                  style={{ color: '#38BDF8', fontSize: '0.6rem', letterSpacing: '0.12em' }}
                >
                  {stat.label}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', marginTop: '2px' }}>
                  {stat.sublabel}
                </p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="mt-8 text-xs" style={{ color: 'rgba(255,255,255,0.15)', letterSpacing: '0.04em' }}>
            © 2026 Qualivisão · Plataforma Enterprise de Governança Operacional
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative"
        style={{ backgroundColor: '#071426' }}
      >
        {/* Subtle right-side glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56,189,248,0.04) 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />

        <div className="relative z-10 w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div
              className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"
              style={{ backgroundColor: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.2)' }}
            >
              <AppImage
                src="/assets/images/ChatGPT_Image_18_de_mai._de_2026__16_36_10-1779133005009.png"
                alt="QualiVisão logo"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-widest">QUALIVISÃO</p>
              <p className="text-xs" style={{ color: 'rgba(56,189,248,0.5)' }}>Enterprise Platform</p>
            </div>
          </div>

          {/* Login card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'rgba(15,27,49,0.85)',
              border: '1px solid rgba(56,189,248,0.18)',
              boxShadow: '0 0 0 1px rgba(56,189,248,0.05), 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(56,189,248,0.06)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Card top accent line */}
            <div
              style={{
                height: '2px',
                background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.6), rgba(6,182,212,0.4), transparent)',
              }}
            />

            <div className="p-8 xl:p-10">
              {/* Shield icon */}
              <div className="flex flex-col items-center mb-8">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                  style={{
                    backgroundColor: 'rgba(56,189,248,0.08)',
                    border: '1px solid rgba(56,189,248,0.2)',
                    boxShadow: '0 0 24px rgba(56,189,248,0.1)',
                  }}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 1.5L3.75 5.25v5.25c0 5.25 3.563 10.163 8.25 11.25 4.688-1.088 8.25-6 8.25-11.25V5.25L12 1.5z"
                      fill="rgba(56,189,248,0.15)"
                      stroke="#38BDF8"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 12l2 2 4-4"
                      stroke="#38BDF8"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h2
                  className="font-bold text-white text-center mb-1.5"
                  style={{ fontSize: '1.25rem', letterSpacing: '-0.01em' }}
                >
                  Acesso à Plataforma
                </h2>
                <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>
                  Entre com suas credenciais corporativas para continuar
                </p>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="mb-5 p-3 rounded-xl text-xs flex items-start gap-2"
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#EF4444',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="1.5" />
                    <path d="M12 8v4M12 16h.01" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Google button */}
              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
                style={{
                  height: '52px',
                  background: 'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(6,182,212,0.1) 100%)',
                  border: '1px solid rgba(56,189,248,0.3)',
                  boxShadow: '0 0 20px rgba(56,189,248,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
                onMouseEnter={(e) => {
                  if (!googleLoading) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(56,189,248,0.22) 0%, rgba(6,182,212,0.16) 100%)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 30px rgba(56,189,248,0.15), inset 0 1px 0 rgba(255,255,255,0.08)';
                    (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(56,189,248,0.45)';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(6,182,212,0.1) 100%)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(56,189,248,0.08), inset 0 1px 0 rgba(255,255,255,0.06)';
                  (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(56,189,248,0.3)';
                }}
              >
                {googleLoading ? (
                  <Loader2 size={18} className="animate-spin" style={{ color: '#38BDF8' }} />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                <span style={{ letterSpacing: '0.01em' }}>
                  {googleLoading ? 'Redirecionando...' : 'Entrar com Google'}
                </span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Acesso corporativo seguro</span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
              </div>

              {/* Security badges */}
              <div className="flex items-center justify-center gap-4">
                {[
                  { icon: '🔒', label: 'OAuth 2.0' },
                  { icon: '🛡️', label: 'Supabase Auth' },
                  { icon: '✓', label: 'RBAC' },
                ].map((badge) => (
                  <div key={badge.label} className="flex items-center gap-1.5">
                    <span style={{ fontSize: '0.7rem' }}>{badge.icon}</span>
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem' }}>{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.15)', letterSpacing: '0.03em' }}>
            Acesso restrito · Usuários autorizados apenas
          </p>
          <p className="text-center text-xs mt-1" style={{ color: 'rgba(255,255,255,0.1)' }}>
            QUALIVISÃO Enterprise · Powered by Supabase + Gemini AI
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <a href="/privacidade" className="text-xs transition-colors hover:opacity-80" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Política de Privacidade
            </a>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
            <a href="/termos" className="text-xs transition-colors hover:opacity-80" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Termos de Uso
            </a>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
            <a href="/suporte" className="text-xs transition-colors hover:opacity-80" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Suporte
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
