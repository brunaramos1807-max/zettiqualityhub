'use client';
import React, { useState, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Upload, FileJson, CheckCircle, AlertCircle, X, Eye, Save } from 'lucide-react';

interface PreviewData {
  analista_email?: string;
  ciclo?: string;
  qa_score?: number;
  iepc_score?: number;
  aderencia_score?: number;
  resumo_ciclo?: string;
  [key: string]: unknown;
}

interface ValidationError {
  field: string;
  message: string;
}

function validatePayload(data: PreviewData): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!data.analista_email) errors.push({ field: 'analista_email', message: 'E-mail do analista é obrigatório' });
  if (!data.ciclo) errors.push({ field: 'ciclo', message: 'Ciclo é obrigatório' });
  if (data.qa_score === undefined || data.qa_score === null) errors.push({ field: 'qa_score', message: 'Score QA é obrigatório' });
  if (data.iepc_score === undefined || data.iepc_score === null) errors.push({ field: 'iepc_score', message: 'Score IEPC é obrigatório' });
  return errors;
}

export default function FeedbackImportPage() {
  const router = useRouter();
  const supabase = createClient();
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [parseError, setParseError] = useState('');

  const processFile = useCallback((file: File) => {
    setParseError('');
    setErrors([]);
    setPreview(null);
    setSaved(false);

    if (!file.name.endsWith('.json')) {
      setParseError('Apenas arquivos .json são aceitos');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as PreviewData;
        const errs = validatePayload(data);
        setErrors(errs);
        setPreview(data);
      } catch {
        setParseError('Arquivo JSON inválido ou corrompido');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleSave = async () => {
    if (!preview || errors.length > 0) return;
    setSaving(true);

    // Find analista
    const { data: analista } = await supabase
      .from('analistas')
      .select('id, nome, equipe, coordenador')
      .eq('email', preview.analista_email)
      .maybeSingle();

    if (!analista) {
      setErrors([{ field: 'analista_email', message: `Analista não encontrado: ${preview.analista_email}` }]);
      setSaving(false);
      return;
    }

    // Check duplicate
    const { data: existing } = await supabase
      .from('feedbacks')
      .select('id')
      .eq('analista_id', analista.id)
      .eq('ciclo', preview.ciclo as string)
      .maybeSingle();

    if (existing) {
      setErrors([{ field: 'ciclo', message: 'Já existe um feedback para este analista neste ciclo' }]);
      setSaving(false);
      return;
    }

    const { data: fb, error } = await supabase.from('feedbacks').insert({
      analista_id: analista.id,
      ciclo: preview.ciclo,
      qa_score: preview.qa_score,
      iepc_score: preview.iepc_score,
      aderencia_score: preview.aderencia_score || null,
      coordenador: preview.coordenador || analista.coordenador,
      equipe: preview.equipe || analista.equipe,
      resumo_ciclo: preview.resumo_ciclo || null,
      pilares_qa: preview.pilares_qa || [],
      pilares_iepc: preview.pilares_iepc || [],
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
      setSaving(false);
      return;
    }

    // Atendimentos
    if (Array.isArray(preview.atendimentos)) {
      const ats = (preview.atendimentos as Record<string, unknown>[]).map((a) => ({ feedback_id: fb.id, ...a }));
      await supabase.from('feedback_atendimentos').insert(ats);
    }
    // Coaching
    if (Array.isArray(preview.coaching)) {
      const co = (preview.coaching as Record<string, unknown>[]).map((c) => ({ feedback_id: fb.id, ...c }));
      await supabase.from('feedback_coaching').insert(co);
    }
    // PDI
    if (Array.isArray(preview.pdi)) {
      const pd = (preview.pdi as Record<string, unknown>[]).map((p) => ({ feedback_id: fb.id, analista_id: analista.id, ...p }));
      await supabase.from('feedback_pdi').insert(pd);
    }

    setSaved(true);
    setSaving(false);
    setTimeout(() => router.push(`/feedback/${fb.id}`), 1500);
  };

  return (
    <EnterpriseLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileJson size={24} className="text-sky-400" /> Importar Feedback JSON
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Faça upload de um arquivo .json gerado pelo Lovable ou exportado do sistema
          </p>
        </div>

        {/* Drop zone */}
        {!preview && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className="rounded-xl p-12 text-center transition-all cursor-pointer"
            style={{
              border: `2px dashed ${dragging ? '#38BDF8' : 'rgba(255,255,255,0.12)'}`,
              backgroundColor: dragging ? 'rgba(56,189,248,0.05)' : 'rgba(255,255,255,0.02)',
            }}
          >
            <Upload size={40} className="mx-auto mb-4" style={{ color: dragging ? '#38BDF8' : 'rgba(255,255,255,0.2)' }} />
            <p className="text-white font-medium mb-1">Arraste o arquivo JSON aqui</p>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>ou clique para selecionar</p>
            <label className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer bg-sky-600 hover:bg-sky-500 text-white transition-colors">
              Selecionar arquivo
              <input type="file" accept=".json" className="hidden" onChange={handleFileInput} />
            </label>
          </div>
        )}

        {parseError && (
          <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
            <AlertCircle size={14} /> {parseError}
          </div>
        )}

        {/* Preview */}
        {preview && !saved && (
          <div className="space-y-4">
            <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2"><Eye size={14} /> Pré-visualização</h3>
                <button onClick={() => { setPreview(null); setErrors([]); }} style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Analista (e-mail)', preview.analista_email],
                  ['Ciclo', preview.ciclo],
                  ['QA Score', preview.qa_score],
                  ['IEPC Score', preview.iepc_score],
                  ['Aderência', preview.aderencia_score],
                  ['Equipe', preview.equipe as string],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
                    <p className="text-white font-medium">{String(value ?? '—')}</p>
                  </div>
                ))}
              </div>
              {preview.resumo_ciclo && (
                <div>
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Resumo</p>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{preview.resumo_ciclo as string}</p>
                </div>
              )}
              <div className="flex gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {Array.isArray(preview.atendimentos) && <span>📋 {(preview.atendimentos as unknown[]).length} atendimentos</span>}
                {Array.isArray(preview.coaching) && <span>💬 {(preview.coaching as unknown[]).length} coaching</span>}
                {Array.isArray(preview.pdi) && <span>📈 {(preview.pdi as unknown[]).length} PDI</span>}
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

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || errors.length > 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-50"
              >
                <Save size={14} /> {saving ? 'Salvando...' : 'Confirmar e Salvar'}
              </button>
              <button
                onClick={() => { setPreview(null); setErrors([]); }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {saved && (
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <CheckCircle size={20} className="text-green-400" />
            <div>
              <p className="text-white font-medium">Feedback importado com sucesso!</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Redirecionando para visualização...</p>
            </div>
          </div>
        )}

        {/* JSON Schema reference */}
        <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>ESTRUTURA ESPERADA DO JSON</p>
          <pre className="text-xs overflow-x-auto" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono, monospace' }}>{`{
  "analista_email": "ana@empresa.com",
  "ciclo": "MAR/2026",
  "qa_score": 93,
  "iepc_score": 89,
  "aderencia_score": 83,
  "resumo_ciclo": "...",
  "pilares_qa": [...],
  "pilares_iepc": [...],
  "pontos_fortes": [...],
  "oportunidades": [...],
  "atendimentos": [...],
  "coaching": [...],
  "pdi": [...]
}`}</pre>
        </div>
      </div>
    </EnterpriseLayout>
  );
}
