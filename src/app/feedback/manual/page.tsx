'use client';
import React, { useState, useEffect, Suspense } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface Analista { id: string; nome: string; equipe: string; coordenador: string }
interface PilarRow { nome: string; pontuacao: string; max: string; variacao: string; observacao: string }
interface AtendimentoRow { protocolo: string; cliente: string; assunto: string; nota_qa: string; nota_iepc: string; classificacao: string; observacao: string }
interface CoachingRow { o_que_foi_dito: string; como_poderia_ser: string; dica_de_ouro: string }
interface PdiRow { objetivo: string; acao_desenvolvimento: string; prazo: string; progresso: string; status: string }
interface PontoRow { titulo: string; descricao: string }

function emptyPilar(): PilarRow { return { nome: '', pontuacao: '', max: '', variacao: '', observacao: '' }; }
function emptyAtendimento(): AtendimentoRow { return { protocolo: '', cliente: '', assunto: '', nota_qa: '', nota_iepc: '', classificacao: 'bom', observacao: '' }; }
function emptyCoaching(): CoachingRow { return { o_que_foi_dito: '', como_poderia_ser: '', dica_de_ouro: '' }; }
function emptyPdi(): PdiRow { return { objetivo: '', acao_desenvolvimento: '', prazo: '', progresso: '0', status: 'pendente' }; }
function emptyPonto(): PontoRow { return { titulo: '', descricao: '' }; }

const inputCls = "w-full px-3 py-2 rounded-lg text-sm text-white outline-none";
const inputStyle = { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' };

function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-3 text-left transition-colors hover:bg-white/[0.02]" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <span className="text-sm font-semibold tracking-widest" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{title.toUpperCase()}</span>
        {open ? <ChevronUp size={14} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

function PilarTable({ rows, setRows }: { rows: PilarRow[]; setRows: (r: PilarRow[]) => void }) {
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-5 gap-2 items-center">
          <input placeholder="Pilar" value={row.nome} onChange={(e) => { const r = [...rows]; r[i].nome = e.target.value; setRows(r); }} className={inputCls} style={inputStyle} />
          <input placeholder="Pts" type="number" value={row.pontuacao} onChange={(e) => { const r = [...rows]; r[i].pontuacao = e.target.value; setRows(r); }} className={inputCls} style={inputStyle} />
          <input placeholder="Máx" type="number" value={row.max} onChange={(e) => { const r = [...rows]; r[i].max = e.target.value; setRows(r); }} className={inputCls} style={inputStyle} />
          <input placeholder="Variação" type="number" value={row.variacao} onChange={(e) => { const r = [...rows]; r[i].variacao = e.target.value; setRows(r); }} className={inputCls} style={inputStyle} />
          <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="p-2 rounded hover:bg-red-500/10 transition-colors" style={{ color: 'rgba(239,68,68,0.5)' }}><Trash2 size={12} /></button>
        </div>
      ))}
      <button onClick={() => setRows([...rows, emptyPilar()])} className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 mt-1">
        <Plus size={12} /> Adicionar pilar
      </button>
    </div>
  );
}

function FeedbackManualContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get('id');
  const supabase = createClient();

  const [analistas, setAnalistas] = useState<Analista[]>([]);
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ 'Identificação': true, 'Scores': true });

  const [analistaId, setAnalistaId] = useState('');
  const [ciclo, setCiclo] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [coordenador, setCoordenador] = useState('');
  const [equipe, setEquipe] = useState('');
  const [qaScore, setQaScore] = useState('');
  const [iepcScore, setIepcScore] = useState('');
  const [aderencia, setAderencia] = useState('');
  const [posicaoSquad, setPosicaoSquad] = useState('');
  const [totalSquad, setTotalSquad] = useState('');
  const [ciclosConsecutivos, setCiclosConsecutivos] = useState('');
  const [pilaresQa, setPilaresQa] = useState<PilarRow[]>([emptyPilar()]);
  const [pilaresIepc, setPilaresIepc] = useState<PilarRow[]>([emptyPilar()]);
  const [pontosFortes, setPontosFortes] = useState<PontoRow[]>([emptyPonto()]);
  const [oportunidades, setOportunidades] = useState<PontoRow[]>([emptyPonto()]);
  const [atendimentos, setAtendimentos] = useState<AtendimentoRow[]>([emptyAtendimento()]);
  const [coaching, setCoaching] = useState<CoachingRow[]>([emptyCoaching()]);
  const [pdi, setPdi] = useState<PdiRow[]>([emptyPdi()]);
  const [resumo, setResumo] = useState('');
  const [status, setStatus] = useState('draft');

  useEffect(() => {
    supabase.from('analistas').select('id, nome, equipe, coordenador').eq('ativo', true).order('nome').then(({ data }) => {
      if (data) setAnalistas(data as Analista[]);
    });
  }, []);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      const { data } = await supabase.from('feedbacks').select('*').eq('id', editId).single();
      if (!data) return;
      setAnalistaId(data.analista_id || '');
      setCiclo(data.ciclo || '');
      setPeriodoInicio(data.periodo_inicio || '');
      setPeriodoFim(data.periodo_fim || '');
      setCoordenador(data.coordenador || '');
      setEquipe(data.equipe || '');
      setQaScore(String(data.qa_score ?? ''));
      setIepcScore(String(data.iepc_score ?? ''));
      setAderencia(String(data.aderencia_score ?? ''));
      setPosicaoSquad(String(data.posicao_squad ?? ''));
      setTotalSquad(String(data.total_squad ?? ''));
      setCiclosConsecutivos(String(data.ciclos_consecutivos_evolucao ?? ''));
      setResumo(data.resumo_ciclo || '');
      setStatus(data.status || 'draft');
      if (data.pilares_qa?.length) setPilaresQa(data.pilares_qa.map((p: PilarRow) => ({ ...p, pontuacao: String(p.pontuacao), max: String(p.max), variacao: String(p.variacao ?? '') })));
      if (data.pilares_iepc?.length) setPilaresIepc(data.pilares_iepc.map((p: PilarRow) => ({ ...p, pontuacao: String(p.pontuacao), max: String(p.max), variacao: String(p.variacao ?? '') })));
      if (data.pontos_fortes?.length) setPontosFortes(data.pontos_fortes);
      if (data.oportunidades?.length) setOportunidades(data.oportunidades);
    })();
  }, [editId]);

  const toggleSection = (s: string) => setOpenSections((prev) => ({ ...prev, [s]: !prev[s] }));

  const handleSave = async () => {
    if (!analistaId || !ciclo) { alert('Analista e Ciclo são obrigatórios'); return; }
    setSaving(true);

    const payload = {
      analista_id: analistaId,
      ciclo,
      periodo_inicio: periodoInicio || null,
      periodo_fim: periodoFim || null,
      coordenador: coordenador || null,
      equipe: equipe || null,
      qa_score: qaScore ? Number(qaScore) : null,
      iepc_score: iepcScore ? Number(iepcScore) : null,
      aderencia_score: aderencia ? Number(aderencia) : null,
      posicao_squad: posicaoSquad ? Number(posicaoSquad) : null,
      total_squad: totalSquad ? Number(totalSquad) : null,
      ciclos_consecutivos_evolucao: ciclosConsecutivos ? Number(ciclosConsecutivos) : 0,
      pilares_qa: pilaresQa.filter((p) => p.nome).map((p) => ({ ...p, pontuacao: Number(p.pontuacao), max: Number(p.max), variacao: p.variacao ? Number(p.variacao) : undefined })),
      pilares_iepc: pilaresIepc.filter((p) => p.nome).map((p) => ({ ...p, pontuacao: Number(p.pontuacao), max: Number(p.max), variacao: p.variacao ? Number(p.variacao) : undefined })),
      pontos_fortes: pontosFortes.filter((p) => p.titulo),
      oportunidades: oportunidades.filter((o) => o.titulo),
      resumo_ciclo: resumo || null,
      status,
      origem: 'manual',
    };

    let fbId: string;
    if (editId) {
      const { error } = await supabase.from('feedbacks').update(payload).eq('id', editId);
      if (error) { alert(error.message); setSaving(false); return; }
      fbId = editId;
    } else {
      const { data, error } = await supabase.from('feedbacks').insert(payload).select('id').single();
      if (error || !data) { alert(error?.message || 'Erro'); setSaving(false); return; }
      fbId = data.id;
    }

    if (editId) {
      await supabase.from('feedback_atendimentos').delete().eq('feedback_id', fbId);
      await supabase.from('feedback_coaching').delete().eq('feedback_id', fbId);
      await supabase.from('feedback_pdi').delete().eq('feedback_id', fbId);
    }

    const validAtendimentos = atendimentos.filter((a) => a.cliente || a.protocolo);
    if (validAtendimentos.length) {
      await supabase.from('feedback_atendimentos').insert(validAtendimentos.map((a) => ({
        feedback_id: fbId, protocolo: a.protocolo || null, cliente: a.cliente,
        assunto: a.assunto || null, nota_qa: a.nota_qa ? Number(a.nota_qa) : null,
        nota_iepc: a.nota_iepc ? Number(a.nota_iepc) : null, classificacao: a.classificacao || null, observacao: a.observacao || null,
      })));
    }

    const validCoaching = coaching.filter((c) => c.o_que_foi_dito);
    if (validCoaching.length) await supabase.from('feedback_coaching').insert(validCoaching.map((c) => ({ feedback_id: fbId, ...c })));

    const validPdi = pdi.filter((p) => p.objetivo);
    if (validPdi.length) {
      await supabase.from('feedback_pdi').insert(validPdi.map((p) => ({
        feedback_id: fbId, analista_id: analistaId, objetivo: p.objetivo,
        acao_desenvolvimento: p.acao_desenvolvimento || null, prazo: p.prazo || null,
        progresso: Number(p.progresso) || 0, status: p.status || 'pendente',
      })));
    }

    setSaving(false);
    router.push(`/feedback/${fbId}`);
  };

  return (
    <EnterpriseLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">{editId ? 'Editar Feedback' : '➕ Novo Feedback Manual'}</h1>
          <div className="flex items-center gap-2">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 rounded-lg text-sm text-white outline-none" style={inputStyle}>
              {['draft', 'generated', 'reviewed', 'approved', 'sent'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-50">
              <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        <Section title="Identificação" open={openSections['Identificação'] !== false} onToggle={() => toggleSection('Identificação')}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Analista *</label>
              <select value={analistaId} onChange={(e) => { setAnalistaId(e.target.value); const a = analistas.find((x) => x.id === e.target.value); if (a) { setEquipe(a.equipe); setCoordenador(a.coordenador); } }} className={`${inputCls} w-full`} style={inputStyle}>
                <option value="">Selecionar analista</option>
                {analistas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Ciclo *</label>
              <input value={ciclo} onChange={(e) => setCiclo(e.target.value)} placeholder="ex: MAR/2026" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Período Início</label>
              <input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Período Fim</label>
              <input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Equipe</label>
              <input value={equipe} onChange={(e) => setEquipe(e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Coordenador</label>
              <input value={coordenador} onChange={(e) => setCoordenador(e.target.value)} className={inputCls} style={inputStyle} />
            </div>
          </div>
        </Section>

        <Section title="Scores" open={openSections['Scores'] !== false} onToggle={() => toggleSection('Scores')}>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {([['QA (0-100)', qaScore, setQaScore], ['IEPC (%)', iepcScore, setIepcScore], ['Aderência (%)', aderencia, setAderencia], ['Posição Squad', posicaoSquad, setPosicaoSquad], ['Total Squad', totalSquad, setTotalSquad]] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
              <div key={label}>
                <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</label>
                <input type="number" value={val} onChange={(e) => setter(e.target.value)} className={inputCls} style={inputStyle} />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Ciclos consecutivos em evolução</label>
            <input type="number" value={ciclosConsecutivos} onChange={(e) => setCiclosConsecutivos(e.target.value)} className={`${inputCls} w-32`} style={inputStyle} />
          </div>
        </Section>

        <Section title="Pilares QA" open={!!openSections['Pilares QA']} onToggle={() => toggleSection('Pilares QA')}>
          <div className="grid grid-cols-5 gap-2 mb-2 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <span>Pilar</span><span>Pontos</span><span>Máximo</span><span>Variação</span><span></span>
          </div>
          <PilarTable rows={pilaresQa} setRows={setPilaresQa} />
        </Section>

        <Section title="Pilares IEPC" open={!!openSections['Pilares IEPC']} onToggle={() => toggleSection('Pilares IEPC')}>
          <div className="grid grid-cols-5 gap-2 mb-2 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <span>Pilar</span><span>Pontos</span><span>Máximo</span><span>Variação</span><span></span>
          </div>
          <PilarTable rows={pilaresIepc} setRows={setPilaresIepc} />
        </Section>

        <Section title="Pontos Fortes / Oportunidades" open={!!openSections['Pontos Fortes / Oportunidades']} onToggle={() => toggleSection('Pontos Fortes / Oportunidades')}>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(34,197,94,0.6)' }}>✅ PONTOS FORTES</p>
              {pontosFortes.map((p, i) => (
                <div key={i} className="space-y-1 mb-2">
                  <input placeholder="Título" value={p.titulo} onChange={(e) => { const r = [...pontosFortes]; r[i].titulo = e.target.value; setPontosFortes(r); }} className={inputCls} style={inputStyle} />
                  <input placeholder="Descrição" value={p.descricao} onChange={(e) => { const r = [...pontosFortes]; r[i].descricao = e.target.value; setPontosFortes(r); }} className={inputCls} style={inputStyle} />
                </div>
              ))}
              <button onClick={() => setPontosFortes([...pontosFortes, emptyPonto()])} className="flex items-center gap-1 text-xs text-green-400 mt-1"><Plus size={12} /> Adicionar</button>
            </div>
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(251,146,60,0.6)' }}>⚠️ OPORTUNIDADES</p>
              {oportunidades.map((o, i) => (
                <div key={i} className="space-y-1 mb-2">
                  <input placeholder="Título" value={o.titulo} onChange={(e) => { const r = [...oportunidades]; r[i].titulo = e.target.value; setOportunidades(r); }} className={inputCls} style={inputStyle} />
                  <input placeholder="Descrição" value={o.descricao} onChange={(e) => { const r = [...oportunidades]; r[i].descricao = e.target.value; setOportunidades(r); }} className={inputCls} style={inputStyle} />
                </div>
              ))}
              <button onClick={() => setOportunidades([...oportunidades, emptyPonto()])} className="flex items-center gap-1 text-xs text-orange-400 mt-1"><Plus size={12} /> Adicionar</button>
            </div>
          </div>
        </Section>

        <Section title="Atendimentos" open={!!openSections['Atendimentos']} onToggle={() => toggleSection('Atendimentos')}>
          <div className="space-y-3">
            {atendimentos.map((a, i) => (
              <div key={i} className="grid grid-cols-7 gap-2 items-center">
                <input placeholder="Protocolo" value={a.protocolo} onChange={(e) => { const r = [...atendimentos]; r[i].protocolo = e.target.value; setAtendimentos(r); }} className={inputCls} style={inputStyle} />
                <input placeholder="Cliente" value={a.cliente} onChange={(e) => { const r = [...atendimentos]; r[i].cliente = e.target.value; setAtendimentos(r); }} className={inputCls} style={inputStyle} />
                <input placeholder="Assunto" value={a.assunto} onChange={(e) => { const r = [...atendimentos]; r[i].assunto = e.target.value; setAtendimentos(r); }} className={inputCls} style={inputStyle} />
                <input placeholder="QA" type="number" value={a.nota_qa} onChange={(e) => { const r = [...atendimentos]; r[i].nota_qa = e.target.value; setAtendimentos(r); }} className={inputCls} style={inputStyle} />
                <input placeholder="IEPC" type="number" value={a.nota_iepc} onChange={(e) => { const r = [...atendimentos]; r[i].nota_iepc = e.target.value; setAtendimentos(r); }} className={inputCls} style={inputStyle} />
                <select value={a.classificacao} onChange={(e) => { const r = [...atendimentos]; r[i].classificacao = e.target.value; setAtendimentos(r); }} className={inputCls} style={inputStyle}>
                  {['excelente', 'bom', 'regular', 'critico'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={() => setAtendimentos(atendimentos.filter((_, j) => j !== i))} className="p-2 rounded hover:bg-red-500/10" style={{ color: 'rgba(239,68,68,0.5)' }}><Trash2 size={12} /></button>
              </div>
            ))}
            <button onClick={() => setAtendimentos([...atendimentos, emptyAtendimento()])} className="flex items-center gap-1 text-xs text-sky-400"><Plus size={12} /> Adicionar atendimento</button>
          </div>
        </Section>

        <Section title="Coaching" open={!!openSections['Coaching']} onToggle={() => toggleSection('Coaching')}>
          <div className="space-y-4">
            {coaching.map((c, i) => (
              <div key={i} className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.35)' }}>O que foi dito</label>
                  <textarea value={c.o_que_foi_dito} onChange={(e) => { const r = [...coaching]; r[i].o_que_foi_dito = e.target.value; setCoaching(r); }} rows={3} className={`${inputCls} resize-none`} style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.35)' }}>Como poderia ser</label>
                  <textarea value={c.como_poderia_ser} onChange={(e) => { const r = [...coaching]; r[i].como_poderia_ser = e.target.value; setCoaching(r); }} rows={3} className={`${inputCls} resize-none`} style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.35)' }}>Dica de ouro</label>
                  <textarea value={c.dica_de_ouro} onChange={(e) => { const r = [...coaching]; r[i].dica_de_ouro = e.target.value; setCoaching(r); }} rows={3} className={`${inputCls} resize-none`} style={inputStyle} />
                </div>
              </div>
            ))}
            <button onClick={() => setCoaching([...coaching, emptyCoaching()])} className="flex items-center gap-1 text-xs text-sky-400"><Plus size={12} /> Adicionar coaching</button>
          </div>
        </Section>

        <Section title="PDI" open={!!openSections['PDI']} onToggle={() => toggleSection('PDI')}>
          <div className="space-y-3">
            {pdi.map((p, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 items-center">
                <input placeholder="Objetivo" value={p.objetivo} onChange={(e) => { const r = [...pdi]; r[i].objetivo = e.target.value; setPdi(r); }} className={inputCls} style={inputStyle} />
                <input placeholder="Ação" value={p.acao_desenvolvimento} onChange={(e) => { const r = [...pdi]; r[i].acao_desenvolvimento = e.target.value; setPdi(r); }} className={inputCls} style={inputStyle} />
                <input type="date" value={p.prazo} onChange={(e) => { const r = [...pdi]; r[i].prazo = e.target.value; setPdi(r); }} className={inputCls} style={inputStyle} />
                <select value={p.status} onChange={(e) => { const r = [...pdi]; r[i].status = e.target.value; setPdi(r); }} className={inputCls} style={inputStyle}>
                  {['pendente', 'em_andamento', 'concluido', 'cancelado'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => setPdi(pdi.filter((_, j) => j !== i))} className="p-2 rounded hover:bg-red-500/10" style={{ color: 'rgba(239,68,68,0.5)' }}><Trash2 size={12} /></button>
              </div>
            ))}
            <button onClick={() => setPdi([...pdi, emptyPdi()])} className="flex items-center gap-1 text-xs text-sky-400"><Plus size={12} /> Adicionar ação PDI</button>
          </div>
        </Section>

        <Section title="Resumo & Tendências" open={!!openSections['Resumo & Tendências']} onToggle={() => toggleSection('Resumo & Tendências')}>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Resumo do Ciclo</label>
            <textarea value={resumo} onChange={(e) => setResumo(e.target.value)} rows={5} placeholder="Descreva o desempenho geral do analista neste ciclo..." className={`${inputCls} resize-none`} style={inputStyle} />
          </div>
        </Section>

        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-50">
            <Save size={14} /> {saving ? 'Salvando...' : 'Salvar Feedback'}
          </button>
        </div>
      </div>
    </EnterpriseLayout>
  );
}

export default function FeedbackManualPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64" style={{ color: 'rgba(255,255,255,0.3)' }}>Carregando...</div>}>
      <FeedbackManualContent />
    </Suspense>
  );
}
