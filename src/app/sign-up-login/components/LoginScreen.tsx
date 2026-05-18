'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, Copy, Check, LogIn, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import AppImage from '@/components/ui/AppImage';
import { DEMO_CREDENTIALS } from '@/lib/mockData';

interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

export default function LoginScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleUseCredential = (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
    toast.success('Credenciais preenchidas', { description: 'Clique em Entrar para continuar.' });
  };

  const onSubmit = (data: LoginFormValues) => {
    setIsLoading(true);
    // Backend integration point: POST /api/auth/login with { email, password }
    setTimeout(() => {
      const validCredential = DEMO_CREDENTIALS.find(
        (c) => c.email === data.email && c.password === data.password
      );
      if (!validCredential) {
        setIsLoading(false);
        setError('email', {
          message: 'Credenciais inválidas — use as contas demo abaixo para entrar',
        });
        return;
      }
      toast.success(`Bem-vindo ao ZettiQualityHub!`, {
        description: `Conectado como ${validCredential.role}`,
      });
      setTimeout(() => {
        router.push('/');
      }, 800);
    }, 1500);
  };

  const handleGoogleLogin = () => {
    // Backend integration point: Google OAuth2 flow — redirect to /api/auth/google
    toast.info('Login com Google', { description: 'Integração OAuth em configuração.' });
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0D1117' }}>
      {/* Left panel — brand */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-5/12 flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0D2B5A 0%, #1E3A5F 40%, #162032 100%)',
        }}
      >
        {/* Background decoration */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 80%, #22C55E 0%, transparent 50%), radial-gradient(circle at 80% 20%, #2B4F81 0%, transparent 50%)',
          }}
        />
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 40px)',
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <AppImage
                src="/assets/images/5f5559140_ChatGPTImage27deabrde202616_50_50-1777926706123.png"
                alt="Zetti Quality Hub logo — quality analytics icon with magnifying glass and chart"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Zetti Tech</p>
              <h2 className="font-display text-lg font-semibold text-white">Quality Hub</h2>
            </div>
          </div>

          <h1 className="font-display text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            Qualidade &<br />
            <span style={{ color: '#22C55E' }}>Desenvolvimento</span>
          </h1>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Transformando dados de auditoria em visão estratégica e direcionamento da operação para todas as squads.
          </p>
        </div>

        {/* Stats preview */}
        <div className="relative grid grid-cols-3 gap-4">
          {[
            { label: 'Analistas', value: '18' },
            { label: 'Ciclo Atual', value: '85%' },
            { label: 'Squads', value: '4' },
          ].map((stat) => (
            <div key={`brand-stat-${stat.label}`}
              className="p-4 rounded-xl text-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-2xl font-bold text-white metric-value">{stat.value}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl overflow-hidden" style={{ backgroundColor: '#1E3A5F' }}>
              <AppImage
                src="/assets/images/5f5559140_ChatGPTImage27deabrde202616_50_50-1777926706123.png"
                alt="Zetti Quality Hub logo"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-xs" style={{ color: '#8B949E' }}>Zetti Tech</p>
              <h2 className="font-display text-base font-semibold text-white">Quality Hub v3.0</h2>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold text-white mb-1">Entrar no portal</h2>
            <p className="text-sm" style={{ color: '#8B949E' }}>Acesse com sua conta Zetti Tech</p>
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl mb-6 text-sm font-medium transition-all duration-150 hover:bg-white/10 active:scale-[0.98]"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuar com Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs" style={{ color: '#8B949E' }}>ou entre com e-mail</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">
                E-mail corporativo
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="seu.nome@zetti.com.br"
                {...register('email', {
                  required: 'E-mail é obrigatório',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'E-mail inválido' },
                })}
              />
              {errors.email && (
                <p className="text-xs mt-1.5 text-danger">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="Sua senha de acesso"
                  {...register('password', { required: 'Senha é obrigatória' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-white"
                  style={{ color: '#8B949E' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs mt-1.5 text-danger">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  style={{ accentColor: '#2B4F81' }}
                  {...register('rememberMe')}
                />
                <span className="text-sm" style={{ color: '#8B949E' }}>Lembrar-me</span>
              </label>
              <button type="button" className="text-sm transition-colors hover:text-white" style={{ color: '#2B4F81' }}>
                Esqueci a senha
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-150 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#1E3A5F', color: '#FFFFFF', minHeight: 46 }}
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  Entrar no Portal
                </>
              )}
            </button>
          </form>

          {/* Demo credentials table */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} style={{ color: '#8B949E' }} />
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8B949E' }}>Contas Demo — Clique para preencher</p>
            </div>
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {DEMO_CREDENTIALS.map((cred, idx) => (
                <div
                  key={`cred-${cred.role}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5 cursor-pointer"
                  style={{
                    borderBottom: idx < DEMO_CREDENTIALS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}
                  onClick={() => handleUseCredential(cred.email, cred.password)}
                >
                  <div className="flex-shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      cred.role === 'Admin' ? 'badge-danger' :
                      cred.role === 'Coordenador' ? 'badge-warning' : 'badge-success'
                    }`}>
                      {cred.role}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{cred.email}</p>
                    <p className="text-xs truncate" style={{ color: '#8B949E' }}>{cred.description}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleCopy(cred.email, `email-${cred.role}`); }}
                      className="p-1.5 rounded transition-colors hover:bg-white/10"
                      style={{ color: '#8B949E' }}
                      title="Copiar e-mail"
                    >
                      {copiedField === `email-${cred.role}` ? <Check size={13} style={{ color: '#22C55E' }} /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}