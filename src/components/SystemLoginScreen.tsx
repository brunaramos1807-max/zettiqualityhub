'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, LogIn, ArrowLeft, CheckCircle, UserPlus } from 'lucide-react';
import AppImage from '@/components/ui/AppImage';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import { requestPasswordReset, resetPassword, createUser } from '@/lib/authSystem';
import { createClient } from '@/lib/supabase/client';

type View = 'login' | 'register' | 'forgot' | 'reset';

export default function SystemLoginScreen() {
  const { login } = useSystemAuth();
  const [view, setView] = useState<View>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const switchView = (v: View) => {
    setView(v);
    setError('');
    setForgotSuccess(false);
    setResetSuccess(false);
    setRegSuccess(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Preencha e-mail e senha.'); return; }
    setLoading(true);
    setError('');
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) setError(result.error || 'Credenciais inválidas.');
  };

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword || !regConfirm) { setError('Preencha todos os campos.'); return; }
    if (regPassword !== regConfirm) { setError('As senhas não coincidem.'); return; }
    if (regPassword.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    setLoading(true);
    setError('');
    const result = await createUser({ nome_completo: regName, email: regEmail, senha: regPassword, status: 'Ativo', cargo: 'Auditor', equipe: 'PDV' });
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signUp({ email: regEmail, password: regPassword, options: { data: { full_name: regName }, emailRedirectTo: `${window.location.origin}/auth/callback` } });
    }
    setLoading(false);
    if (!result.success) { setError(result.error || 'Erro ao criar conta.'); return; }
    setRegSuccess(true);
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) { setError('Informe o e-mail.'); return; }
    const result = requestPasswordReset(forgotEmail);
    if (!result.success) { setError('E-mail não encontrado no sistema.'); return; }
    setResetToken(result.token || '');
    setForgotSuccess(true);
    setError('');
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) { setError('As senhas não coincidem.'); return; }
    if (newPassword.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    setLoading(true);
    const result = await resetPassword(resetToken, newPassword);
    setLoading(false);
    if (!result.success) { setError(result.error || 'Erro ao redefinir senha.'); return; }
    setResetSuccess(true);
    setError('');
  };

  const inputCls = 'w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all focus:ring-2 focus:ring-sky-500/30';
  const inputStyle: React.CSSProperties = { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#071426' }}>
      {/* Left brand panel */}
      <div
        className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #081120 0%, #0F1B31 50%, #071426 100%)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Glow effects */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 30% 70%, rgba(56,189,248,0.08) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 80% 20%, rgba(6,182,212,0.05) 0%, transparent 50%)' }} />
        {/* Grid pattern */}
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

          {/* Feature badges */}
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

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ backgroundColor: '#1E40AF' }}>
              <AppImage src="/assets/images/5f5559140_ChatGPTImage27deabrde202616_50_50-1777926706123.png" alt="QualiVisão logo" width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">QUALIVISÃO</h2>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Enterprise Platform</p>
            </div>
          </div>

          {/* ── LOGIN VIEW ── */}
          {view === 'login' && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-1">Acesso à plataforma</h2>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Entre com suas credenciais para continuar</p>
              </div>

              {/* Google Login */}
              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white transition-all mb-4 disabled:opacity-50"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 0 20px rgba(56,189,248,0.1)' }}
              >
                {googleLoading ? <Loader2 size={16} className="animate-spin" /> : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 48 48"
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.554v3.446h6.946c1.028 0 1.885.433 2.131.68l2.943-2.943C28.885 6.562 28.028 6 27 6z"
                      />
                      <path
                        fill="#4285F4"
                        d="M12 27c0-4.554 3.546-8.554 8-9.883l6.943 2.943C15.546 25.446 12 29.446 12 27z"
                      />
                      <path
                        fill="none"
                        d="M11 21H0l11 11z"
                      />
                      <path
                        fill="none"
                        d="M0 12l11 11 11-11z"
                      />
                    </svg>
                    <span className="ml-2">Entrar com Google</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>ou</span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>E-mail</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className={inputCls} style={inputStyle} autoComplete="email" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Senha</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={`${inputCls} pr-10`} style={inputStyle} autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #1E40AF, #0EA5E9)', boxShadow: '0 0 20px rgba(56,189,248,0.25)' }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                  {loading ? 'Entrando...' : 'Entrar na Plataforma'}
                </button>
              </form>

              <div className="flex items-center justify-between mt-4">
                <button onClick={() => switchView('forgot')} className="text-xs transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Esqueci minha senha
                </button>
                <button onClick={() => switchView('register')} className="text-xs transition-colors" style={{ color: '#38BDF8' }}>
                  Criar conta
                </button>
              </div>

              {/* Security badge */}
              <div className="mt-8 flex items-center justify-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: '#22C55E' }} />
                Conexão segura · Supabase Auth · RBAC
              </div>
            </div>
          )}

          {/* ── REGISTER VIEW ── */}
          {view === 'register' && (
            <div>
              <button onClick={() => switchView('login')} className="flex items-center gap-1.5 text-xs mb-6 transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <ArrowLeft size={13} /> Voltar ao login
              </button>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">Criar conta</h2>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Preencha os dados para solicitar acesso</p>
              </div>
              {regSuccess ? (
                <div className="text-center py-8">
                  <CheckCircle size={40} className="mx-auto mb-3" style={{ color: '#22C55E' }} />
                  <p className="text-base font-semibold text-white mb-2">Conta criada!</p>
                  <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Verifique seu e-mail para confirmar o cadastro.</p>
                  <button onClick={() => switchView('login')} className="text-sm" style={{ color: '#38BDF8' }}>Ir para o login</button>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Nome completo" className={inputCls} style={inputStyle} />
                  <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="E-mail corporativo" className={inputCls} style={inputStyle} />
                  <div className="relative">
                    <input type={showRegPassword ? 'text' : 'password'} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="Senha (mín. 6 caracteres)" className={`${inputCls} pr-10`} style={inputStyle} />
                    <button type="button" onClick={() => setShowRegPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <input type="password" value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} placeholder="Confirmar senha" className={inputCls} style={inputStyle} />
                  {error && <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>{error}</div>}
                  <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #1E40AF, #0EA5E9)' }}>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    {loading ? 'Criando...' : 'Criar Conta'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ── FORGOT VIEW ── */}
          {view === 'forgot' && (
            <div>
              <button onClick={() => switchView('login')} className="flex items-center gap-1.5 text-xs mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <ArrowLeft size={13} /> Voltar
              </button>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">Recuperar senha</h2>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Informe seu e-mail para receber o token de recuperação</p>
              </div>
              {forgotSuccess ? (
                <div>
                  <div className="px-4 py-3 rounded-xl text-sm mb-4" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#86EFAC' }}>
                    Token gerado. Use-o abaixo para redefinir sua senha.
                  </div>
                  <form onSubmit={handleReset} className="space-y-4">
                    <input type="text" value={resetToken} onChange={(e) => setResetToken(e.target.value)} placeholder="Token de recuperação" className={inputCls} style={inputStyle} />
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nova senha" className={inputCls} style={inputStyle} />
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmar nova senha" className={inputCls} style={inputStyle} />
                    {error && <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>{error}</div>}
                    {resetSuccess ? (
                      <div className="text-center py-4">
                        <CheckCircle size={32} className="mx-auto mb-2" style={{ color: '#22C55E' }} />
                        <p className="text-sm text-white mb-2">Senha redefinida com sucesso!</p>
                        <button onClick={() => switchView('login')} className="text-sm" style={{ color: '#38BDF8' }}>Ir para o login</button>
                      </div>
                    ) : (
                      <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #1E40AF, #0EA5E9)' }}>
                        {loading ? 'Redefinindo...' : 'Redefinir Senha'}
                      </button>
                    )}
                  </form>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="seu@email.com" className={inputCls} style={inputStyle} />
                  {error && <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>{error}</div>}
                  <button type="submit" className="w-full py-3 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #1E40AF, #0EA5E9)' }}>
                    Solicitar Recuperação
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
