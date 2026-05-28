'use client';
import React from 'react';
import Link from 'next/link';

export default function AppFooter() {
  return (
    <footer
      className="py-4 px-6 mt-auto"
      style={{ borderTop: '1px solid rgba(255,255,255,0.04)', backgroundColor: '#0A0F1E' }}
    >
      <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          © 2026 QUALIVISÃO · qualivisao.tec.br
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/privacidade"
            className="text-xs transition-colors hover:opacity-80"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            Política de Privacidade
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
          <Link
            href="/termos"
            className="text-xs transition-colors hover:opacity-80"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            Termos de Uso
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
          <Link
            href="/suporte"
            className="text-xs transition-colors hover:opacity-80"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            Suporte
          </Link>
        </div>
      </div>
    </footer>
  );
}