'use client';
import React from 'react';

export default function AppFooter() {
  return (
    <footer
      className="py-4 px-6 mt-auto"
      style={{ borderTop: '1px solid rgba(255,255,255,0.04)', backgroundColor: '#0A0F1E' }}
    >
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          © 2026 QUALIVISÃO · qualivisao.tec.br
        </p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>
          Plataforma Enterprise de Gestão da Qualidade Operacional
        </p>
      </div>
    </footer>
  );
}