'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import AppImage from '@/components/ui/AppImage';
import { createClient } from '@/lib/supabase/client';

export default function SystemLoginScreen() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const supabase = createClient();
      if (supabase) {
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
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
    <div className="min-h-screen flex" style={{ backgroundColor: '#071426' }}>
      {/* Left brand panel */}
      <div
        className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #081120 0%, #0F1B31 50%, #071426 100%)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 30% 70%, rgba(56,189,248,0.08) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 80% 20%, rgba(6,182,212,0.05) 0%, transparent 50%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#1E40AF', boxShadow: '0 0 20px rgba(56,189,248,0.3)' }}>
              <AppImage src="/assets/images/5f5559140_ChatGPTImage27deabrde202616_50_50-1777926706123.png" alt="QualiVisão logo" width={48} height={48} className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-widest">QUALIVISÃO</h2>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>ENTERPRISE PLATFORM</p>
            </div>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
            Gestão da<br />
            <span style={{ color: '#38BDF8' }}>Qualidade</span><br />
            Operacional
          </h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Plataforma enterprise de indicadores estratégicos, dashboards executivos e inteligência gerencial para tomada de decisão.
          </p>

          <div className="flex flex-wrap gap-2">
            {['QA + IEPC', 'ISO 9001', 'Analytics', 'Gemini AI', 'RBAC'].map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-3">
          {[
            { label: 'Indicadores', value: '20+' },
            { label: 'Squads', value: '4' },
            { label: 'Analistas', value: '32+' },
            { label: 'QA + IEPC + ISO', value: '✓' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ backgroundColor: '#1E40AF' }}>
              <AppImage src="/assets/images/5f5559140_ChatGPTImage27deabrde202616_50_50-1777926706123.png" alt="QualiVisão logo" width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">QUALIVISÃO</h2>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Enterprise Platform</p>
            </div>
          </div>

          {/* Card */}
          <div
            className="rounded-2xl p-8"
            style={{
              backgroundColor: '#0F1B31',
              border: '1px solid rgba(56,189,248,0.15)',
              boxShadow: '0 0 40px rgba(56,189,248,0.08)',
            }}
          >
            <div className="mb-8 text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="rgba(56,189,248,0.3)" stroke="#38BDF8" strokeWidth="1.5" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Acesso Corporativo</h2>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Autenticação segura via conta Google
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 hover:brightness-110 active:scale-[0.98]"
              style={{
                backgroundColor: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 0 20px rgba(56,189,248,0.1)',
              }}
            >
              {googleLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              <span>{googleLoading ? 'Redirecionando...' : 'Entrar com Google'}</span>
            </button>

            <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Acesso restrito a usuários autorizados
            </p>
          </div>

          <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.15)' }}>
            QUALIVISÃO Enterprise · Powered by Supabase + Gemini AI
          </p>
        </div>
      </div>
    </div>
  );
}
