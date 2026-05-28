'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, ArrowLeft, Mail, MessageSquare, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'Como faço login na plataforma?',
    a: 'Acesse a tela de login e clique em "Entrar com Google". Use sua conta corporativa autorizada pelo administrador do sistema.',
  },
  {
    q: 'Não consigo acessar determinadas páginas. O que fazer?',
    a: 'O acesso às páginas é controlado pelo seu perfil de permissões. Entre em contato com o administrador do sistema para solicitar as permissões necessárias.',
  },
  {
    q: 'Como importar dados de um ciclo?',
    a: 'Acesse o menu "Importações" na barra lateral. Faça o upload do arquivo CSV/Excel no formato correto. O sistema processará os dados automaticamente.',
  },
  {
    q: 'Como gerar um relatório PDF?',
    a: 'Em qualquer página do sistema, clique no ícone de impressora na barra superior para imprimir ou salvar como PDF a visualização atual.',
  },
  {
    q: 'Como fechar um ciclo?',
    a: 'Acesse a página "Ciclos", localize o ciclo desejado e clique em "Fechar Ciclo". Esta ação requer permissão de administrador.',
  },
  {
    q: 'Posso exportar os dados do sistema?',
    a: 'Sim. Na página de Gestão, administradores podem exportar um backup completo dos dados. Relatórios individuais podem ser impressos em PDF em cada página.',
  },
];

export default function SuportePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
            <HelpCircle size={18} style={{ color: '#38BDF8' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Suporte</h1>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Central de ajuda QUALIVISÃO</p>
          </div>
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(56,189,248,0.1)' }}>
                <Mail size={15} style={{ color: '#38BDF8' }} />
              </div>
              <h3 className="text-sm font-semibold text-white">E-mail</h3>
            </div>
            <p className="text-xs mb-2" style={{ color: '#94A3B8' }}>Para suporte técnico e dúvidas gerais:</p>
            <a href="mailto:suporte@qualivisao.tec.br" className="text-sm font-medium" style={{ color: '#38BDF8' }}>
              suporte@qualivisao.tec.br
            </a>
          </div>

          <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(56,189,248,0.1)' }}>
                <BookOpen size={15} style={{ color: '#38BDF8' }} />
              </div>
              <h3 className="text-sm font-semibold text-white">Documentação</h3>
            </div>
            <p className="text-xs mb-2" style={{ color: '#94A3B8' }}>Acesse os manuais e guias do sistema:</p>
            <Link href="/documentos" className="text-sm font-medium" style={{ color: '#38BDF8' }}>
              Ver documentos →
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <MessageSquare size={14} style={{ color: '#38BDF8' }} />
              <h2 className="text-sm font-semibold text-white">Perguntas Frequentes</h2>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {FAQ_ITEMS?.map((item, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <span className="text-sm font-medium text-white pr-4">{item?.q}</span>
                  {openFaq === i ? (
                    <ChevronUp size={14} style={{ color: '#38BDF8', flexShrink: 0 }} />
                  ) : (
                    <ChevronDown size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm" style={{ color: '#94A3B8' }}>{item?.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
