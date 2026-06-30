import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { SystemAuthProvider } from '@/contexts/SystemAuthContext';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import '../styles/tailwind.css';

const fontVariables = {
  '--font-dm-sans': 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  '--font-playfair': 'Georgia, Times New Roman, serif',
} as React.CSSProperties;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'QualiVisão — Plataforma de Gestão da Qualidade Operacional',
  description: 'QualiVisão — Plataforma enterprise de gestão da qualidade operacional. Indicadores estratégicos, dashboards executivos e inteligência gerencial para tomada de decisão.',
  keywords: 'qualidade, gestão, indicadores, QA, IEPC, dashboard executivo, qualivisao',
  authors: [{ name: 'QualiVisão' }],
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
  openGraph: {
    title: 'QualiVisão — Gestão da Qualidade Operacional',
    description: 'Plataforma enterprise de gestão da qualidade com indicadores estratégicos e dashboards executivos.',
    siteName: 'QualiVisão',
    locale: 'pt_BR',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" style={fontVariables}>
      <body className="font-sans">
        <AuthProvider>
          <SystemAuthProvider>
            <Suspense fallback={null}>
              <GoogleAnalytics />
            </Suspense>
            {children}
          </SystemAuthProvider>
        </AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#161B22',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#FFFFFF',
            },
          }}
        />

        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fzettiquali9387back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.19" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.2" /></body>
    </html>
  );
}