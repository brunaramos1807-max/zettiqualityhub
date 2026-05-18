'use client';
import React, { useState, useEffect } from 'react';
import { useChat } from '@/lib/hooks/useChat';
import { toast } from 'sonner';
import { ANALYSTS, NC_RECORDS, ELOGIOS, SQUAD_AVERAGES, CYCLE_LABEL } from '@/lib/mockData';
import type { Analyst } from '@/lib/mockData';

interface ExecutiveInsightsProps {
  analysts?: Analyst[];
}

function buildCycleDataPrompt(analysts: Analyst[]): string {
  const totalAnalysts = analysts.length;
  const avgQA = (analysts.reduce((s, a) => s + a.qaScore, 0) / totalAnalysts).toFixed(2);
  const avgIEPC = (analysts.reduce((s, a) => s + a.iepcScore, 0) / totalAnalysts).toFixed(2);
  const totalNCs = analysts.reduce((s, a) => s + a.ncs, 0);
  const totalElogios = ELOGIOS.length;

  const analystRows = analysts
    .map(
      (a) =>
        `- ${a.name} (${a.squad}): QA=${a.qaScore.toFixed(2)}, IEPC=${a.iepcScore.toFixed(2)}, NCs=${a.ncs}, Pilares QA=[P1:${a.p1}, P2:${a.p2}, P3:${a.p3}, P4:${a.p4}, P5:${a.p5}], Pilares IEPC=[E1:${a.e1}, E2:${a.e2}, E3:${a.e3}, E4:${a.e4}, E5:${a.e5}]`
    )
    .join('\n');

  const squadRows = SQUAD_AVERAGES.map(
    (s) => `- ${s.squad}: Média QA=${s.avgQA.toFixed(2)}, Média IEPC=${s.avgIEPC.toFixed(2)}, Analistas=${s.analysts}`
  ).join('\n');

  const ncTypes = NC_RECORDS.reduce<Record<string, number>>((acc, nc) => {
    acc[nc.tipo] = (acc[nc.tipo] || 0) + 1;
    return acc;
  }, {});
  const ncSummary = Object.entries(ncTypes)
    .map(([tipo, count]) => `- ${tipo}: ${count} ocorrência(s)`)
    .join('\n');

  const elogiosBySquad = ELOGIOS.reduce<Record<string, number>>((acc, e) => {
    acc[e.squad] = (acc[e.squad] || 0) + 1;
    return acc;
  }, {});
  const elogioSummary = Object.entries(elogiosBySquad)
    .map(([squad, count]) => `- ${squad}: ${count} elogio(s)`)
    .join('\n');

  return `Você é um consultor sênior de Qualidade Operacional. Analise os dados consolidados do ciclo ${CYCLE_LABEL} da Zetti Tech e produza uma análise executiva estruturada em português.

## DADOS DO CICLO ${CYCLE_LABEL}

### Resumo Geral
- Total de analistas avaliados: ${totalAnalysts}
- Nota QA Média: ${avgQA}
- IEPC Médio: ${avgIEPC}
- Total de Não Conformidades: ${totalNCs}
- Total de Elogios recebidos: ${totalElogios}

### Desempenho por Squad
${squadRows}

### Desempenho Individual dos Analistas (QA, IEPC, NCs e Pilares)
${analystRows}

### Não Conformidades por Tipo
${ncSummary}

### Elogios por Squad
${elogioSummary}

## INSTRUÇÕES DE ANÁLISE

Com base nos dados acima, produza uma análise executiva com exatamente estas 3 seções:

**1. 🔴 Gargalos Operacionais**
Identifique os principais pontos de falha: analistas abaixo da meta, squads com baixo desempenho, pilares com notas mais baixas, tipos de NC mais recorrentes. Seja específico com nomes e números.

**2. 📚 Temas Prioritários para Treinamento**
Com base nos padrões de NC e nos pilares com menor pontuação, sugira de 3 a 5 temas de treinamento concretos e acionáveis. Justifique cada tema com os dados.

**3. ✅ Padrões de Acerto e Reconhecimento**
Destaque analistas e squads com desempenho acima da média, padrões de excelência identificados e boas práticas que devem ser replicadas.

Seja direto, executivo e baseado nos dados. Use linguagem corporativa em português.`;
}

export default function ExecutiveInsights({ analysts }: ExecutiveInsightsProps) {
  const [hasGenerated, setHasGenerated] = useState(false);
  const targetAnalysts = analysts && analysts.length > 0 ? analysts : ANALYSTS;

  const { response, isLoading, error, sendMessage } = useChat(
    'GEMINI',
    'gemini/gemini-2.5-flash',
    true
  );

  useEffect(() => {
    if (error) {
      toast.error('Erro ao gerar insights: ' + error.message);
    }
  }, [error]);

  const handleGenerate = () => {
    setHasGenerated(true);
    const prompt = buildCycleDataPrompt(targetAnalysts);
    sendMessage(
      [
        {
          role: 'system',
          content:
            'Você é um consultor sênior de Qualidade Operacional especializado em análise de dados de call center e suporte técnico. Responda sempre em português brasileiro com linguagem executiva e objetiva.',
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.4, max_tokens: 2000 }
    );
  };

  const sections = parseSections(response);

  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2B4F81 100%)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10" />
              <path d="M12 6v6l4 2" />
              <path d="M22 2 12 12" />
            </svg>
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-white">
              Insights Executivos — IA Gemini
            </h3>
            <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
              Análise gerada por IA com base nos dados consolidados do ciclo {CYCLE_LABEL}
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: isLoading
              ? 'rgba(43,79,129,0.3)'
              : 'linear-gradient(135deg, #1a3a5c 0%, #2B4F81 100%)',
            color: '#60A5FA',
            border: '1px solid rgba(43,79,129,0.5)',
          }}
        >
          {isLoading ? (
            <>
              <SpinnerIcon />
              Analisando...
            </>
          ) : hasGenerated && response ? (
            <>
              <RefreshIcon />
              Regenerar
            </>
          ) : (
            <>
              <SparkleIcon />
              Gerar Análise
            </>
          )}
        </button>
      </div>

      {/* Content */}
      {!hasGenerated && !isLoading && (
        <EmptyState onGenerate={handleGenerate} cycleLabel={CYCLE_LABEL} analystCount={targetAnalysts.length} />
      )}

      {(isLoading || (hasGenerated && response)) && (
        <div className="space-y-4">
          {isLoading && !response && (
            <LoadingState />
          )}

          {response && sections.length > 0 ? (
            sections.map((section, idx) => (
              <InsightSection key={idx} section={section} index={idx} isStreaming={isLoading && idx === sections.length - 1} />
            ))
          ) : response ? (
            <div
              className="rounded-xl p-5 text-sm leading-relaxed whitespace-pre-wrap"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#C9D1D9',
              }}
            >
              {response}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Section Parser ────────────────────────────────────────────────────────────

interface ParsedSection {
  title: string;
  emoji: string;
  content: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

function parseSections(text: string): ParsedSection[] {
  if (!text) return [];

  const sectionDefs = [
    {
      keywords: ['Gargalos Operacionais', 'Gargalo'],
      emoji: '🔴',
      color: '#F87171',
      bgColor: 'rgba(239,68,68,0.06)',
      borderColor: 'rgba(239,68,68,0.2)',
    },
    {
      keywords: ['Temas Prioritários', 'Treinamento', 'Temas para Treinamento'],
      emoji: '📚',
      color: '#FBBF24',
      bgColor: 'rgba(234,179,8,0.06)',
      borderColor: 'rgba(234,179,8,0.2)',
    },
    {
      keywords: ['Padrões de Acerto', 'Reconhecimento', 'Acerto'],
      emoji: '✅',
      color: '#34D399',
      bgColor: 'rgba(34,197,94,0.06)',
      borderColor: 'rgba(34,197,94,0.2)',
    },
  ];

  // Split by numbered headings like **1. ...** or ## 1. ...
  const parts = text.split(/(?=\*\*\d+\.|##\s*\d+\.|\n\d+\.)/);

  const sections: ParsedSection[] = [];

  for (const part of parts) {
    if (!part.trim()) continue;

    for (const def of sectionDefs) {
      const matches = def.keywords.some((kw) =>
        part.toLowerCase().includes(kw.toLowerCase())
      );
      if (matches) {
        // Extract title from first line
        const lines = part.trim().split('\n');
        const rawTitle = lines[0]
          .replace(/\*\*/g, '')
          .replace(/^#+\s*/, '')
          .replace(/^\d+\.\s*/, '')
          .replace(/^[🔴📚✅]\s*/, '')
          .trim();

        const content = lines
          .slice(1)
          .join('\n')
          .replace(/\*\*/g, '')
          .trim();

        if (content) {
          sections.push({
            title: rawTitle || def.keywords[0],
            emoji: def.emoji,
            content,
            color: def.color,
            bgColor: def.bgColor,
            borderColor: def.borderColor,
          });
        }
        break;
      }
    }
  }

  // Fallback: if parsing failed but we have text, return raw
  return sections;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function InsightSection({
  section,
  index,
  isStreaming,
}: {
  section: ParsedSection;
  index: number;
  isStreaming: boolean;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: section.bgColor,
        border: `1px solid ${section.borderColor}`,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{section.emoji}</span>
        <h4 className="font-display text-sm font-semibold" style={{ color: section.color }}>
          {section.title}
        </h4>
        {isStreaming && (
          <span
            className="inline-block w-1.5 h-4 rounded-sm animate-pulse ml-1"
            style={{ background: section.color }}
          />
        )}
      </div>
      <div
        className="text-sm leading-relaxed whitespace-pre-wrap"
        style={{ color: '#C9D1D9' }}
      >
        {section.content}
      </div>
    </div>
  );
}

function EmptyState({
  onGenerate,
  cycleLabel,
  analystCount,
}: {
  onGenerate: () => void;
  cycleLabel: string;
  analystCount: number;
}) {
  return (
    <div
      className="rounded-xl p-8 flex flex-col items-center justify-center text-center"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px dashed rgba(255,255,255,0.1)',
        minHeight: '200px',
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(43,79,129,0.15)', border: '1px solid rgba(43,79,129,0.3)' }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      </div>
      <p className="font-display text-sm font-semibold text-white mb-1">
        Análise Executiva Pronta para Geração
      </p>
      <p className="text-xs mb-5" style={{ color: '#8B949E', maxWidth: '380px' }}>
        Clique em <strong style={{ color: '#60A5FA' }}>Gerar Análise</strong> para que o Gemini analise os dados de{' '}
        <strong style={{ color: '#C9D1D9' }}>{analystCount} analistas</strong> do ciclo{' '}
        <strong style={{ color: '#C9D1D9' }}>{cycleLabel}</strong> e identifique gargalos, temas de treinamento e padrões de acerto.
      </p>
      <button
        onClick={onGenerate}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
        style={{
          background: 'linear-gradient(135deg, #1a3a5c 0%, #2B4F81 100%)',
          color: '#60A5FA',
          border: '1px solid rgba(43,79,129,0.5)',
        }}
      >
        <SparkleIcon />
        Gerar Análise com Gemini
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {[
        { label: 'Identificando gargalos operacionais...', color: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.2)' },
        { label: 'Mapeando temas de treinamento...', color: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.2)' },
        { label: 'Reconhecendo padrões de acerto...', color: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
      ].map((item, i) => (
        <div
          key={i}
          className="rounded-xl p-4 flex items-center gap-3 animate-pulse"
          style={{ background: item.color, border: `1px solid ${item.border}` }}
        >
          <div className="w-4 h-4 rounded-full bg-white/10 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 rounded bg-white/10 w-3/4" />
            <div className="h-2.5 rounded bg-white/5 w-1/2" />
          </div>
          <span className="text-xs" style={{ color: '#8B949E' }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
      <path d="M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75z" />
      <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
