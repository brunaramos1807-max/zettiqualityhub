'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  // ── Header ──────────────────────────────────────────────────────────────────
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

  // ── KPI Summary ─────────────────────────────────────────────────────────────
  const totalAnalistas = data.scores.length;
  const avgQA = totalAnalistas > 0
    ? (data.scores.reduce((s, r) => s + r.nota_final_qa, 0) / totalAnalistas).toFixed(2)
    : '—';
  const avgIEPC = totalAnalistas > 0
    ? (data.scores.reduce((s, r) => s + r.iepc_total, 0) / totalAnalistas).toFixed(2)
    : '—';
  const totalNCs = data.ncs.length;
  const totalElogios = data.elogios.length;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Analistas: ${totalAnalistas}   |   QA Média: ${avgQA}   |   IEPC Médio: ${avgIEPC}   |   NCs: ${totalNCs}   |   Elogios: ${totalElogios}`,
    14,
    34
  );

  // ── Scores Table ─────────────────────────────────────────────────────────────
  if (data.scores.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('Pontuações QA / IEPC por Analista', 14, 42);

    autoTable(doc, {
      startY: 46,
      head: [['Analista', 'Squad', 'QA', 'IEPC', 'NCs', 'P1', 'P2', 'P3', 'P4', 'P5', 'E1', 'E2', 'E3', 'E4', 'E5']],
      body: data.scores.map((s) => [
        s.analista,
        s.squad,
        s.nota_final_qa.toFixed(2),
        s.iepc_total.toFixed(2),
        s.total_ncs,
        s.p1, s.p2, s.p3, s.p4, s.p5,
        s.e1, s.e2, s.e3, s.e4, s.e5,
      ]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });
  }

  // ── NCs Table ────────────────────────────────────────────────────────────────
  if (data.ncs.length > 0) {
    const lastY = (doc as any).lastAutoTable?.finalY ?? 46;
    const ncStartY = lastY + 10;

    // Add new page if not enough space
    const pageHeight = doc.internal.pageSize.getHeight();
    const startY = ncStartY + 40 > pageHeight ? (() => { doc.addPage(); return 20; })() : ncStartY;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text('Não Conformidades', 14, startY);

    autoTable(doc, {
      startY: startY + 4,
      head: [['Analista', 'Squad', 'Tipo de NC', 'Descrição', 'Pontos Deduzidos']],
      body: data.ncs.map((n) => [
        n.analista,
        n.squad,
        n.tipo_nc,
        n.descricao || '—',
        n.pontos_deduzidos,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 248, 248] },
      margin: { left: 14, right: 14 },
    });
  }

  // ── Elogios Table ─────────────────────────────────────────────────────────────
  if (data.elogios.length > 0) {
    const lastY2 = (doc as any).lastAutoTable?.finalY ?? 46;
    const elogioStartY = lastY2 + 10;

    const pageHeight = doc.internal.pageSize.getHeight();
    const startY2 = elogioStartY + 40 > pageHeight ? (() => { doc.addPage(); return 20; })() : elogioStartY;

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

  // ── Footer ───────────────────────────────────────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Portal da Qualidade — ${data.periodo} — Página ${i} de ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    );
  }

  doc.save(`relatorio_ciclo_${data.periodo.replace('/', '-')}.pdf`);
}
