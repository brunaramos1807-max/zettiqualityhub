'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Feedback PDF Export ──────────────────────────────────────────────────────

export interface FeedbackPDFData {
  analista: {
    nome: string;
    cargo: string;
    equipe: string;
    coordenador: string;
    tempoEmpresa: string;
    fotoUrl?: string;
  };
  ciclo: string;
  periodoInicio?: string;
  periodoFim?: string;
  qaScore?: number;
  iepcScore?: number;
  aderenciaScore?: number;
  posicaoSquad?: number;
  totalSquad?: number;
  ciclosConsecutivos?: number;
  resumoCiclo?: string;
  evolucaoTecnica?: string;
  evolucaoComportamental?: string;
  riscoOperacional?: string;
  pilares_qa?: Array<{ nome: string; pontuacao: number; max: number; variacao?: number }>;
  pilares_iepc?: Array<{ nome: string; pontuacao: number; max: number; variacao?: number }>;
  pontosFortes?: Array<{ titulo: string; descricao: string }>;
  oportunidades?: Array<{ titulo: string; descricao: string }>;
  coaching?: Array<{ o_que_foi_dito: string; como_poderia_ser: string; dica_de_ouro: string }>;
  atendimentos?: Array<{
    protocolo: string; cliente: string; assunto: string;
    nota_qa: number; nota_iepc: number; classificacao: string; observacao?: string;
  }>;
  pdi?: Array<{
    objetivo: string; acao_desenvolvimento: string; prazo: string;
    progresso: number; status: string;
  }>;
  conquistas?: Array<{ titulo: string; valor: string; periodo?: string }>;
  historico?: Array<{ ciclo: string; qa_score: number; iepc_score: number }>;
}

// ─── Corporate color palette ──────────────────────────────────────────────────
const DARK_BG = [10, 22, 40] as [number, number, number];
const DARK_SURFACE = [13, 31, 60] as [number, number, number];
const BLUE = [42, 82, 152] as [number, number, number];
const BLUE_LIGHT = [91, 141, 239] as [number, number, number];
const TEAL = [78, 205, 196] as [number, number, number];
const GREEN = [82, 183, 136] as [number, number, number];
const AMBER = [212, 168, 83] as [number, number, number];
const RED = [192, 57, 43] as [number, number, number];
const WHITE = [255, 255, 255] as [number, number, number];
const GRAY = [148, 163, 184] as [number, number, number];
const LIGHT_BG = [248, 250, 252] as [number, number, number];
const SECTION_BG = [241, 245, 249] as [number, number, number];

function addPageHeader(doc: jsPDF, title: string, pageNum: number, totalPages: number, ciclo: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...DARK_BG);
  doc.rect(0, 0, w, 16, 'F');
  doc.setFillColor(...BLUE);
  doc.rect(0, 16, w, 1.5, 'F');

  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('QUALIVISÃO', 10, 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text(`People Analytics  ·  Ciclo ${ciclo}  ·  ${title}`, 10, 14);

  doc.setTextColor(...GRAY);
  doc.text(`Pág. ${pageNum} / ${totalPages}`, w - 10, 9, { align: 'right' });
  doc.text('Documento Confidencial · Uso Interno', w - 10, 14, { align: 'right' });
}

function addSectionTitle(doc: jsPDF, title: string, y: number, color: [number, number, number] = BLUE): number {
  doc.setFillColor(...color);
  doc.rect(10, y, 2.5, 5.5, 'F');
  doc.setTextColor(...color);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), 15, y + 4.5);
  return y + 11;
}

function addTextBlock(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, color: [number, number, number] = [30, 41, 59]): number {
  doc.setTextColor(...color);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * 4.8;
}

function scoreBox(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string, color: [number, number, number]) {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...color);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setTextColor(...GRAY);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text(label, x + w / 2, y + 4.5, { align: 'center' });
  doc.setTextColor(...color);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(value, x + w / 2, y + 13, { align: 'center' });
}

// ─── Load image as base64 ─────────────────────────────────────────────────────

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportFeedbackPDF(data: FeedbackPDFData): Promise<void> {
  // Pre-load analyst photo
  let photoBase64: string | null = null;
  if (data.analista.fotoUrl) {
    photoBase64 = await loadImageAsBase64(data.analista.fotoUrl);
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentW = pageW - margin * 2;
  const totalPages = 5;
  let currentPage = 1;

  // ══════════════════════════════════════════════════════════
  // PAGE 1 — Header + Resumo + Indicadores
  // ══════════════════════════════════════════════════════════
  addPageHeader(doc, 'Avaliação Executiva', currentPage, totalPages, data.ciclo);

  // Hero block — compact
  const heroY = 20;
  const heroH = 44;
  doc.setFillColor(...DARK_BG);
  doc.rect(0, heroY, pageW, heroH, 'F');
  doc.setFillColor(...BLUE);
  doc.rect(0, heroY, 2, heroH, 'F');

  // Photo
  const photoSize = 30;
  const photoX = margin + 4;
  const photoY = heroY + 7;

  if (photoBase64) {
    try {
      doc.addImage(photoBase64, 'JPEG', photoX, photoY, photoSize, photoSize, undefined, 'FAST');
      // Photo border
      doc.setDrawColor(...BLUE_LIGHT);
      doc.setLineWidth(0.5);
      doc.rect(photoX, photoY, photoSize, photoSize);
    } catch {
      // fallback: initials box
      doc.setFillColor(26, 58, 110);
      doc.rect(photoX, photoY, photoSize, photoSize, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const initials = data.analista.nome.split(' ').slice(0, 2).map((n) => n[0]).join('');
      doc.text(initials, photoX + photoSize / 2, photoY + photoSize / 2 + 3, { align: 'center' });
    }
  } else {
    doc.setFillColor(26, 58, 110);
    doc.rect(photoX, photoY, photoSize, photoSize, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const initials = data.analista.nome.split(' ').slice(0, 2).map((n) => n[0]).join('');
    doc.text(initials, photoX + photoSize / 2, photoY + photoSize / 2 + 3, { align: 'center' });
  }

  // Analyst info
  const infoX = photoX + photoSize + 6;
  doc.setTextColor(...WHITE);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(data.analista.nome, infoX, heroY + 13);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(data.analista.cargo || 'Analista de Suporte', infoX, heroY + 19);
  doc.text(`Equipe: ${data.analista.equipe || '—'}  ·  Coordenadora: ${data.analista.coordenador || '—'}`, infoX, heroY + 25);
  doc.text(`Tempo de empresa: ${data.analista.tempoEmpresa || '—'}`, infoX, heroY + 31);

  // Ciclo badge (top right)
  doc.setFillColor(...BLUE);
  doc.roundedRect(pageW - 42, heroY + 5, 32, 10, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(`CICLO ${data.ciclo}`, pageW - 26, heroY + 11, { align: 'center' });

  if (data.periodoInicio) {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(`${data.periodoInicio}${data.periodoFim ? ` a ${data.periodoFim}` : ''}`, pageW - 26, heroY + 18, { align: 'center' });
  }

  // Status
  doc.setFillColor(...GREEN);
  doc.roundedRect(pageW - 42, heroY + 30, 32, 7, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Concluído', pageW - 26, heroY + 35, { align: 'center' });

  // Score boxes — compact row
  const boxY = heroY + heroH + 4;
  const boxW = 28;
  const boxH = 20;
  const boxGap = 3;
  const startX = margin;

  scoreBox(doc, startX, boxY, boxW, boxH, 'QA', data.qaScore != null ? `${data.qaScore}` : '—', BLUE_LIGHT);
  scoreBox(doc, startX + boxW + boxGap, boxY, boxW, boxH, 'IEPC', data.iepcScore != null ? `${data.iepcScore}%` : '—', GREEN);
  scoreBox(doc, startX + (boxW + boxGap) * 2, boxY, boxW, boxH, 'ADERÊNCIA', data.aderenciaScore != null ? `${data.aderenciaScore}%` : '—', TEAL);
  if (data.posicaoSquad != null) {
    scoreBox(doc, startX + (boxW + boxGap) * 3, boxY, boxW, boxH, 'POSIÇÃO', `Top ${data.posicaoSquad}`, AMBER);
  }
  if (data.ciclosConsecutivos && data.ciclosConsecutivos > 0) {
    scoreBox(doc, startX + (boxW + boxGap) * 4, boxY, boxW, boxH, 'CICLOS EVOL.', `${data.ciclosConsecutivos}`, GREEN);
  }

  let y = boxY + boxH + 8;

  // Resumo Executivo
  if (data.resumoCiclo) {
    if (y > pageH - 50) { doc.addPage(); currentPage++; addPageHeader(doc, 'Resumo Executivo', currentPage, totalPages, data.ciclo); y = 24; }
    y = addSectionTitle(doc, 'Resumo Executivo do Ciclo', y, BLUE);
    doc.setFillColor(...SECTION_BG);
    const resumoLines = doc.splitTextToSize(data.resumoCiclo, contentW - 6);
    const resumoH = resumoLines.length * 4.8 + 6;
    doc.roundedRect(margin, y - 2, contentW, resumoH, 2, 2, 'F');
    y = addTextBlock(doc, data.resumoCiclo, margin + 3, y + 2, contentW - 6, [30, 41, 59]);
    y += 7;
  }

  // Performance por Pilar — QA
  if (data.pilares_qa && data.pilares_qa.length > 0) {
    if (y > pageH - 55) { doc.addPage(); currentPage++; addPageHeader(doc, 'Performance QA', currentPage, totalPages, data.ciclo); y = 24; }
    y = addSectionTitle(doc, 'Performance por Pilar — QA', y, BLUE_LIGHT);
    autoTable(doc, {
      startY: y,
      head: [['Pilar', 'Pontuação', 'Máximo', 'Evolução']],
      body: data.pilares_qa.map((p) => [
        p.nome,
        p.pontuacao,
        p.max,
        p.variacao !== undefined ? (p.variacao >= 0 ? `+${p.variacao} pts` : `${p.variacao} pts`) : '—',
      ]),
      styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
      headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: SECTION_BG },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable?.finalY + 7 || y + 35;
  }

  // Performance por Pilar — IEPC
  if (data.pilares_iepc && data.pilares_iepc.length > 0) {
    if (y > pageH - 55) { doc.addPage(); currentPage++; addPageHeader(doc, 'Performance IEPC', currentPage, totalPages, data.ciclo); y = 24; }
    y = addSectionTitle(doc, 'Performance por Pilar — IEPC', y, TEAL);
    autoTable(doc, {
      startY: y,
      head: [['Pilar', 'Pontuação', 'Máximo', 'Evolução']],
      body: data.pilares_iepc.map((p) => [
        p.nome,
        p.pontuacao,
        p.max,
        p.variacao !== undefined ? (p.variacao >= 0 ? `+${p.variacao} pts` : `${p.variacao} pts`) : '—',
      ]),
      styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
      headStyles: { fillColor: [42, 130, 120], textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: SECTION_BG },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable?.finalY + 7 || y + 35;
  }

  // Histórico
  if (data.historico && data.historico.length > 1) {
    if (y > pageH - 45) { doc.addPage(); currentPage++; addPageHeader(doc, 'Evolução Histórica', currentPage, totalPages, data.ciclo); y = 24; }
    y = addSectionTitle(doc, 'Evolução Histórica', y, GREEN);
    autoTable(doc, {
      startY: y,
      head: [['Ciclo', 'QA', 'IEPC']],
      body: data.historico.map((h) => [h.ciclo, h.qa_score, h.iepc_score]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: SECTION_BG },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable?.finalY + 7 || y + 28;
  }

  // ══════════════════════════════════════════════════════════
  // PAGE 2 — Pontos Fortes + Oportunidades + Evolução + Coaching
  // ══════════════════════════════════════════════════════════
  doc.addPage();
  currentPage++;
  addPageHeader(doc, 'Evolução & Coaching', currentPage, totalPages, data.ciclo);
  y = 24;

  // Pontos Fortes
  if (data.pontosFortes && data.pontosFortes.length > 0) {
    y = addSectionTitle(doc, 'Pontos Fortes', y, GREEN);
    data.pontosFortes.slice(0, 5).forEach((p) => {
      if (y > pageH - 28) { doc.addPage(); currentPage++; addPageHeader(doc, 'Pontos Fortes', currentPage, totalPages, data.ciclo); y = 24; }
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(...GREEN);
      const lines = doc.splitTextToSize(`${p.titulo}: ${p.descricao}`, contentW - 8);
      const h = lines.length * 4.8 + 5;
      doc.roundedRect(margin, y, contentW, h, 2, 2, 'FD');
      doc.setTextColor(21, 128, 61);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('✓', margin + 2.5, y + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(lines, margin + 7, y + 4.5);
      y += h + 2.5;
    });
    y += 4;
  }

  // Oportunidades
  if (data.oportunidades && data.oportunidades.length > 0) {
    if (y > pageH - 35) { doc.addPage(); currentPage++; addPageHeader(doc, 'Oportunidades', currentPage, totalPages, data.ciclo); y = 24; }
    y = addSectionTitle(doc, 'Oportunidades de Evolução', y, AMBER);
    data.oportunidades.slice(0, 5).forEach((o) => {
      if (y > pageH - 28) { doc.addPage(); currentPage++; addPageHeader(doc, 'Oportunidades', currentPage, totalPages, data.ciclo); y = 24; }
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(...AMBER);
      const lines = doc.splitTextToSize(`${o.titulo}: ${o.descricao}`, contentW - 8);
      const h = lines.length * 4.8 + 5;
      doc.roundedRect(margin, y, contentW, h, 2, 2, 'FD');
      doc.setTextColor(154, 52, 18);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('→', margin + 2.5, y + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(lines, margin + 7, y + 4.5);
      y += h + 2.5;
    });
    y += 4;
  }

  // Evolução Técnica
  if (data.evolucaoTecnica) {
    if (y > pageH - 55) { doc.addPage(); currentPage++; addPageHeader(doc, 'Evolução Técnica', currentPage, totalPages, data.ciclo); y = 24; }
    y = addSectionTitle(doc, 'Evolução Técnica', y, BLUE_LIGHT);
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(...BLUE_LIGHT);
    const lines = doc.splitTextToSize(data.evolucaoTecnica, contentW - 6);
    const h = lines.length * 4.8 + 6;
    if (y + h > pageH - 18) { doc.addPage(); currentPage++; addPageHeader(doc, 'Evolução Técnica', currentPage, totalPages, data.ciclo); y = 24; }
    doc.roundedRect(margin, y, contentW, h, 2, 2, 'FD');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(lines, margin + 3, y + 4.5);
    y += h + 7;
  }

  // Evolução Comportamental
  if (data.evolucaoComportamental) {
    if (y > pageH - 55) { doc.addPage(); currentPage++; addPageHeader(doc, 'Evolução Comportamental', currentPage, totalPages, data.ciclo); y = 24; }
    y = addSectionTitle(doc, 'Evolução Comportamental', y, [139, 126, 200]);
    doc.setFillColor(245, 243, 255);
    doc.setDrawColor(139, 126, 200);
    const lines = doc.splitTextToSize(data.evolucaoComportamental, contentW - 6);
    const h = lines.length * 4.8 + 6;
    if (y + h > pageH - 18) { doc.addPage(); currentPage++; addPageHeader(doc, 'Evolução Comportamental', currentPage, totalPages, data.ciclo); y = 24; }
    doc.roundedRect(margin, y, contentW, h, 2, 2, 'FD');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(lines, margin + 3, y + 4.5);
    y += h + 7;
  }

  // Risco Operacional
  if (data.riscoOperacional) {
    if (y > pageH - 45) { doc.addPage(); currentPage++; addPageHeader(doc, 'Risco Operacional', currentPage, totalPages, data.ciclo); y = 24; }
    y = addSectionTitle(doc, 'Risco Operacional', y, RED);
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(...RED);
    const lines = doc.splitTextToSize(data.riscoOperacional, contentW - 6);
    const h = lines.length * 4.8 + 6;
    doc.roundedRect(margin, y, contentW, h, 2, 2, 'FD');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(lines, margin + 3, y + 4.5);
    y += h + 7;
  }

  // Coaching
  if (data.coaching && data.coaching.length > 0) {
    if (y > pageH - 55) { doc.addPage(); currentPage++; addPageHeader(doc, 'Coaching de Comunicação', currentPage, totalPages, data.ciclo); y = 24; }
    y = addSectionTitle(doc, 'Coaching de Comunicação', y, BLUE);
    data.coaching.forEach((c) => {
      if (y > pageH - 45) { doc.addPage(); currentPage++; addPageHeader(doc, 'Coaching de Comunicação', currentPage, totalPages, data.ciclo); y = 24; }

      const col = (contentW - 4) / 3;
      const l1 = doc.splitTextToSize(`"${c.o_que_foi_dito}"`, col - 4);
      const l2 = doc.splitTextToSize(c.como_poderia_ser, col - 4);
      const l3 = doc.splitTextToSize(c.dica_de_ouro, col - 4);
      const maxH = Math.max(l1.length, l2.length, l3.length) * 4.5 + 11;

      if (y + maxH > pageH - 18) { doc.addPage(); currentPage++; addPageHeader(doc, 'Coaching', currentPage, totalPages, data.ciclo); y = 24; }

      doc.setFillColor(240, 249, 255);
      doc.setDrawColor(...BLUE_LIGHT);
      doc.roundedRect(margin, y, col, maxH, 2, 2, 'FD');
      doc.setTextColor(30, 64, 175);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text('O QUE FOI DITO', margin + 2, y + 5.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(30, 41, 59);
      doc.text(l1, margin + 2, y + 10);

      const x2 = margin + col + 2;
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(...AMBER);
      doc.roundedRect(x2, y, col, maxH, 2, 2, 'FD');
      doc.setTextColor(161, 98, 7);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text('COMO PODERIA SER', x2 + 2, y + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(l2, x2 + 2, y + 10);

      const x3 = margin + (col + 2) * 2;
      doc.setFillColor(240, 253, 250);
      doc.setDrawColor(...TEAL);
      doc.roundedRect(x3, y, col, maxH, 2, 2, 'FD');
      doc.setTextColor(42, 130, 120);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text('★ DICA DE OURO', x3 + 2, y + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(l3, x3 + 2, y + 10);

      y += maxH + 7;
    });
  }

  // ══════════════════════════════════════════════════════════
  // PAGE 3 — Atendimentos Avaliados
  // ══════════════════════════════════════════════════════════
  doc.addPage();
  currentPage++;
  addPageHeader(doc, 'Atendimentos Avaliados', currentPage, totalPages, data.ciclo);
  y = 24;

  if (data.atendimentos && data.atendimentos.length > 0) {
    y = addSectionTitle(doc, `Atendimentos Avaliados (${data.atendimentos.length})`, y, BLUE);
    autoTable(doc, {
      startY: y,
      head: [['Protocolo', 'Cliente', 'Assunto', 'QA', 'IEPC', 'Classificação']],
      body: data.atendimentos.map((a) => [
        a.protocolo || '—',
        a.cliente || '—',
        a.assunto || '—',
        a.nota_qa ?? '—',
        a.nota_iepc != null ? `${a.nota_iepc}%` : '—',
        a.classificacao ? a.classificacao.charAt(0).toUpperCase() + a.classificacao.slice(1) : '—',
      ]),
      styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: SECTION_BG },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold' },
        1: { cellWidth: 30 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 22, halign: 'center' },
      },
      margin: { left: margin, right: margin },
      didParseCell: (hookData) => {
        if (hookData.column.index === 5 && hookData.section === 'body') {
          const val = String(hookData.cell.raw || '').toLowerCase();
          if (val === 'excelente') hookData.cell.styles.textColor = [21, 128, 61];
          else if (val === 'bom') hookData.cell.styles.textColor = [30, 64, 175];
          else if (val === 'regular') hookData.cell.styles.textColor = [161, 98, 7];
          else if (val === 'crítico' || val === 'critico') hookData.cell.styles.textColor = [185, 28, 28];
        }
      },
    });
    y = (doc as any).lastAutoTable?.finalY + 7 || y + 55;

    const withObs = data.atendimentos.filter((a) => a.observacao);
    if (withObs.length > 0) {
      if (y > pageH - 35) { doc.addPage(); currentPage++; addPageHeader(doc, 'Observações', currentPage, totalPages, data.ciclo); y = 24; }
      y = addSectionTitle(doc, 'Observações dos Atendimentos', y, GRAY);
      withObs.forEach((a) => {
        if (y > pageH - 28) { doc.addPage(); currentPage++; addPageHeader(doc, 'Observações', currentPage, totalPages, data.ciclo); y = 24; }
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text(`${a.protocolo || '—'} — ${a.cliente || '—'}`, margin, y);
        y += 4.5;
        y = addTextBlock(doc, a.observacao!, margin + 2, y, contentW - 4, [30, 41, 59]);
        y += 3.5;
      });
    }
  } else {
    doc.setTextColor(...GRAY);
    doc.setFontSize(8.5);
    doc.text('Nenhum atendimento avaliado neste ciclo.', margin, y + 8);
  }

  // ══════════════════════════════════════════════════════════
  // PAGE 4 — Analytics: Conquistas + Histórico
  // ══════════════════════════════════════════════════════════
  doc.addPage();
  currentPage++;
  addPageHeader(doc, 'Analytics & Conquistas', currentPage, totalPages, data.ciclo);
  y = 24;

  if (data.conquistas && data.conquistas.length > 0) {
    y = addSectionTitle(doc, 'Conquistas e Evolução', y, AMBER);
    autoTable(doc, {
      startY: y,
      head: [['Conquista', 'Valor', 'Período']],
      body: data.conquistas.map((c) => [c.titulo, c.valor, c.periodo || '—']),
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      headStyles: { fillColor: [161, 98, 7], textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 251, 235] },
      columnStyles: { 1: { fontStyle: 'bold', textColor: [21, 128, 61] }, 2: { halign: 'center' } },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable?.finalY + 10 || y + 35;
  }

  if (data.historico && data.historico.length > 0) {
    if (y > pageH - 45) { doc.addPage(); currentPage++; addPageHeader(doc, 'Histórico', currentPage, totalPages, data.ciclo); y = 24; }
    y = addSectionTitle(doc, 'Histórico de Ciclos', y, GREEN);
    autoTable(doc, {
      startY: y,
      head: [['Ciclo', 'QA', 'IEPC']],
      body: data.historico.map((h) => [h.ciclo, h.qa_score, h.iepc_score]),
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: SECTION_BG },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable?.finalY + 10 || y + 35;
  }

  // ══════════════════════════════════════════════════════════
  // PAGE 5 — Fechamento Institucional
  // ══════════════════════════════════════════════════════════
  doc.addPage();
  currentPage++;
  addPageHeader(doc, 'Fechamento Institucional', currentPage, totalPages, data.ciclo);
  y = 24;

  // Summary block
  doc.setFillColor(...DARK_BG);
  doc.rect(margin, y, contentW, 42, 'F');
  doc.setFillColor(...BLUE);
  doc.rect(margin, y, 2, 42, 'F');

  // Photo in closing page too
  if (photoBase64) {
    try {
      doc.addImage(photoBase64, 'JPEG', margin + 5, y + 6, 22, 22, undefined, 'FAST');
    } catch { /* skip */ }
  }

  const closingInfoX = photoBase64 ? margin + 32 : margin + 8;

  doc.setTextColor(...WHITE);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(data.analista.nome, closingInfoX, y + 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(`Ciclo: ${data.ciclo}  ·  QA: ${data.qaScore ?? '—'}  ·  IEPC: ${data.iepcScore ?? '—'}%  ·  Aderência: ${data.aderenciaScore ?? '—'}%`, closingInfoX, y + 19);
  if (data.posicaoSquad) {
    doc.text(`Posição no Squad: Top ${data.posicaoSquad} de ${data.totalSquad || '?'} analistas`, closingInfoX, y + 25);
  }
  if (data.ciclosConsecutivos && data.ciclosConsecutivos > 0) {
    doc.setTextColor(...GREEN);
    doc.text(`✓ ${data.ciclosConsecutivos} ciclos consecutivos em evolução`, closingInfoX, y + 31);
  }

  doc.setTextColor(...AMBER);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Desenvolvimento e evolução contínua.', closingInfoX, y + 39);

  y += 50;

  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(...BLUE_LIGHT);
  doc.roundedRect(margin, y, contentW, 18, 2, 2, 'FD');
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Você está no caminho certo!', pageW / 2, y + 7, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text('Continue evoluindo. Cada ciclo é uma oportunidade de crescimento profissional.', pageW / 2, y + 13, { align: 'center' });

  y += 25;

  doc.setFillColor(...SECTION_BG);
  doc.roundedRect(margin, y, contentW, 24, 2, 2, 'F');
  doc.setTextColor(...GRAY);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento confidencial · Uso interno · QualiVisão People Analytics © 2026', pageW / 2, y + 7, { align: 'center' });

  const now = new Date();
  const dateStr = `${now.toLocaleDateString('pt-BR')} às ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  doc.text(`Gerado em: ${dateStr}  ·  Ciclo: ${data.ciclo}  ·  Versão 1.0`, pageW / 2, y + 13, { align: 'center' });
  doc.setTextColor(...BLUE_LIGHT);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('QualiVisão', pageW / 2, y + 21, { align: 'center' });

  // Page numbers
  const totalPagesActual = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPagesActual; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text(`QualiVisão People Analytics  ·  ${data.ciclo}  ·  Pág. ${i} / ${totalPagesActual}`, pageW / 2, pageH - 4, { align: 'center' });
  }

  doc.save(`feedback_${data.analista.nome.replace(/\s+/g, '_')}_${data.ciclo.replace('/', '-')}.pdf`);
}

// ─── Cycle PDF Export (existing) ─────────────────────────────────────────────

export interface PDFReportData {
  periodo: string;
  scores: Array<{
    analista: string;
    squad: string;
    nota_final_qa: number;
    iepc_total: number;
    total_ncs: number;
    p1: number; p2: number; p3: number; p4: number; p5: number;
    e1: number; e2: number; e3: number; e4: number; e5: number;
  }>;
  ncs: Array<{
    analista: string;
    squad: string;
    tipo_nc: string;
    descricao?: string;
    pontos_deduzidos: number;
  }>;
  elogios: Array<{
    colaborador: string;
    squad: string;
    elogio: string;
  }>;
}

export function exportCyclePDF(data: PDFReportData): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleDateString('pt-BR');

  doc.setFillColor(13, 17, 23);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Portal da Qualidade — Relatório do Ciclo', 14, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text(`Período: ${data.periodo}   |   Gerado em: ${now}`, 14, 22);

  const totalAnalistas = data.scores.length;
  const avgQA = totalAnalistas > 0 ? (data.scores.reduce((s, r) => s + r.nota_final_qa, 0) / totalAnalistas).toFixed(2) : '—';
  const avgIEPC = totalAnalistas > 0 ? (data.scores.reduce((s, r) => s + r.iepc_total, 0) / totalAnalistas).toFixed(2) : '—';

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Analistas: ${totalAnalistas}   |   QA Média: ${avgQA}   |   IEPC Médio: ${avgIEPC}   |   NCs: ${data.ncs.length}   |   Elogios: ${data.elogios.length}`, 14, 34);

  if (data.scores.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('Pontuações QA / IEPC por Analista', 14, 42);
    autoTable(doc, {
      startY: 46,
      head: [['Analista', 'Squad', 'QA', 'IEPC', 'NCs', 'P1', 'P2', 'P3', 'P4', 'P5', 'E1', 'E2', 'E3', 'E4', 'E5']],
      body: data.scores.map((s) => [s.analista, s.squad, s.nota_final_qa.toFixed(2), s.iepc_total.toFixed(2), s.total_ncs, s.p1, s.p2, s.p3, s.p4, s.p5, s.e1, s.e2, s.e3, s.e4, s.e5]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
  }

  if (data.ncs.length > 0) {
    const lastY = (doc as any).lastAutoTable?.finalY ?? 46;
    const pageHeight = doc.internal.pageSize.getHeight();
    const startY = lastY + 10 + 40 > pageHeight ? (() => { doc.addPage(); return 20; })() : lastY + 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text('Não Conformidades', 14, startY);
    autoTable(doc, {
      startY: startY + 4,
      head: [['Analista', 'Squad', 'Tipo de NC', 'Descrição', 'Pontos Deduzidos']],
      body: data.ncs.map((n) => [n.analista, n.squad, n.tipo_nc, n.descricao || '—', n.pontos_deduzidos]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 248, 248] },
      margin: { left: 14, right: 14 },
    });
  }

  if (data.elogios.length > 0) {
    const lastY2 = (doc as any).lastAutoTable?.finalY ?? 46;
    const pageHeight = doc.internal.pageSize.getHeight();
    const startY2 = lastY2 + 10 + 40 > pageHeight ? (() => { doc.addPage(); return 20; })() : lastY2 + 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text('Elogios', 14, startY2);
    autoTable(doc, {
      startY: startY2 + 4,
      head: [['Colaborador', 'Squad', 'Elogio']],
      body: data.elogios.map((e) => [e.colaborador, e.squad, e.elogio]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 255, 244] },
      margin: { left: 14, right: 14 },
    });
  }

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Portal da Qualidade — ${data.periodo} — Página ${i} de ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });
  }

  doc.save(`relatorio_ciclo_${data.periodo.replace('/', '-')}.pdf`);
}
