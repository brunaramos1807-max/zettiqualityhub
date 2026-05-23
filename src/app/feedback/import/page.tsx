'use client';
import React, { useState, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Upload, FileJson, CheckCircle, AlertCircle, X, Eye, Save, Copy, Link2 } from 'lucide-react';

interface PreviewData {
  // Simple format
  analista_email?: string;
  ciclo?: string;
  qa_score?: number;
  iepc_score?: number;
  // Full format
  metadata?: { origem?: string; versao?: string; gerado_em?: string };
  analista?: { nome?: string; email?: string; equipe?: string; coordenador?: string; coach?: string };
  ciclo_obj?: { nome?: string; status?: string };
  scores?: { qa?: number; iepc?: number; aderencia?: number };
  [key: string]: unknown;
}

interface ValidationError { field: string; message: string }

function normalizePayload(data: PreviewData): { email: string; ciclo: string; qa: number; iepc: number } | null {
  // Support both simple and full format
  const email = data.analista_email || data.analista?.email || '';
  const ciclo = data.ciclo || (data.ciclo_obj as Record<string, unknown>)?.nome as string || '';
  const qa = data.qa_score ?? data.scores?.qa ?? 0;
  const iepc = data.iepc_score ?? data.scores?.iepc ?? 0;
  if (!email || !ciclo) return null;
  return { email, ciclo, qa, iepc };
}

function validatePayload(data: PreviewData): ValidationError[] {
  const errors: ValidationError[] = [];
  const norm = normalizePayload(data);
  if (!norm?.email) errors.push({ field: 'analista_email / analista.email', message: 'E-mail do analista é obrigatório' });
  if (!norm?.ciclo) errors.push({ field: 'ciclo / ciclo.nome', message: 'Ciclo é obrigatório' });
  if (!norm?.qa) errors.push({ field: 'qa_score / scores.qa', message: 'Score QA é obrigatório' });
  if (!norm?.iepc) errors.push({ field: 'iepc_score / scores.iepc', message: 'Score IEPC é obrigatório' });
  return errors;
}

const FULL_JSON_EXAMPLE = `{
  "metadata": {
    "origem": "lovable",
    "versao": "1.0",
    "gerado_em": "2026-05-22T10:00:00"
  },
  "analista": {
    "nome": "Fernando Carvalho",
    "email": "fernando@empresa.com",
    "equipe": "Compras e Estoque",
    "coordenador": "Jonatas Jesus",
    "coach": "Bruna Silva"
  },
  "ciclo": {
    "nome": "05/2026",
    "status": "concluido"
  },
  "scores": {
    "qa": 91.31,
    "iepc": 90,
    "aderencia": 87
  },
  "qa_pilares": [
    { "nome": "Gestão do Fluxo", "nota": 22, "maximo": 22 }
  ],
  "iepc_pilares": [
    { "nome": "Resolução Percebida", "nota": 27, "maximo": 30 }
  ],
  "atendimentos": [
    {
      "protocolo": "#449142",
      "sup": "SUP-69017",
      "cliente": "Alex Santos",
      "canal": "WhatsApp",
      "duracao": "30 minutos",
      "assunto": "Divergência no valor unitário líquido",
      "solucao": "Análise técnica e encaminhamento",
      "nota": 89.5,
      "sintese": "Boa condução técnica com rastreabilidade",
      "comportamento": "Postura cordial e proativa",
      "informou_sup": true,
      "criterios": [
        {
          "criterio": "Identificação e Boas-vindas",
          "status": "aderido",
          "pilar": "Gestão do Fluxo",
          "evidencia": "Bom dia Alex..."
        }
      ],
      "nao_conformidades": [],
      "tags": []
    }
  ],
  "coaching": [
    {
      "o_que_foi_dito": "Me manda a imagem novamente?",
      "como_poderia_ser": "Me manda a imagem novamente? Essa que mandou não foi possível abrir.",
      "dica_de_ouro": "Revisar ortografia antes do envio",
      "categoria": "comunicacao"
    }
  ],
  "pontos_fortes": [
    { "titulo": "Boa rastreabilidade", "descricao": "Excelente documentação técnica" }
  ],
  "oportunidades": [
    { "titulo": "Maior formalização de encerramento", "descricao": "Validar entendimento final do cliente" }
  ],
  "pdi": [
    {
      "objetivo": "Fortalecer comunicação escrita",
      "acao": "Revisar mensagens antes do envio",
      "prazo": "Próximo ciclo",
      "status": "em_andamento",
      "progresso": 30
    }
  ],
  "analytics": {
    "ranking_squad": 2,
    "total_analistas": 14,
    "ciclos_consecutivos_evolucao": 3,
    "media_atendimentos": 91,
    "total_nc": 0,
    "total_reincidencias": 1
  },
  "historico": [
    { "ciclo": "04/2026", "qa": 88, "iepc": 84 },
    { "ciclo": "03/2026", "qa": 86, "iepc": 82 }
  ]
}`;

const ENDPOINT_URL = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://zettiquali9387.builtwithrocket.new'}/api/feedbacks/import`;

export default function FeedbackImportPage() {
  const router = useRouter();
  const supabase = createClient();
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [parseError, setParseError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const processFile = useCallback((file: File) => {
    setParseError(''); setErrors([]); setPreview(null); setSaved(false);
    if (!file.name.endsWith('.json')) { setParseError('Apenas arquivos .json são aceitos'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as PreviewData;
        setErrors(validatePayload(data));
        setPreview(data);
      } catch { setParseError('Arquivo JSON inválido ou corrompido'); }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleSave = async () => {
    if (!preview || errors.length > 0) return;
    setSaving(true);
    const norm = normalizePayload(preview);
    if (!norm) { setSaving(false); return; }

    const { data: analista } = await supabase.from('analistas').select('id, nome, equipe, coordenador').eq('email', norm.email).maybeSingle();
    if (!analista) {
      setErrors([{ field: 'analista_email', message: `Analista não encontrado: ${norm.email}` }]);
      setSaving(false); return;
    }

    const { data: existing } = await supabase.from('feedbacks').select('id').eq('analista_id', analista.id).eq('ciclo', norm.ciclo).maybeSingle();
    if (existing) {
      setErrors([{ field: 'ciclo', message: 'Já existe um feedback para este analista neste ciclo' }]);
      setSaving(false); return;
    }

    // Normalize pilares
    const pilaresQa = (preview.qa_pilares as Record<string, unknown>[] || preview.pilares_qa as Record<string, unknown>[] || []).map((p) => ({
      nome: p.nome, pontuacao: p.nota ?? p.pontuacao, max: p.maximo ?? p.max
    }));
    const pilaresIepc = (preview.iepc_pilares as Record<string, unknown>[] || preview.pilares_iepc as Record<string, unknown>[] || []).map((p) => ({
      nome: p.nome, pontuacao: p.nota ?? p.pontuacao, max: p.maximo ?? p.max
    }));

    const { data: fb, error } = await supabase.from('feedbacks').insert({
      analista_id: analista.id,
      ciclo: norm.ciclo,
      qa_score: norm.qa,
      iepc_score: norm.iepc,
      aderencia_score: preview.scores?.aderencia || preview.aderencia_score || null,
      coordenador: preview.analista?.coordenador || preview.coordenador || analista.coordenador,
      equipe: preview.analista?.equipe || preview.equipe || analista.equipe,
      resumo_ciclo: preview.resumo_ciclo || null,
      pilares_qa: pilaresQa,
      pilares_iepc: pilaresIepc,
      pontos_fortes: preview.pontos_fortes || [],
      oportunidades: preview.oportunidades || [],
      tendencias: preview.tendencias || {},
      conquistas: preview.conquistas || [],
      status: 'generated',
      origem: 'importacao_json',
      snapshot_json_completo: preview,
    }).select('id').single();

    if (error || !fb) {
      setErrors([{ field: 'geral', message: error?.message || 'Erro ao salvar' }]);
      setSaving(false); return;
    }

    const atendimentos = (preview.atendimentos as Record<string, unknown>[] || []);
    if (atendimentos.length > 0) {
      await supabase.from('feedback_atendimentos').insert(atendimentos.map((a) => ({
        feedback_id: fb.id,
        protocolo: a.protocolo,
        cliente: a.cliente,
        assunto: a.assunto,
        nota_qa: a.nota ?? a.nota_qa,
        nota_iepc: a.nota_iepc || null,
        classificacao: a.classificacao || null,
        observacao: a.sintese || a.observacao || null,
      })));
    }

    const coaching = (preview.coaching as Record<string, unknown>[] || []);
    if (coaching.length > 0) {
      await supabase.from('feedback_coaching').insert(coaching.map((c) => ({
        feedback_id: fb.id,
        o_que_foi_dito: c.o_que_foi_dito,
        como_poderia_ser: c.como_poderia_ser,
        dica_de_ouro: c.dica_de_ouro,
      })));
    }

    const pdi = (preview.pdi as Record<string, unknown>[] || []);
    if (pdi.length > 0) {
      await supabase.from('feedback_pdi').insert(pdi.map((p) => ({
        feedback_id: fb.id,
        analista_id: analista.id,
        objetivo: p.objetivo,
        acao_desenvolvimento: p.acao || p.acao_desenvolvimento,
        prazo: p.prazo || null,
        progresso: p.progresso ? Number(p.progresso) : 0,
        status: p.status || 'pendente',
      })));
    }

    setSaved(true); setSaving(false);
    setTimeout(() => router.push(`/feedback/${fb.id}`), 1500);
  };

  const norm = preview ? normalizePayload(preview) : null;

  return (
    <EnterpriseLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileJson size={24} className="text-sky-400" /> Importar Feedback JSON
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Upload de arquivo .json ou integração direta via API
          </p>
        </div>

        {/* ── CREDENCIAIS DE INTEGRAÇÃO ── */}
        <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)' }}>
          <h2 className="text-sm font-bold text-sky-400 flex items-center gap-2"><Link2 size={14} /> Integração via API (Lovable)</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>ENDPOINT</p>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <code className="text-xs text-sky-300 flex-1 truncate">POST {ENDPOINT_URL}</code>
                <button onClick={() => copyToClipboard(`POST ${ENDPOINT_URL}`, 'url')} className="flex-shrink-0 hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {copied === 'url' ? <CheckCircle size={12} className="text-green-400" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>AUTENTICAÇÃO</p>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <code className="text-xs text-yellow-300 flex-1">Authorization: Bearer {'<INTEGRATION_API_TOKEN>'}</code>
                <button onClick={() => copyToClipboard('Authorization: Bearer <INTEGRATION_API_TOKEN>', 'token')} className="flex-shrink-0 hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {copied === 'token' ? <CheckCircle size={12} className="text-green-400" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            O token de integração está configurado na variável de ambiente <code className="text-sky-400">INTEGRATION_API_TOKEN</code>. 
            O endpoint aceita tanto o JSON simplificado quanto o JSON completo abaixo.
          </p>
        </div>

        {/* ── DROP ZONE ── */}
        {!preview && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className="rounded-xl p-12 text-center transition-all cursor-pointer"
            style={{ border: `2px dashed ${dragging ? '#38BDF8' : 'rgba(255,255,255,0.12)'}`, backgroundColor: dragging ? 'rgba(56,189,248,0.05)' : 'rgba(255,255,255,0.02)' }}
          >
            <Upload size={40} className="mx-auto mb-4" style={{ color: dragging ? '#38BDF8' : 'rgba(255,255,255,0.2)' }} />
            <p className="text-white font-medium mb-1">Arraste o arquivo JSON aqui</p>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>ou clique para selecionar</p>
            <label className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer bg-sky-600 hover:bg-sky-500 text-white transition-colors">
              Selecionar arquivo
              <input type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
            </label>
          </div>
        )}

        {parseError && (
          <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
            <AlertCircle size={14} /> {parseError}
          </div>
        )}

        {/* ── PREVIEW ── */}
        {preview && !saved && (
          <div className="space-y-4">
            <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2"><Eye size={14} /> Pré-visualização</h3>
                <button onClick={() => { setPreview(null); setErrors([]); }} style={{ color: 'rgba(255,255,255,0.4)' }}><X size={14} /></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {[
                  ['Analista (e-mail)', norm?.email],
                  ['Ciclo', norm?.ciclo],
                  ['QA Score', norm?.qa],
                  ['IEPC Score', norm?.iepc],
                  ['Aderência', preview.scores?.aderencia ?? preview.aderencia_score],
                  ['Equipe', preview.analista?.equipe ?? preview.equipe as string],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
                    <p className="text-white font-medium">{String(value ?? '—')}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 text-xs flex-wrap" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {Array.isArray(preview.atendimentos) && <span>📋 {(preview.atendimentos as unknown[]).length} atendimentos</span>}
                {Array.isArray(preview.coaching) && <span>💬 {(preview.coaching as unknown[]).length} coaching</span>}
                {Array.isArray(preview.pdi) && <span>📈 {(preview.pdi as unknown[]).length} PDI</span>}
                {Array.isArray(preview.qa_pilares) && <span>📊 {(preview.qa_pilares as unknown[]).length} pilares QA</span>}
                {Array.isArray(preview.pontos_fortes) && <span>✅ {(preview.pontos_fortes as unknown[]).length} pontos fortes</span>}
              </div>
            </div>

            {errors.length > 0 && (
              <div className="space-y-1">
                {errors.map((e) => (
                  <div key={e.field} className="flex items-center gap-2 p-2 rounded text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#FCA5A5' }}>
                    <AlertCircle size={12} /> <strong>{e.field}:</strong> {e.message}
                  </div>
                ))}
              </div>
            )}

            {saved && (
              <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#86EFAC' }}>
                <CheckCircle size={14} /> Feedback salvo com sucesso! Redirecionando...
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving || errors.length > 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-50">
                <Save size={14} /> {saving ? 'Salvando...' : 'Confirmar e Salvar'}
              </button>
              <button onClick={() => { setPreview(null); setErrors([]); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}>
                <X size={14} /> Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ── JSON SCHEMA COMPLETO ── */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-sm font-semibold text-white">Contrato JSON Completo (v1.0)</h3>
            <button onClick={() => copyToClipboard(FULL_JSON_EXAMPLE, 'json')}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
              {copied === 'json' ? <><CheckCircle size={11} className="text-green-400" /> Copiado!</> : <><Copy size={11} /> Copiar</>}
            </button>
          </div>
          <pre className="p-4 text-xs overflow-auto max-h-96" style={{ color: 'rgba(56,189,248,0.85)', backgroundColor: 'rgba(0,0,0,0.3)', fontFamily: 'monospace' }}>
            {FULL_JSON_EXAMPLE}
          </pre>
        </div>

        <div className="rounded-lg p-4 text-xs space-y-1" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
          <p className="font-semibold text-white">Regras do contrato:</p>
          <p>• Aceita JSON simplificado <code className="text-sky-400">{'{ analista_email, ciclo, qa_score, iepc_score }'}</code> ou JSON completo acima</p>
          <p>• Campos ausentes são opcionais — o parser normaliza automaticamente</p>
          <p>• Idempotente: reenvio do mesmo payload não duplica o feedback</p>
          <p>• Analista é vinculado automaticamente pelo e-mail cadastrado em Analistas</p>
        </div>
      </div>
    </EnterpriseLayout>
  );
}
