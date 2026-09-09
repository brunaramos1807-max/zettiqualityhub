'use client';

import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { fetchCiclos, salvarCiclo, homologarCiclo } from '@/lib/services/qualityDataService';
import { Ciclo, CicloStatus } from '@/lib/domain/types';
import { isCicloHomologado } from '@/lib/domain/cycleGovernance';
import {
  RefreshCw,
  Lock,
  Unlock,
  Calendar,
  Plus,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  X,
  Edit3,
  Activity,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function CiclosPage() {
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal Criar/Editar Ciclo
  const [modalAberta, setModalAberta] = useState<boolean>(false);
  const [cicloEditando, setCicloEditando] = useState<Ciclo | null>(null);
  const [formIdentificacao, setFormIdentificacao] = useState<string>('Ciclo 09/2026');
  const [formDataInicio, setFormDataInicio] = useState<string>('');
  const [formDataFim, setFormDataFim] = useState<string>('');
  const [formStatus, setFormStatus] = useState<CicloStatus>('aberto');
  const [salvando, setSalvando] = useState<boolean>(false);

  // Modal Homologação
  const [modalHomologarAberta, setModalHomologarAberta] = useState<boolean>(false);
  const [cicloParaHomologar, setCicloParaHomologar] = useState<Ciclo | null>(null);
  const [homologando, setHomologando] = useState<boolean>(false);

  const carregarCiclos = useCallback(async () => {
    setLoading(true);
    try {
      const lista = await fetchCiclos();
      setCiclos(lista);
    } catch (err) {
      console.error('Erro ao buscar ciclos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarCiclos();
  }, [carregarCiclos]);

  const handleAbrirCriar = () => {
    setCicloEditando(null);
    setFormIdentificacao('Ciclo 10/2026');
    setFormDataInicio('');
    setFormDataFim('');
    setFormStatus('aberto');
    setModalAberta(true);
  };

  const handleAbrirEditar = (ciclo: Ciclo) => {
    if (isCicloHomologado(ciclo)) {
      toast.error('Ciclos homologados não podem ser editados (imutabilidade histórica).');
      return;
    }
    setCicloEditando(ciclo);
    setFormIdentificacao(ciclo.identificacao);
    setFormDataInicio(ciclo.data_inicio || '');
    setFormDataFim(ciclo.data_fim || '');
    setFormStatus(ciclo.status);
    setModalAberta(true);
  };

  const handleSalvarCiclo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formIdentificacao || !formDataInicio || !formDataFim) {
      toast.error('Informe a identificação do ciclo (Mês/Ano) e as datas de início e fim.');
      return;
    }

    if (formDataInicio > formDataFim) {
      toast.error('A data de início não pode ser posterior à data final.');
      return;
    }

    setSalvando(true);
    try {
      const res = await salvarCiclo({
        id: cicloEditando?.id,
        identificacao: formIdentificacao,
        periodo: formIdentificacao,
        data_inicio: formDataInicio,
        data_fim: formDataFim,
        status: formStatus,
      });

      if (res.success) {
        toast.success(`Ciclo ${formIdentificacao} gravado com sucesso!`);
        setModalAberta(false);
        carregarCiclos();
      } else {
        toast.error('Erro ao salvar ciclo: ' + res.error);
      }
    } catch (err: any) {
      toast.error('Falha: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleHomologar = async () => {
    if (!cicloParaHomologar) return;
    setHomologando(true);
    try {
      const res = await homologarCiclo(cicloParaHomologar.periodo);
      if (res.success) {
        toast.success(
          `O ${cicloParaHomologar.identificacao} foi HOMOLOGADO. Dados e datas agora estão bloqueados contra alterações.`
        );
        setModalHomologarAberta(false);
        setCicloParaHomologar(null);
        carregarCiclos();
      } else {
        toast.error('Erro ao homologar ciclo: ' + res.error);
      }
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setHomologando(false);
    }
  };

  return (
    <EnterpriseLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Banner de Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-md shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 border border-blue-100 text-blue-700 rounded-md">
              <Calendar size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-mono uppercase tracking-wider">
                Governança de Ciclos
              </div>
              <h1 className="text-sm font-bold text-slate-900">
                Gestão de Ciclos de Competência (Mês/Ano & Datas Manuais)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Não utilizamos períodos fixos automáticos. As datas de início e fim cadastradas
                governam os filtros e a validação de dados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={carregarCiclos}
              className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
              title="Recarregar ciclos"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleAbrirCriar}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-md shadow-sm transition-colors"
            >
              <Plus size={14} /> Novo Ciclo de Qualidade
            </button>
          </div>
        </div>

        {/* Tabela Oficial de Ciclos */}
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Ciclos Cadastrados no Sistema
            </h3>
            <span className="text-xs font-semibold text-slate-500">{ciclos.length} ciclo(s)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Identificação (Mês/Ano)</th>
                  <th className="px-4 py-3">Data de Início</th>
                  <th className="px-4 py-3">Data Final</th>
                  <th className="px-4 py-3 text-right">Avaliações</th>
                  <th className="px-4 py-3 text-center">Status do Ciclo</th>
                  <th className="px-4 py-3 text-center">Governança</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      Carregando ciclos do banco...
                    </td>
                  </tr>
                ) : ciclos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      Nenhum ciclo cadastrado. Clique em &quot;Novo Ciclo&quot; para iniciar.
                    </td>
                  </tr>
                ) : (
                  ciclos.map((c) => {
                    const homologado = isCicloHomologado(c);
                    return (
                      <tr key={c.periodo} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 font-mono">
                          {c.identificacao}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">
                          {c.data_inicio || (
                            <span className="text-slate-400 italic">Não informada</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">
                          {c.data_fim || (
                            <span className="text-slate-400 italic">Não informada</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                          {c.total_avaliacoes}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              c.status === 'fechado_homologado'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : c.status === 'em_validacao'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : c.status === 'em_apuracao'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {c.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {homologado ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <Lock size={12} /> Homologado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                              <Unlock size={12} /> Editável
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!homologado ? (
                              <>
                                <button
                                  onClick={() => handleAbrirEditar(c)}
                                  className="p-1 text-slate-500 hover:text-blue-700 rounded transition-colors"
                                  title="Editar datas e identificação"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  onClick={() => {
                                    setCicloParaHomologar(c);
                                    setModalHomologarAberta(true);
                                  }}
                                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold transition-colors"
                                  title="Homologar e fechar ciclo de forma imutável"
                                >
                                  Homologar
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono italic">
                                Imutável
                              </span>
                            )}
                            <Link
                              href={`/medicoes?periodo=${c.periodo}`}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold"
                            >
                              Ver Medição
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Criar / Editar Ciclo */}
        {modalAberta && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-md shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  {cicloEditando
                    ? `Editar ${cicloEditando.identificacao}`
                    : 'Novo Ciclo de Competência'}
                </h3>
                <button
                  onClick={() => setModalAberta(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSalvarCiclo} className="p-5 space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Identificação do Ciclo (Mês e Ano) *
                  </label>
                  <input
                    type="text"
                    value={formIdentificacao}
                    onChange={(e) => setFormIdentificacao(e.target.value)}
                    placeholder="Ex: Ciclo 09/2026 ou 09/2026"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Identificador canônico exibido em todas as telas analíticas.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Data de Início *
                    </label>
                    <input
                      type="date"
                      value={formDataInicio}
                      onChange={(e) => setFormDataInicio(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Data Final *</label>
                    <input
                      type="date"
                      value={formDataFim}
                      onChange={(e) => setFormDataFim(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estado do Ciclo</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as CicloStatus)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-medium"
                  >
                    <option value="aberto">Aberto (Em coleta inicial)</option>
                    <option value="em_apuracao">Em Apuração (Cálculo de conformidade)</option>
                    <option value="em_validacao">Em Validação (Auditoria final)</option>
                  </select>
                </div>

                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-800">
                  Importações e lançamentos deste ciclo serão validados contra o intervalo de datas
                  informado acima.
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalAberta(false)}
                    className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando}
                    className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-md"
                  >
                    {salvando ? 'Gravando...' : 'Gravar Ciclo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Homologar Ciclo */}
        {modalHomologarAberta && cicloParaHomologar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-white border border-slate-200 rounded-md shadow-2xl overflow-hidden p-5 space-y-4">
              <div className="flex items-center gap-2.5 text-red-600">
                <ShieldCheck size={20} />
                <h3 className="text-xs font-bold text-slate-900 uppercase">
                  Homologar {cicloParaHomologar.identificacao}
                </h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                A homologação é um ato formal de governança. Ao homologar, o ciclo é fechado em
                definitivo e{' '}
                <strong className="text-slate-900">
                  nenhuma data, identificação ou registro poderá ser alterado ou reinserido
                </strong>
                , preservando a rastreabilidade forense da qualidade.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setModalHomologarAberta(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-md text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleHomologar}
                  disabled={homologando}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-md text-xs"
                >
                  {homologando ? 'Homologando...' : 'Confirmar Homologação'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </EnterpriseLayout>
  );
}
