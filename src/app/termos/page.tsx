'use client';
import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';

export default function TermosPage() {
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
            <FileText size={18} style={{ color: '#38BDF8' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Termos de Uso</h1>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Última atualização: maio de 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: '#94A3B8' }}>
          <section className="rounded-xl p-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-base font-semibold text-white mb-3">1. Aceitação dos Termos</h2>
            <p>Ao acessar e utilizar a plataforma QUALIVISÃO, você concorda com estes Termos de Uso. Se não concordar com qualquer parte destes termos, não utilize a plataforma.</p>
          </section>

          <section className="rounded-xl p-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-base font-semibold text-white mb-3">2. Descrição do Serviço</h2>
            <p>A QUALIVISÃO é uma plataforma enterprise de gestão da qualidade operacional, fornecendo dashboards executivos, indicadores estratégicos e ferramentas de inteligência gerencial para tomada de decisão.</p>
          </section>

          <section className="rounded-xl p-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-base font-semibold text-white mb-3">3. Uso Autorizado</h2>
            <p>A plataforma é de uso exclusivo para colaboradores e gestores autorizados pela organização. É proibido:</p>
            <ul className="mt-3 space-y-1.5 list-disc list-inside">
              <li>Compartilhar credenciais de acesso com terceiros não autorizados</li>
              <li>Utilizar a plataforma para fins não relacionados à gestão da qualidade</li>
              <li>Tentar acessar áreas restritas sem autorização</li>
              <li>Exportar ou divulgar dados confidenciais da organização</li>
            </ul>
          </section>

          <section className="rounded-xl p-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-base font-semibold text-white mb-3">4. Responsabilidades do Usuário</h2>
            <p>O usuário é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta. Qualquer uso não autorizado deve ser reportado imediatamente ao administrador do sistema.</p>
          </section>

          <section className="rounded-xl p-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-base font-semibold text-white mb-3">5. Propriedade Intelectual</h2>
            <p>Todo o conteúdo, design e funcionalidades da plataforma QUALIVISÃO são propriedade da organização e estão protegidos por direitos autorais. É proibida a reprodução ou distribuição sem autorização expressa.</p>
          </section>

          <section className="rounded-xl p-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-base font-semibold text-white mb-3">6. Limitação de Responsabilidade</h2>
            <p>A plataforma é fornecida "como está". Não garantimos disponibilidade ininterrupta do serviço. Não nos responsabilizamos por perdas decorrentes de uso indevido da plataforma.</p>
          </section>

          <section className="rounded-xl p-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-base font-semibold text-white mb-3">7. Contato</h2>
            <p>Para dúvidas sobre estes termos: <span style={{ color: '#38BDF8' }}>suporte@qualivisao.tec.br</span></p>
          </section>
        </div>
      </div>
    </div>
  );
}
