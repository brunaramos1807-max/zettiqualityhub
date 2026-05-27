'use client';
import React, { useState, useCallback, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Upload, FileJson, CheckCircle, AlertCircle, X, Eye, Save, Copy, Link2, User, Calendar } from 'lucide-react';

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
interface AnalistaDB { id: string; nome: string; equipe: string; coordenador: string; email: string; }

// A validação agora foca apenas nas notas. O analista e o ciclo nós garantimos pela interface!
function validatePayload(data: PreviewData): ValidationError[] {
  const errors: ValidationError[] = [];
  const qa = data.qa_score ?? data.scores?.qa;
  const iepc = data.iepc_score ?? data.scores?.iepc;
  if (qa === undefined) errors.push({ field: 'qa_score / scores.qa', message: 'Score QA é obrigatório no JSON' });
  if (iepc === undefined) errors.push({ field: 'iepc_score / scores.iepc', message: 'Score IEPC é obrigatório no JSON' });
  return errors;
}

const FULL_JSON_EXAMPLE = `{
  "metadata": {
    "origem": "lovable",
    "versao": "1.0",
    "gerado_em": "2026-05-22T10:00:00"
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
      "assunto": "Divergência no valor unitário líquido",
      "solucao": "Análise técnica e encaminhamento",
      "nota": 89.5,
      "sintese": "Boa condução técnica com rastreabilidade",
      "criterios": [
        {
          "criterio_nome": "Identificação e Boas-vindas",
          "status": "aderido",
          "pilar_nome": "Gestão do Fluxo",
          "evidencia": "Bom dia Alex..."
        }
      ],
      "nao_conformidades": []
    }
  ]
}`;

const ENDPOINT_URL = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://zettiquali9387.builtwithrocket.new'}/api/feedbacks/import`;

export default function FeedbackImportPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // Estados da página
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [parseError, setParseError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  // Estados de Vinculação (O Pulo do Gato)
  const [analistasList, setAnalistasList] = useState<AnalistaDB[]>([]);
  const [selectedAnalista, setSelectedAnalista] = useState('');
  const [inputCiclo, setInputCiclo] = useState('');

  // Carrega os analistas ao abrir a página
  useEffect(() => {
    async function fetchAnalistas() {
      const { data } = await supabase.from('analistas').select('id, nome, equipe, coordenador, email').order('nome');
      if (data) setAnalistasList(data);
    }
    fetchAnalistas();
  }, []);

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

        // Tenta preencher automaticamente os campos na tela se vierem no JSON (Facilitador)
        const cicloJson = data.ciclo || (data.ciclo_obj as any)?.nome;
        if (cicloJson) setInputCiclo(cicloJson);

        const emailJson = data.analista_email || data.analista?.email;
        if (emailJson && analistasList.length > 0) {
          const found = analistasList.find(a => a.email === emailJson);
          if (found) setSelectedAnalista(found.id);
        }
      } catch { setParseError('Arquivo JSON inválido ou corrompido'); }
    };
    reader.readAsText(file);
  }, [analistasList]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  // Função de salvar (Garante o Vínculo!)
  const handleSave = async () => {
    if (!preview || errors.length > 0) return;
    
    if (!selectedAnalista || !inputCiclo.trim()) {
      setErrors([{ field: 'Vínculo', message: 'Selecione o Analista e digite o Ciclo acima antes de salvar!' }]);
      return;
    }

    setSaving(true);
    
    // Pega os dados do analista selecionado no dropdown
    const analistaSelecionado = analistasList.find(a => a.id === selectedAnalista);
    if (!analistaSelecionado) { setSaving(false); return; }

    // Verifica duplicidade para o mesmo analista e ciclo
    const { data: existing } = await supabase.from('feedbacks')
      .select('id').eq('analista_id', analistaSelecionado.id).eq('ciclo', inputCiclo).maybeSingle();
    
    if (existing) {
      setErrors([{ field: 'ciclo', message: 'Já existe um feedback para este analista neste ciclo. Exclua o anterior para substituir.' }]);
      setSaving(false); return;
    }

    // Normaliza os pilares
    const pilaresQa = (preview.qa_pilares as any[] || preview.pilares_qa as any[] || []).map((p) => ({
      nome: p.nome, pontuacao: p.nota ?? p.pontuacao, max: p.maximo ?? p.max
    }));
    const pilaresIepc = (preview.iepc_pilares as any[] || preview.pilares_iepc as any[] || []).map((p) => ({
      nome: p.nome, pontuacao: p.nota ?? p.pontuacao, max: p.maximo ?? p.max
    }));

    // SALVA NO SUPABASE FORÇANDO OS IDs SELECIONADOS NA INTERFACE
    const { data: fb, error } = await supabase.from('feedbacks').insert({
      analista_id: analistaSelecionado.id, // VÍNCULO FORÇADO AQUI
      ciclo: inputCiclo,                   // CICLO DIGITADO AQUI
      qa_score: preview.qa_score ?? preview.scores?.qa ?? 0,
      iepc_score: preview.iepc_score ?? preview.scores?.iepc ?? 0,
      aderencia_score: preview.scores?.aderencia || preview.aderencia_score || null,
      coordenador: analistaSelecionado.coordenador, // Pega da base, não do JSON
      equipe: analistaSelecionado.equipe,           // Pega da base, não do JSON
      resumo_ciclo: preview.resumo_ciclo || preview.observacoes || null,
      pilares_qa: pilaresQa,
      pilares_iepc: pilaresIepc,
      pontos_fortes: preview.pontos_fortes || [],
      oportunidades: preview.oportunidades || [],
      tendencias: preview.tendencias || {},
      conquistas: preview.conquistas || [],
      status: 'publicado',
      origem: 'importacao_json',
      snapshot_json_completo: preview, // Guarda tudo para segurança
    }).select('id').single();

    if (error || !fb) {
      setErrors([{ field: 'banco', message: error?.message || 'Erro ao salvar' }]);
      setSaving(false); return;
    }

    // Importa sub-tabelas associadas ao novo Feedback ID
    const atendimentos = (preview.atendimentos as any[] || []);
    if (atendimentos.length > 0) {
      await supabase.from('feedback_atendimentos').insert(atendimentos.map((a) => ({
        feedback_id: fb.id,
        protocolo: a.protocolo || a.sup,
        cliente: a.cliente || 'N/A',
        assunto: a.assunto || '',
        nota_qa: a.nota ?? a.nota_qa,
        nota_iepc: a.nota_iepc || null,
        classificacao: a.classificacao || null,
        observacao: a.sintese || a.observacao || null,
      })));
    }

    const coaching = (preview.coaching as any[] || []);
    if (coaching.length > 0) {
      await supabase.from('feedback_coaching').insert(coaching.map((c) => ({
        feedback_id: fb.id,
        o_que_foi_dito: c.o_que_foi_dito,
        como_poderia_ser: c.como_poderia_ser,
        dica_de_ouro: c.dica_de_ouro,
      })));
    }

    const pdi = (preview.pdi as any[] || []);
    if (pdi.length > 0) {
      await supabase.from('feedback_pdi').insert(pdi.map((p) => ({
        feedback_id: fb.id,
        analista_id: analistaSelecionado.id,
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

  return (
    <EnterpriseLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileJson size={24} className="text-sky-400" /> Importar Feedback JSON
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Faça upload do JSON para vinculá-lo manualmente ao analista e ciclo desejado.
          </p>
        </div>

        {/* ── DROP ZONE ── */}
        {!preview && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className="rounded-xl p-12 text-center transition-all cursor-pointer mt-6"
            style={{ border: `2px dashed ${dragging ? '#38BDF8' : 'rgba(255,255,255,0.12)'}`, backgroundColor: dragging ? 'rgba(56,189,248,0.05)' : 'rgba(255,255,255,0.02)' }}
          >
            <Upload size={40} className="mx-auto mb-4" style={{ color: dragging ? '#38BDF8' : 'rgba(255,255,255,0.2)' }} />
            <p className="text-white font-medium mb-1">Arraste o arquivo JSON aqui</p>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>ou clique para selecionar o JSON do Lovable/Histórico</p>
            <label className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer bg-sky-600 hover:bg-sky-500 text-white transition-colors">
              Selecionar arquivo JSON
              <input type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
            </label>
          </div>
        )}

        {parseError && (
          <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
            <AlertCircle size={14} /> {parseError}
          </div>
        )}

        {/* ── PREVIEW & VÍNCULO MANUAL ── */}
        {preview && !saved && (
          <div className="space-y-6">
            
            {/* Bloco de Vínculo Forçado */}
            <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.2)' }}>
              <h3 className="font-semibold text-sky-400 flex items-center gap-2 mb-4">
                <Link2 size={18} /> Associe este Feedback (Obrigatório)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-2 text-white flex items-center gap-1"><User size={12}/> Selecione o Analista</label>
                  <select 
                    value={selectedAnalista} 
                    onChange={(e) => setSelectedAnalista(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none"
                    style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    <option value="">-- Escolha um analista da base --</option>
                    {analistasList.map(a => (
                      <option key={a.id} value={a.id}>{a.nome} ({a.equipe})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-2 text-white flex items-center gap-1"><Calendar size={12}/> Ciclo (Período)</label>
                  <input 
                    type="text" 
                    value={inputCiclo} 
                    onChange={(e) => setInputCiclo(e.target.value)}
                    placeholder="Ex: 04/2026"
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none"
                    style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)' }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2"><Eye size={14} /> Dados encontrados no arquivo JSON</h3>
                <button onClick={() => { setPreview(null); setErrors([]); }} style={{ color: 'rgba(255,255,255,0.4)' }}><X size={14} /></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-2">
                <div>
                  <p className="text-[10px] uppercase text-gray-500 mb-0.5">QA Score Encontrado</p>
                  <p className="text-white font-bold">{preview.qa_score ?? preview.scores?.qa ?? '0'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-500 mb-0.5">IEPC Score Encontrado</p>
                  <p className="text-white font-bold">{preview.iepc_score ?? preview.scores?.iepc ?? '0'}%</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-500 mb-0.5">Atendimentos Lidos</p>
                  <p className="text-white font-bold">{Array.isArray(preview.atendimentos) ? preview.atendimentos.length : 0}</p>
                </div>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="space-y-2">
                {errors.map((e, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 rounded-lg text-sm font-medium" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}>
                    <AlertCircle size={16} /> {e.message}
                  </div>
                ))}
              </div>
            )}

            {saved && (
              <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#86EFAC' }}>
                <CheckCircle size={14} /> Feedback salvo com sucesso! Redirecionando...
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button onClick={handleSave} disabled={saving || (!selectedAnalista || !inputCiclo)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-50">
                <Save size={16} /> {saving ? 'Processando e Vinculando...' : 'Vincular e Salvar Feedback'}
              </button>
              <button onClick={() => { setPreview(null); setErrors([]); }}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-colors" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </EnterpriseLayout>
  );
}