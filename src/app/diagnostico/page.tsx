'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import {
  GitBranch,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
  Layers,
  Plus,
  FileText,
  AlertCircle,
  Calendar,
  RefreshCw,
  X,
  Trash2,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import {
  fetchInvestigacoes,
  salvarInvestigacao,
  validarCausaRaiz,
  fetchCiclos,
} from '@/lib/services/qualityDataService';
import {
  InvestigacaoQualidade,
  Ciclo,
  IshikawaCategoria,
  CincoPorquesItem,
} from '@/lib/domain/types';
import { toast } from 'sonner';

const CATEGORIAS_ISHIKAWA_PADRAO: IshikawaCategoria[] = [
  { categoria: 'metodo', label: 'Método (Processos & Procedimentos)', itens: [] },
  { categoria: 'mao_de_obra', label: 'Mão de Obra (Competências & Capacitação)', itens: [] },
  { categoria: 'maquina', label: 'Máquina (Sistemas, Ferramentas & Equipamentos)', itens: [] },
  { categoria: 'material', label: 'Material (Insumos, Bases & Documentos)', itens: [] },
  { categoria: 'medicao', label: 'Medição (Critérios, Amostragens & Métricas)', itens: [] },
  { categoria: 'meio_ambiente', label: 'Meio Ambiente (Cultura, Clima & Contexto)', itens: [] },
];

function DiagnosticoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const fatorParam = searchParams.get('fator');
  const periodoParam = searchParams.get('periodo');
  const squadParam = searchParams.get('squad');

  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [cicloSelecionado, setCicloSelecionado] = useState<string>(periodoParam || '08/2026');
  const [investigacoes, setInvestigacoes] = useState<InvestigacaoQualidade[]>([]);
  const [investigacaoAtivaId, setInvestigacaoAtivaId] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'ishikawa' | '5porques'>('ishikawa');
  const [loading, setLoading] = useState<boolean>(true);

  // Modal nova investigação
  const [modalNovaAberta, setModalNovaAberta] = useState<boolean>(false);
  const [novoTitulo, setNovoTitulo] = useState<string>(
    fatorParam ? `Investigação: ${fatorParam}` : ''
  );
  const [novoDesvio, setNovoDesvio] = useState<string>(fatorParam || '');
  const [novoIndicador, setNovoIndicador] = useState<string>('Não Conformidades / QA');
  const [novoSquad, setNovoSquad] = useState<string>(squadParam || '');

  // Estado da investigação ativa
  const investigacaoAtiva =
    investigacoes.find((i) => i.id === investigacaoAtivaId) || investigacoes[0] || null;

  // Item inputs
  const [novoItemIshikawa, setNovoItemIshikawa] = useState<{ categoria: string; texto: string }>({
    categoria: 'metodo',
    texto: '',
  });

  const [novaPerguntaPorque, setNovaPerguntaPorque] = useState<string>('');
  const [novaRespostaPorque, setNovaRespostaPorque] = useState<string>('');

  // Carregar ciclos
  useEffect(() => {
    fetchCiclos().then((lista) => {
      setCiclos(lista);
      if (lista.length > 0 && !periodoParam) {
        setCicloSelecionado(lista[0].periodo);
      }
    });
  }, [periodoParam]);

  // Carregar investigações do banco
  const carregarInvestigacoes = async () => {
    setLoading(true);
    try {
      const data = await fetchInvestigacoes(cicloSelecionado);
      setInvestigacoes(data);
      if (data.length > 0) {
        setInvestigacaoAtivaId(data[0].id);
      } else {
        setInvestigacaoAtivaId(null);
      }
    } catch (err) {
      console.error('Erro ao carregar investigações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cicloSelecionado) {
      carregarInvestigacoes();
    }
  }, [cicloSelecionado]);

  // Se veio parâmetro da tela de Pareto e ainda não tem investigação correspondente, abre o modal
  useEffect(() => {
    if (fatorParam && !loading) {
      setModalNovaAberta(true);
    }
  }, [fatorParam, loading]);

  const handleCriarInvestigacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo) return;

    try {
      const res = await salvarInvestigacao({
        periodo: cicloSelecionado,
        titulo: novoTitulo,
        desvio_detectado: novoDesvio,
        indicador_afetado: novoIndicador,
        squad: novoSquad || undefined,
        status: 'aberta',
        ishikawa: CATEGORIAS_ISHIKAWA_PADRAO,
        cinco_porques: [],
      });

      if (res.success) {
        toast.success('Investigação criada e persistida com sucesso!');
        setModalNovaAberta(false);
        setNovoTitulo('');
        setNovoDesvio('');
        await carregarInvestigacoes();
        if (res.id) setInvestigacaoAtivaId(res.id);
      } else {
        toast.error('Erro ao criar investigação: ' + res.error);
      }
    } catch (err: any) {
      toast.error('Falha ao salvar: ' + err.message);
    }
  };

  const handleAdicionarItemIshikawa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investigacaoAtiva || !novoItemIshikawa.texto.trim()) return;

    const currentIshikawa: IshikawaCategoria[] = investigacaoAtiva.ishikawa?.length
      ? [...investigacaoAtiva.ishikawa]
      : CATEGORIAS_ISHIKAWA_PADRAO.map((c) => ({ ...c, itens: [] }));

    const targetCat = currentIshikawa.find((c) => c.categoria === novoItemIshikawa.categoria);
    if (targetCat) {
      targetCat.itens.push(novoItemIshikawa.texto.trim());
    } else {
      currentIshikawa.push({
        categoria: novoItemIshikawa.categoria as any,
        label: novoItemIshikawa.categoria,
        itens: [novoItemIshikawa.texto.trim()],
      });
    }

    try {
      await salvarInvestigacao({
        id: investigacaoAtiva.id,
        ishikawa: currentIshikawa,
        status: 'em_analise',
      });
      setNovoItemIshikawa({ ...novoItemIshikawa, texto: '' });
      await carregarInvestigacoes();
      toast.success('Fator adicionado ao Diagrama de Ishikawa.');
    } catch (err: any) {
      toast.error('Erro ao salvar fator: ' + err.message);
    }
  };

  const handleAdicionarPorque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investigacaoAtiva || !novaPerguntaPorque.trim() || !novaRespostaPorque.trim()) return;

    const currentPorques: CincoPorquesItem[] = investigacaoAtiva.cinco_porques || [];
    const novoNivel = currentPorques.length + 1;

    const updated = [
      ...currentPorques,
      {
        nivel: novoNivel,
        pergunta: novaPerguntaPorque.trim(),
        resposta: novaRespostaPorque.trim(),
      },
    ];

    try {
      await salvarInvestigacao({
        id: investigacaoAtiva.id,
        cinco_porques: updated,
        status: 'em_analise',
      });
      setNovaPerguntaPorque('');
      setNovaRespostaPorque('');
      await carregarInvestigacoes();
      toast.success(`Porquê #${novoNivel} registrado no banco.`);
    } catch (err: any) {
      toast.error('Erro ao salvar porquê: ' + err.message);
    }
  };

  const handleValidarCausa = async (causaTexto: string) => {
    if (!investigacaoAtiva) return;
    try {
      const res = await validarCausaRaiz(investigacaoAtiva.id, causaTexto);
      if (res.success) {
        toast.success('Causa raiz validada com sucesso!');
        await carregarInvestigacoes();
      } else {
        toast.error('Erro: ' + res.error);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <EnterpriseLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Banner de Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-md shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 border border-purple-100 text-purple-700 rounded-md">
              <GitBranch size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-mono uppercase tracking-wider">
                Módulo de Diagnóstico
              </div>
              <h1 className="text-sm font-bold text-slate-900">
                Central de Investigação Causal (Ishikawa 6Ms & 5 Porquês)
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700">
              <Calendar size={14} className="text-slate-500" />
              <span className="font-semibold">Ciclo:</span>
              <select
                value={cicloSelecionado}
                onChange={(e) => setCicloSelecionado(e.target.value)}
                className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
              >
                {ciclos.map((c) => (
                  <option key={c.periodo} value={c.periodo}>
                    {c.identificacao}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setModalNovaAberta(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-md transition-colors"
            >
              <Plus size={14} /> Nova Investigação
            </button>
          </div>
        </div>

        {/* Layout de Duas Colunas: Lista de Investigações + Painel de Análise */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Investigações do Ciclo (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Investigações do Ciclo ({investigacoes.length})
              </span>
              <button
                onClick={carregarInvestigacoes}
                className="text-slate-400 hover:text-slate-600"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-md">
                Carregando investigações do banco...
              </div>
            ) : investigacoes.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-md space-y-3">
                <AlertCircle size={28} className="mx-auto text-slate-300" />
                <p className="text-xs text-slate-600 font-medium">
                  Nenhuma investigação aberta para este ciclo.
                </p>
                <button
                  onClick={() => setModalNovaAberta(true)}
                  className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold rounded-md"
                >
                  Abrir Primeira Investigação
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {investigacoes.map((inv) => {
                  const isSelected = inv.id === investigacaoAtiva?.id;
                  return (
                    <div
                      key={inv.id}
                      onClick={() => setInvestigacaoAtivaId(inv.id)}
                      className={`p-3.5 rounded-md border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-purple-50/50 border-purple-500 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            inv.status === 'causa_validada'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inv.status === 'convertida_plano'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {inv.status.replace('_', ' ')}
                        </span>
                        {inv.squad && (
                          <span className="text-[10px] font-medium text-slate-500">
                            {inv.squad}
                          </span>
                        )}
                      </div>

                      <h3 className="text-xs font-bold text-slate-900 mt-2 line-clamp-2">
                        {inv.titulo}
                      </h3>

                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        Desvio: {inv.desvio_detectado}
                      </p>

                      {inv.causa_raiz_validada && (
                        <div className="mt-2.5 p-2 bg-emerald-50/80 border border-emerald-200 rounded text-[11px] text-emerald-900 font-medium">
                          <strong>Causa Validada:</strong> {inv.causa_raiz_validada}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Coluna Direita: Estúdio de Diagnóstico (8 cols) */}
          <div className="lg:col-span-8">
            {investigacaoAtiva ? (
              <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden flex flex-col">
                {/* Header da Investigação */}
                <div className="p-5 border-b border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-purple-700 font-bold">
                      {cicloSelecionado} | {investigacaoAtiva.squad || 'Geral'}
                    </span>

                    {investigacaoAtiva.status === 'causa_validada' && (
                      <Link
                        href={`/melhoria/planos?investigacao_id=${investigacaoAtiva.id}&titulo=${encodeURIComponent(investigacaoAtiva.titulo)}&causa=${encodeURIComponent(investigacaoAtiva.causa_raiz_validada || '')}&periodo=${cicloSelecionado}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-md shadow-sm"
                      >
                        Transformar em Plano 5W2H <ArrowRight size={13} />
                      </Link>
                    )}
                  </div>

                  <h2 className="text-sm font-bold text-slate-900">{investigacaoAtiva.titulo}</h2>
                  <p className="text-xs text-slate-600">
                    <strong>Desvio Detectado:</strong> {investigacaoAtiva.desvio_detectado}
                  </p>

                  {/* Abas Ishikawa vs 5 Porquês */}
                  <div className="flex gap-2 pt-3">
                    <button
                      onClick={() => setAbaAtiva('ishikawa')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                        abaAtiva === 'ishikawa'
                          ? 'bg-purple-700 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Diagrama de Ishikawa (6Ms)
                    </button>
                    <button
                      onClick={() => setAbaAtiva('5porques')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                        abaAtiva === '5porques'
                          ? 'bg-purple-700 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Árvore dos 5 Porquês
                    </button>
                  </div>
                </div>

                {/* ABA 1: ISHIKAWA 6Ms */}
                {abaAtiva === 'ishikawa' && (
                  <div className="p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {CATEGORIAS_ISHIKAWA_PADRAO.map((catInfo) => {
                        const existingCat = investigacaoAtiva.ishikawa?.find(
                          (c) => c.categoria === catInfo.categoria
                        );
                        const itens = existingCat?.itens || [];

                        return (
                          <div
                            key={catInfo.categoria}
                            className="p-3.5 bg-slate-50 border border-slate-200 rounded-md"
                          >
                            <h4 className="text-xs font-bold text-slate-800 mb-2">
                              {catInfo.label}
                            </h4>
                            {itens.length === 0 ? (
                              <p className="text-[11px] text-slate-400 italic">
                                Nenhum fator apontado.
                              </p>
                            ) : (
                              <ul className="space-y-1 text-xs">
                                {itens.map((item, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start justify-between gap-2 p-1.5 bg-white border border-slate-200 rounded text-slate-800"
                                  >
                                    <span>{item}</span>
                                    <button
                                      onClick={() => handleValidarCausa(item)}
                                      className="text-[10px] text-purple-700 font-bold hover:underline flex-shrink-0"
                                      title="Definir este fator como causa raiz validada"
                                    >
                                      Validar Causa
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Formulário para adicionar fator ao Ishikawa */}
                    <form
                      onSubmit={handleAdicionarItemIshikawa}
                      className="p-4 bg-purple-50/50 border border-purple-200 rounded-md flex flex-wrap items-center gap-3"
                    >
                      <select
                        value={novoItemIshikawa.categoria}
                        onChange={(e) =>
                          setNovoItemIshikawa({ ...novoItemIshikawa, categoria: e.target.value })
                        }
                        className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium focus:outline-none"
                      >
                        {CATEGORIAS_ISHIKAWA_PADRAO.map((c) => (
                          <option key={c.categoria} value={c.categoria}>
                            {c.label}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Descreva a hipótese ou fator causal..."
                        value={novoItemIshikawa.texto}
                        onChange={(e) =>
                          setNovoItemIshikawa({ ...novoItemIshikawa, texto: e.target.value })
                        }
                        className="flex-1 min-w-[200px] px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-purple-600"
                        required
                      />

                      <button
                        type="submit"
                        className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-md"
                      >
                        Adicionar Fator
                      </button>
                    </form>
                  </div>
                )}

                {/* ABA 2: 5 PORQUÊS */}
                {abaAtiva === '5porques' && (
                  <div className="p-5 space-y-5">
                    <div className="space-y-3">
                      {!investigacaoAtiva.cinco_porques ||
                      investigacaoAtiva.cinco_porques.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-6 text-center">
                          Nenhum nível de porquê encadeado ainda. Inicie o encadeamento causal
                          abaixo.
                        </p>
                      ) : (
                        investigacaoAtiva.cinco_porques.map((item) => (
                          <div
                            key={item.nivel}
                            className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded font-mono">
                                #{item.nivel} PORQUÊ
                              </span>
                              <button
                                onClick={() => handleValidarCausa(item.resposta)}
                                className="text-[11px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                              >
                                <CheckCircle2 size={12} /> Validar como Causa Raiz
                              </button>
                            </div>
                            <p className="text-xs font-bold text-slate-900 mt-1">
                              P: {item.pergunta}
                            </p>
                            <p className="text-xs text-slate-700 bg-white p-2 border border-slate-100 rounded">
                              R: {item.resposta}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Formulário para adicionar próximo porquê */}
                    <form
                      onSubmit={handleAdicionarPorque}
                      className="p-4 bg-purple-50/50 border border-purple-200 rounded-md space-y-3"
                    >
                      <h4 className="text-xs font-bold text-slate-800">
                        Adicionar Próximo Nível (Porquê #
                        {(investigacaoAtiva.cinco_porques?.length || 0) + 1})
                      </h4>
                      <input
                        type="text"
                        placeholder="Por que este problema ou efeito ocorreu?"
                        value={novaPerguntaPorque}
                        onChange={(e) => setNovaPerguntaPorque(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-purple-600"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Resposta ou constatação técnica comprovada..."
                        value={novaRespostaPorque}
                        onChange={(e) => setNovaRespostaPorque(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-purple-600"
                        required
                      />
                      <div className="text-right">
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-md"
                        >
                          Registrar Resposta
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-md p-12 text-center text-slate-400 text-xs">
                Selecione ou crie uma investigação para visualizar o estúdio de causa raiz.
              </div>
            )}
          </div>
        </div>

        {/* Modal Nova Investigação */}
        {modalNovaAberta && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-md shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Nova Investigação de Causa Raiz
                </h3>
                <button
                  onClick={() => setModalNovaAberta(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCriarInvestigacao} className="p-5 space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Título da Investigação *
                  </label>
                  <input
                    type="text"
                    value={novoTitulo}
                    onChange={(e) => setNovoTitulo(e.target.value)}
                    placeholder="Ex: Análise de falhas de documentação técnica"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-purple-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Desvio / Problema Observado *
                  </label>
                  <input
                    type="text"
                    value={novoDesvio}
                    onChange={(e) => setNovoDesvio(e.target.value)}
                    placeholder="Ex: Concentração de 8 NCs de rastreabilidade"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-purple-600"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Indicador Afetado
                    </label>
                    <input
                      type="text"
                      value={novoIndicador}
                      onChange={(e) => setNovoIndicador(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Squad / Equipe
                    </label>
                    <input
                      type="text"
                      value={novoSquad}
                      onChange={(e) => setNovoSquad(e.target.value)}
                      placeholder="Ex: Financeiro Fiscal"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalNovaAberta(false)}
                    className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-md"
                  >
                    Abrir Investigação
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </EnterpriseLayout>
  );
}

export default function DiagnosticoPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-xs text-slate-400">Carregando estúdio de diagnóstico...</div>
      }
    >
      <DiagnosticoContent />
    </Suspense>
  );
}
