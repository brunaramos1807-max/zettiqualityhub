'use client';
import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import ImportModal from '@/components/ImportModal';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import { createClient } from '@/lib/supabase/client';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';


interface ImportRecord {
  id: string;
  fileName: string;
  tipo: string;
  modo: string;
  periodo: string;
  data: string;
  rows: number;
  status: string;
}

export default function ImportacoesPage() {
  const [importOpen, setImportOpen] = useState(false);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const { session } = useSystemAuth();

  const loadImports = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      if (supabase) {
        const { data: cycles, error } = await supabase
          .from('import_cycles')
          .select('*')
          .order('updated_at', { ascending: false });

        if (!error && cycles && cycles.length > 0) {
          const mapped: ImportRecord[] = cycles.map((c: any) => ({
            id: c.id,
            fileName: c.file_name || 'Importação de Dados',
            tipo:
              c.data_type === 'scores' ?'Qualidade QA/IEPC'
                : c.data_type === 'ncs' ?'Não Conformidades' :'Dataset Analítico',
            modo: c.status === 'em_andamento' ? 'Por Andamento' : 'Ciclo Consolidado',
            periodo: c.periodo,
            data: c.updated_at || c.created_at || new Date().toISOString(),
            rows: c.record_count || 0,
            status: c.is_closed ? 'Homologado' : 'Aberto',
          }));
          setImports(mapped);
          setLoading(false);
          return;
        } else {
          setImports([]);
          setLoading(false);
          return;
        }
      }
      setImports([]);
    } catch {
      setImports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImports();
  }, [loadImports]);



  return (
    <EnterpriseLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Central de Ingestão de Dados
              </h1>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                Canônico
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Recepção, validação e auditoria de lotes de resultados externos (QA, IEPC e Não
              Conformidades).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => loadImports()}
              className="p-2 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-md transition-colors"
              title="Recarregar histórico"
            >
              <RefreshCw size={14} />
            </button>
            <Link
              href="/ciclos"
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 rounded-md transition-colors"
            >
              Governança de Ciclos
            </Link>
            <button
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-xs font-semibold text-white rounded-md transition-colors shadow-sm"
            >
              <Upload size={14} />
              Nova Ingestão (XLSX/CSV)
            </button>
          </div>
        </div>

        {/* Pipeline Architecture Banner */}
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0 border border-blue-100">
              <ShieldCheck size={18} />
            </div>
            <div className="flex-1 min-w-0 text-xs text-slate-600">
              <p className="font-bold text-slate-800 uppercase tracking-wide">
                Garantia de Integridade e Fronteira do Produto
              </p>
              <p className="mt-0.5">
                O QualiVisão processa estritamente dados consolidados da qualidade. Todas as
                entradas passam pelo contrato canônico de validação (Zod), preservando a separação
                metodológica entre QA (técnico), IEPC (percepção) e Não Conformidades (eventos com
                dedução configurável).
              </p>
            </div>
          </div>
        </div>

        {/* Ingestion History Table */}
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={15} className="text-slate-500" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Lotes de Ingestão Registrados
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {imports.length} {imports.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Ciclo</th>
                  <th className="px-5 py-3">Arquivo / Origem</th>
                  <th className="px-5 py-3">Tipo de Dado</th>
                  <th className="px-5 py-3">Modo</th>
                  <th className="px-5 py-3 text-right">Registros</th>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Governança</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                      Carregando histórico de ingestão...
                    </td>
                  </tr>
                ) : imports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                      Nenhuma importação registrada até o momento.
                    </td>
                  </tr>
                ) : (
                  imports.map((imp) => (
                    <tr key={imp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-slate-900">
                        {imp.periodo}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-800">{imp.fileName}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {imp.tipo}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{imp.modo}</td>
                      <td className="px-5 py-3 text-right font-mono font-semibold text-slate-800">
                        {imp.rows}
                      </td>
                      <td className="px-5 py-3 text-slate-500 font-mono text-[11px]">
                        {new Date(imp.data).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            imp.status === 'Homologado' ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          <CheckCircle2 size={12} /> {imp.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/medicoes?periodo=${imp.periodo}`}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors"
                        >
                          Ver Medição
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Ingestão Canônica */}
        <ImportModal
          isOpen={importOpen}
          onClose={() => setImportOpen(false)}
          onImportSuccess={() => loadImports()}
        />


      </div>
    </EnterpriseLayout>
  );
}
