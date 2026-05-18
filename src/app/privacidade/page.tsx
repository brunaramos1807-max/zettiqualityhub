'use client';
import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen py-12 px-6" style={{ backgroundColor: '#071426' }}>
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm mb-8 transition-colors hover:opacity-80"
          style={{ color: '#38BDF8' }}
        >
          <ArrowLeft size={14} />
          Voltar ao sistema
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}>
            <Shield size={18} style={{ color: '#38BDF8' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Política de Privacidade</h1>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Última atualização: maio de 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: '#94A3B8' }}>
          <section className="rounded-xl p-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-base font-semibold text-white mb-3">1. Informações que Coletamos</h2>
            <p>A QUALIVISÃO coleta informações necessárias para o funcionamento da plataforma enterprise de gestão da qualidade operacional. Isso inclui dados de autenticação (e-mail, nome) fornecidos via Google OAuth, dados de uso da plataforma e informações inseridas pelos usuários no sistema.</p>
          </section>

          <section className="rounded-xl p-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-base font-semibold text-white mb-3">2. Como Usamos suas Informações</h2>
            <p>As informações coletadas são utilizadas exclusivamente para:</p>
            <ul className="mt-3 space-y-1.5 list-disc list-inside">
              <li>Autenticação e controle de acesso à plataforma</li>
              <li>Personalização da experiência do usuário</li>
              <li>Geração de relatórios e indicadores de qualidade</li>
              <li>Comunicações relacionadas ao sistema</li>
            </ul>
          </section>

          <section className="rounded-xl p-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-base font-semibold text-white mb-3">3. Compartilhamento de Dados</h2>
            <p>Não compartilhamos suas informações pessoais com terceiros, exceto quando necessário para o funcionamento dos serviços integrados (Supabase para banco de dados, Google para autenticação) ou quando exigido por lei.</p>
          </section>

          <section className="rounded-xl p-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-base font-semibold text-white mb-3">4. Segurança</h2>
            <p>Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição. O acesso à plataforma é protegido por autenticação OAuth 2.0 via Google.</p>
          </section>

          <section className="rounded-xl p-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-base font-semibold text-white mb-3">5. Seus Direitos</h2>
            <p>Você tem o direito de acessar, corrigir ou solicitar a exclusão de seus dados pessoais. Para exercer esses direitos, entre em contato conosco através do suporte.</p>
          </section>

          <section className="rounded-xl p-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-base font-semibold text-white mb-3">6. Contato</h2>
            <p>Para dúvidas sobre esta política de privacidade, entre em contato: <span style={{ color: '#38BDF8' }}>suporte@qualivisao.tec.br</span></p>
          </section>
        </div>
      </div>
    </div>
  );
}
