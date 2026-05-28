'use client';
import React, { useState, useCallback, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

export default function FeedbackImportPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [preview, setPreview] = useState<any>(null);
  const [analistas, setAnalistas] = useState<any[]>([]);
  const [selectedAnalistaId, setSelectedAnalistaId] = useState('');
  const [inputCiclo, setInputCiclo] = useState('');
  const [saving, setSaving] = useState(false);

  // 1. Carregar analistas para o seletor
  useEffect(() => {
    supabase.from('analistas').select('id, nome').then(({ data }) => {
      if (data) setAnalistas(data);
    });
  }, []);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = JSON.parse(e.target?.result as string);
      setPreview(data);
      // Tenta sugerir o ciclo se vier no JSON
      if (data.ciclo?.nome) setInputCiclo(data.ciclo.nome);
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!selectedAnalistaId || !inputCiclo) {
      toast.error('Selecione o analista e informe o ciclo!');
      return;
    }

    setSaving(true);
    
    // Inserção no Supabase com os dados manuais + JSON
    const { data: fb, error } = await supabase.from('feedbacks').insert({
      analista_id: selectedAnalistaId, // VÍNCULO MANUAL
      ciclo: inputCiclo,               // CICLO MANUAL
      qa_score: preview.scores?.qa || 0,
      iepc_score: preview.scores?.iepc || 0,
      status: 'generated',             // STATUS CORRIGIDO
      snapshot_json_completo: preview
    }).select('id').single();

    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      setSaving(false);
      return;
    }

    // Se salvou o feedback, vamos salvar os atendimentos (o coração do seu painel)
    if (preview.atendimentos) {
       await supabase.from('feedback_atendimentos').insert(
         preview.atendimentos.map((a: any) => ({
           feedback_id: fb.id,
           protocolo: a.protocolo || a.sup,
           cliente: a.cliente,
           assunto: a.assunto,
           nota_qa: a.nota_qa || a.nota || 0,
           sintese: a.sintese
         }))
       );
    }

    toast.success('Feedback importado com sucesso!');
    router.push(`/feedback/${fb.id}`);
  };

  return (
    <EnterpriseLayout>
      <div className="p-6 max-w-2xl mx-auto text-white">
        <h1 className="text-xl font-bold mb-6">Importar Feedback</h1>
        
        {!preview ? (
          <input type="file" onChange={(e) => e.target.files && processFile(e.target.files[0])} />
        ) : (
          <div className="space-y-4">
            {/* Seletor Manual */}
            <div className="grid grid-cols-2 gap-4">
              <select onChange={(e) => setSelectedAnalistaId(e.target.value)} className="bg-[#111827] p-2 rounded">
                <option value="">Escolha o Analista</option>
                {analistas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
              <input 
                placeholder="Ex: 04/2026" 
                value={inputCiclo} 
                onChange={(e) => setInputCiclo(e.target.value)} 
                className="bg-[#111827] p-2 rounded"
              />
            </div>
            
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-blue-600 p-3 rounded w-full font-bold"
            >
              {saving ? 'Salvando...' : 'Confirmar Vínculo e Salvar'}
            </button>
          </div>
        )}
      </div>
    </EnterpriseLayout>
  );
}