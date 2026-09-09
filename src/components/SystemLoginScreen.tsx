'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
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
          {/* Logo - Official Brand Asset */}
          <div className="mb-auto">
            <svg className="h-12 w-auto" viewBox="0 0 900 180" xmlns="http://www.w3.org/2000/svg">
              <g transform="translate(18 20)">
                <circle
                  cx="56"
                  cy="56"
                  r="41"
                  fill="none"
                  stroke="#E6F1EE"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray="222 70"
                  transform="rotate(-48 56 56)"
                />
                <rect x="29" y="58" width="9" height="23" rx="2" fill="#E6F1EE" />
                <rect x="43" y="47" width="9" height="34" rx="2" fill="#0FA08D" />
                <rect x="57" y="34" width="9" height="47" rx="2" fill="#E6F1EE" />
                <path d="M66 72 L100 107 L86 108 L59 80 Z" fill="#0FA08D" />
              </g>
              <text
                x="140"
                y="96"
                fill="#E6F1EE"
                fontFamily="Inter, Arial, sans-serif"
                fontSize="72"
                fontWeight="650"
              >
                ualiVisão
              </text>
              <text
                x="148"
                y="136"
                fill="#0FA08D"
                fontFamily="Inter, Arial, sans-serif"
                fontSize="24"
                fontWeight="500"
                letterSpacing="3"
              >
                INTELIGÊNCIA E PERFORMANCE
              </text>
            </svg>
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
              Visão{' '}
              <span
                style={{
                  color: 'var(--brand-accent)',
                  textShadow: '0 0 30px rgba(15, 160, 141, 0.35)',
                }}
              >
                Executiva
              </span>
              <br />
              para Alta Performance
            </h1>
            <p
              className="leading-relaxed max-w-sm"
              style={{
                color: 'rgba(248,250,252,0.60)',
                fontSize: '0.9rem',
                lineHeight: '1.7',
              }}
            >
              Centralize indicadores, equipes e resultados em uma plataforma única de gestão e
              inteligência operacional.
            </p>
          </div>

          {/* Footer */}
          <p
            className="mt-auto pt-8 text-xs"
            style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}
          >
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

        <div className="relative z-10 w-full max-w-[400px] 2xl:max-w-[420px]">
          {/* Mobile logo - Official Brand Asset */}
          <div className="mb-10 lg:hidden">
            <svg className="h-10 w-auto" viewBox="0 0 900 180" xmlns="http://www.w3.org/2000/svg">
              <g transform="translate(18 20)">
                <circle
                  cx="56"
                  cy="56"
                  r="41"
                  fill="none"
                  stroke="#E6F1EE"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray="222 70"
                  transform="rotate(-48 56 56)"
                />
                <rect x="29" y="58" width="9" height="23" rx="2" fill="#E6F1EE" />
                <rect x="43" y="47" width="9" height="34" rx="2" fill="#0FA08D" />
                <rect x="57" y="34" width="9" height="47" rx="2" fill="#E6F1EE" />
                <path d="M66 72 L100 107 L86 108 L59 80 Z" fill="#0FA08D" />
              </g>
              <text
                x="140"
                y="96"
                fill="#E6F1EE"
                fontFamily="Inter, Arial, sans-serif"
                fontSize="72"
                fontWeight="650"
              >
                ualiVisão
              </text>
              <text
                x="148"
                y="136"
                fill="#0FA08D"
                fontFamily="Inter, Arial, sans-serif"
                fontSize="24"
                fontWeight="500"
                letterSpacing="3"
              >
                INTELIGÊNCIA E PERFORMANCE
              </text>
            </svg>
          </div>

          {/* Login card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'rgba(15,27,49,0.85)',
              border: '1px solid rgba(56,189,248,0.18)',
              boxShadow:
                '0 0 0 1px rgba(56,189,248,0.05), 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(56,189,248,0.06)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Card top accent line */}
            <div
              style={{
                height: '2px',
                background:
                  'linear-gradient(90deg, transparent, rgba(56,189,248,0.6), rgba(6,182,212,0.4), transparent)',
              }}
            />

            <div className="p-8 xl:p-10">
              {/* Shield icon */}
              <div className="flex flex-col items-center mb-8">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                  style={{
                    backgroundColor: 'rgba(15, 160, 141, 0.08)',
                    border: `1px solid var(--brand-accent)`,
                    boxShadow: '0 0 24px rgba(15, 160, 141, 0.1)',
                  }}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 1.5L3.75 5.25v5.25c0 5.25 3.563 10.163 8.25 11.25 4.688-1.088 8.25-6 8.25-11.25V5.25L12 1.5z"
                      fill="rgba(15, 160, 141, 0.15)"
                      stroke="var(--brand-accent)"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 12l2 2 4-4"
                      stroke="var(--brand-accent)"
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
                  Acesse o QualiVisão
                </h2>
                <p
                  className="text-center text-sm"
                  style={{ color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}
                >
                  Entre no seu ambiente corporativo
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
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="flex-shrink-0 mt-0.5"
                  >
                    <circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="1.5" />
                    <path
                      d="M12 8v4M12 16h.01"
                      stroke="#EF4444"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
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
                  background:
                    'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(6,182,212,0.1) 100%)',
                  border: '1px solid rgba(56,189,248,0.3)',
                  boxShadow: '0 0 20px rgba(56,189,248,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
                onMouseEnter={(e) => {
                  if (!googleLoading) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'linear-gradient(135deg, rgba(56,189,248,0.22) 0%, rgba(6,182,212,0.16) 100%)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      '0 0 30px rgba(56,189,248,0.15), inset 0 1px 0 rgba(255,255,255,0.08)';
                    (e.currentTarget as HTMLButtonElement).style.border =
                      '1px solid rgba(56,189,248,0.45)';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(6,182,212,0.1) 100%)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    '0 0 20px rgba(56,189,248,0.08), inset 0 1px 0 rgba(255,255,255,0.06)';
                  (e.currentTarget as HTMLButtonElement).style.border =
                    '1px solid rgba(56,189,248,0.3)';
                }}
              >
                {googleLoading ? (
                  <Loader2 size={18} className="animate-spin" style={{ color: '#38BDF8' }} />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                <span style={{ letterSpacing: '0.01em' }}>
                  {googleLoading ? 'Redirecionando...' : 'Entrar com Google'}
                </span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Acesso seguro para usuários autorizados
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                />
              </div>
            </div>
          </div>

          {/* Footer note */}
          <p
            className="text-center text-xs mt-6"
            style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.03em' }}
          >
            Acesso restrito · Usuários autorizados apenas
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <a
              href="/privacidade"
              className="text-xs transition-colors hover:opacity-80"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              Política de Privacidade
            </a>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            <a
              href="/termos"
              className="text-xs transition-colors hover:opacity-80"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              Termos de Uso
            </a>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            <a
              href="/suporte"
              className="text-xs transition-colors hover:opacity-80"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              Suporte
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
