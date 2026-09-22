'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { CheckSquare, Plus, Calendar, Filter, RefreshCw, X, Award,  } from 'lucide-react';
import {
  fetchPlanos5W2H,
  salvarPlano5W2H,
  registrarResultadoEficacia,
  fetchCiclos,
} from '@/lib/services/qualityDataService';
import { PlanoAcao5W2H, StatusPlano5W2H, Ciclo } from '@/lib/domain/types';
import { toast } from 'sonner';

function PlanosMelhoriaContent() {
  const searchParams = useSearchParams();

  const investigacaoIdParam = searchParams.get('investigacao_id');
  const tituloParam = searchParams.get('titulo');
  const causaParam = searchParams.get('causa');
  const periodoParam = searchParams.get('periodo');

  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [cicloSelecionado, setCicloSelecionado] = useState<string>(periodoParam || '08/2026');
  const [planos, setPlanos] = useState<PlanoAcao5W2H[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [loading, setLoading] = useState<boolean>(true);

  // Modais
  const [modalCriarAberta, setModalCriarAberta] = useState<boolean>(false);
  const [modalEficaciaAberta, setModalEficaciaAberta] = useState<boolean>(false);
  const [planoParaEficacia, setPlanoParaEficacia] = useState<PlanoAcao5W2H | null>(null);

  // Form de criação 5W2H
  const [formWhat, setFormWhat] = useState<string>('');
  const [formWhy, setFormWhy] = useState<string>(
    causaParam ? `Eliminar causa raiz: ${causaParam}` : ''
  );
  const [formWhere, setFormWhere] = useState<string>('Operação');
  const [formWho, setFormWho] = useState<string>('');
  const [formWhen, setFormWhen] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formHow, setFormHow] = useState<string>('');
  const [formHowMuch, setFormHowMuch] = useState<string>('R$ 0');
  const [formIndicador, setFormIndicador] = useState<string>('');
  const [formMeta, setFormMeta] = useState<string>('');
  const [formPrazoEficacia, setFormPrazoEficacia] = useState<number>(30);

  // Form resultado eficácia
  const [resultadoEficaciaTexto, setResultadoEficaciaTexto] = useState<string>('');
  const [eficaciaAtingida, setEficaciaAtingida] = useState<boolean>(true);

  // Carregar ciclos
  useEffect(() => {
    fetchCiclos().then((lista) => {
      setCiclos(lista);
      if (lista.length > 0 && !periodoParam) {
        setCicloSelecionado(lista[0].periodo);
      }
    });
  }, [periodoParam]);

  // Carregar planos reais do Supabase
  const carregarPlanos = async () => {
    setLoading(true);
    try {
      const data = await fetchPlanos5W2H(cicloSelecionado);
      setPlanos(data);
    } catch (err) {
      console.error('Erro ao carregar planos 5W2H:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cicloSelecionado) {
      carregarPlanos();
    }
  }, [cicloSelecionado]);

  // Se veio redirecionado de uma investigação validada, abre o modal pré-preenchido
  useEffect(() => {
    if (investigacaoIdParam && !loading) {
      setFormWhat(`Ação Corretiva: ${tituloParam || 'Tratativa de Não Conformidade'}`);
      setFormWhy(causaParam ? `Eliminar causa raiz validada: ${causaParam}` : 'Melhoria contínua');
      setModalCriarAberta(true);
    }
  }, [investigacaoIdParam, tituloParam, causaParam, loading]);

  const handleSalvarPlano = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWhat || !formWho || !formWhen) {
      toast.error('Preencha os campos obrigatórios (O que, Quem, Quando).');
      return;
    }

    try {
      const res = await salvarPlano5W2H({
        periodo: cicloSelecionado,
        investigacao_id: investigacaoIdParam || undefined,
        titulo: formWhat,
        o_que: formWhat,
        por_que: formWhy,
        onde: formWhere,
        quem: formWho,
        quando: formWhen,
        como: formHow,
        quanto: formHowMuch,
        indicador_alvo: formIndicador,
        meta_alvo: formMeta,
        prazo_eficacia_dias: formPrazoEficacia,
        status: 'em_execucao',
      });

      if (res.success) {
        toast.success('Plano de Ação 5W2H registrado com sucesso!');
        setModalCriarAberta(false);
        setFormWhat('');
        setFormWhy('');
        setFormWho('');
        setFormHow('');
        await carregarPlanos();
      } else {
        toast.error('Erro ao salvar plano: ' + res.error);
      }
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  };

  const handleAtualizarStatus = async (plano: PlanoAcao5W2H, novoStatus: StatusPlano5W2H) => {
    if (novoStatus === 'eficaz' || novoStatus === 'ineficaz') {
      setPlanoParaEficacia(plano);
      setModalEficaciaAberta(true);
      return;
    }

    try {
      await salvarPlano5W2H({
        id: plano.id,
        status: novoStatus,
      });
      toast.success(`Status atualizado para: ${novoStatus}`);
      await carregarPlanos();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleConfirmarEficacia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planoParaEficacia || !resultadoEficaciaTexto.trim()) return;

    try {
      const res = await registrarResultadoEficacia(
        planoParaEficacia.id,
        resultadoEficaciaTexto.trim(),
        eficaciaAtingida
      );

      if (res.success) {
        toast.success('Resultado de eficácia registrado com sucesso!');
        setModalEficaciaAberta(false);
        setPlanoParaEficacia(null);
        setResultadoEficaciaTexto('');
        await carregarPlanos();
      } else {
        toast.error('Erro ao registrar eficácia: ' + res.error);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const planosFiltrados = planos.filter((p) => {
    return filtroStatus === 'todos' || p.status === filtroStatus;
  });

  return (
    <EnterpriseLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Banner de Contexto */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-md shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-md">
              <CheckSquare size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-mono uppercase tracking-wider">
                Módulo de Melhoria
              </div>
              <h1 className="text-sm font-bold text-slate-900">
                Planos de Ação 5W2H & Aferição de Eficácia
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
              onClick={() => setModalCriarAberta(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-md transition-colors"
            >
              <Plus size={14} /> Novo Plano 5W2H
            </button>
          </div>
        </div>

        {/* Barra de Filtros e Totalizadores */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-3.5 bg-white border border-slate-200 rounded-md shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total de Ações</span>
            <p className="text-xl font-bold font-mono text-slate-900 mt-1">{planos.length}</p>
          </div>
          <div className="p-3.5 bg-white border border-slate-200 rounded-md shadow-sm">
            <span className="text-[11px] font-bold text-blue-600 uppercase">Em Execução</span>
            <p className="text-xl font-bold font-mono text-blue-700 mt-1">
              {planos.filter((p) => p.status === 'em_execucao').length}
            </p>
          </div>
          <div className="p-3.5 bg-white border border-slate-200 rounded-md shadow-sm">
            <span className="text-[11px] font-bold text-amber-600 uppercase">
              Aguardando Eficácia
            </span>
            <p className="text-xl font-bold font-mono text-amber-700 mt-1">
              {
                planos.filter(
                  (p) => p.status === 'em_afericao_eficacia' || p.status === 'concluido'
                ).length
              }
            </p>
          </div>
          <div className="p-3.5 bg-white border border-slate-200 rounded-md shadow-sm">
            <span className="text-[11px] font-bold text-emerald-600 uppercase">
              Eficazes (Homologados)
            </span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
              {planos.filter((p) => p.status === 'eficaz').length}
            </p>
          </div>
        </div>

        {/* Tabela Matriz 5W2H */}
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-slate-500" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Matriz de Ações de Melhoria
              </span>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-md text-slate-700 font-medium focus:outline-none"
              >
                <option value="todos">Todos os Status</option>
                <option value="em_execucao">Em Execução</option>
                <option value="concluido">Concluído</option>
                <option value="em_afericao_eficacia">Em Aferição</option>
                <option value="eficaz">Eficaz</option>
                <option value="ineficaz">Ineficaz</option>
              </select>

              <button onClick={carregarPlanos} className="text-slate-400 hover:text-slate-600">
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">O quê (What) & Por quê (Why)</th>
                  <th className="px-4 py-3">Quem (Who)</th>
                  <th className="px-4 py-3">Quando (When)</th>
                  <th className="px-4 py-3">Como (How) & Quanto (Cost)</th>
                  <th className="px-4 py-3">Meta & Eficácia</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      Carregando planos do banco de dados...
                    </td>
                  </tr>
                ) : planosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      Nenhum plano 5W2H cadastrado para este ciclo.
                    </td>
                  </tr>
                ) : (
                  planosFiltrados.map((plano) => (
                    <tr key={plano.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-bold text-slate-900">{plano.o_que}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          <strong>Motivo:</strong> {plano.por_que}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{plano.quem}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{plano.quando}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-slate-800 line-clamp-1">{plano.como}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Custo: {plano.quanto}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-blue-700">{plano.indicador_alvo}</div>
                        <div className="text-[11px] text-slate-500">
                          Prazo: {plano.prazo_eficacia_dias} dias
                          {plano.data_limite_eficacia && ` (até ${plano.data_limite_eficacia})`}
                        </div>
                        {plano.resultado_eficacia && (
                          <div className="text-[11px] font-medium text-emerald-800 mt-1 bg-emerald-50 p-1 rounded">
                            Res: {plano.resultado_eficacia}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            plano.status === 'eficaz' ?'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : plano.status === 'ineficaz' ?'bg-red-50 text-red-700 border border-red-200'
                                : plano.status === 'em_execucao' ?'bg-blue-50 text-blue-700 border border-blue-200' :'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {plano.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {plano.status !== 'eficaz' && plano.status !== 'ineficaz' && (
                            <button
                              onClick={() => {
                                setPlanoParaEficacia(plano);
                                setModalEficaciaAberta(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-bold"
                              title="Avaliar se a ação atingiu o resultado esperado"
                            >
                              Aferir Eficácia
                            </button>
                          )}
                          <select
                            value={plano.status}
                            onChange={(e) =>
                              handleAtualizarStatus(plano, e.target.value as StatusPlano5W2H)
                            }
                            className="text-[11px] border border-slate-200 rounded p-1 bg-white"
                          >
                            <option value="planejado">Planejado</option>
                            <option value="em_execucao">Em Execução</option>
                            <option value="concluido">Concluído</option>
                            <option value="em_afericao_eficacia">Em Aferição</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Novo Plano 5W2H */}
        {modalCriarAberta && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white border border-slate-200 rounded-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Novo Plano de Ação 5W2H
                </h3>
                <button
                  onClick={() => setModalCriarAberta(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <form
                onSubmit={handleSalvarPlano}
                className="p-6 space-y-3.5 text-xs overflow-y-auto flex-1"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    O que será feito (What)? *
                  </label>
                  <input
                    type="text"
                    value={formWhat}
                    onChange={(e) => setFormWhat(e.target.value)}
                    placeholder="Ex: Criar checklist de validação no sistema"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Por que será feito (Why)? *
                  </label>
                  <input
                    type="text"
                    value={formWhy}
                    onChange={(e) => setFormWhy(e.target.value)}
                    placeholder="Ex: Eliminar causa raiz de desvios no pilar P2"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Quem executará (Who)? *
                    </label>
                    <input
                      type="text"
                      value={formWho}
                      onChange={(e) => setFormWho(e.target.value)}
                      placeholder="Ex: Coordenação de Atendimento"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Prazo Limite (When)? *
                    </label>
                    <input
                      type="date"
                      value={formWhen}
                      onChange={(e) => setFormWhen(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Onde será aplicado (Where)?
                    </label>
                    <input
                      type="text"
                      value={formWhere}
                      onChange={(e) => setFormWhere(e.target.value)}
                      placeholder="Ex: Squad Financeiro Fiscal"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Quanto custará (How Much)?
                    </label>
                    <input
                      type="text"
                      value={formHowMuch}
                      onChange={(e) => setFormHowMuch(e.target.value)}
                      placeholder="Ex: R$ 0 ou 4 horas"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Como será executado (How)?
                  </label>
                  <textarea
                    rows={2}
                    value={formHow}
                    onChange={(e) => setFormHow(e.target.value)}
                    placeholder="Detalhamento técnico da execução da ação..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block font-semibold text-blue-700 mb-1">Indicador Alvo</label>
                    <input
                      type="text"
                      value={formIndicador}
                      onChange={(e) => setFormIndicador(e.target.value)}
                      placeholder="Ex: Não Conformidades / P2.4"
                      className="w-full px-3 py-1.5 border border-blue-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-blue-700 mb-1">
                      Janela de Eficácia (Dias)
                    </label>
                    <select
                      value={formPrazoEficacia}
                      onChange={(e) => setFormPrazoEficacia(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-blue-200 rounded-md"
                    >
                      <option value={30}>30 Dias</option>
                      <option value={45}>45 Dias</option>
                      <option value={60}>60 Dias</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalCriarAberta(false)}
                    className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-md"
                  >
                    Gravar Plano 5W2H
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Registrar Eficácia */}
        {modalEficaciaAberta && planoParaEficacia && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-md shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Registro de Eficácia da Ação
                  </h3>
                </div>
                <button
                  onClick={() => setModalEficaciaAberta(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleConfirmarEficacia} className="p-5 space-y-3.5 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700">
                  <p className="font-bold text-slate-900">{planoParaEficacia.o_que}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Responsável: {planoParaEficacia.quem} | Indicador:{' '}
                    {planoParaEficacia.indicador_alvo}
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    A ação atingiu o resultado esperado?
                  </label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={eficaciaAtingida === true}
                        onChange={() => setEficaciaAtingida(true)}
                      />
                      <span className="font-bold text-emerald-700">Sim (Eficaz)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={eficaciaAtingida === false}
                        onChange={() => setEficaciaAtingida(false)}
                      />
                      <span className="font-bold text-red-600">Não (Ineficaz)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Comprovação e Resultado Mensurado *
                  </label>
                  <textarea
                    rows={3}
                    value={resultadoEficaciaTexto}
                    onChange={(e) => setResultadoEficaciaTexto(e.target.value)}
                    placeholder="Ex: No ciclo 09/2026, as NCs deste tipo caíram para zero e a equipe atingiu conformidade total."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalEficaciaAberta(false)}
                    className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-md"
                  >
                    Homologar Eficácia
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

export default function PlanosMelhoriaPage() {
  return (
    <Suspense
      fallback={<div className="p-6 text-xs text-slate-400">Carregando planos 5W2H...</div>}
    >
      <PlanosMelhoriaContent />
    </Suspense>
  );
}
