'use client';
import React, { useState } from 'react';
import {
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Shield,
  FileText,
  Info,
} from 'lucide-react';
import { NC_RECORDS } from '@/lib/mockData';

const NC_TYPES = [
  {
    id: 'tipo-1',
    tipo: 'Integridade do Fluxo Operacional',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
    icon: Shield,
    descricao:
      'Ocorre quando o analista não segue o fluxo operacional definido, como não registrar o protocolo SUP, redirecionar o cliente sem validação prévia, ou resolver demandas fora do escopo sem acionamento do nível superior.',
    criterios: [
      'Não formalização do protocolo SUP no início do atendimento',
      'Redirecionamento sem validação prévia da demanda',
      'Resolução de demanda fora do escopo sem escalação',
      'Interrupção do fluxo sem esclarecimento ao cliente',
    ],
    pontos: -20,
    referencias: ['P1.1.2', 'P2.2.2', 'P2.2.3'],
  },
  {
    id: 'tipo-2',
    tipo: 'Conformidade de Registro e Rastreabilidade',
    color: '#EAB308',
    bg: 'rgba(234,179,8,0.08)',
    border: 'rgba(234,179,8,0.2)',
    icon: FileText,
    descricao:
      'Ocorre quando há falhas no registro técnico do atendimento, como ausência de documentação, encerramento sem confirmação do cliente, ou falta de identificação/boas-vindas no início da interação.',
    criterios: [
      'Ausência de boas-vindas e identificação do analista (P1.1.1)',
      'Protocolo não comunicado ao cliente (P1.1.2)',
      'Encerramento sem confirmação formal do cliente (P1.1.3)',
      'Documentação técnica ausente ou incompleta',
      'Sistema não atualizado com status de resolução',
    ],
    pontos: -20,
    referencias: ['P1.1.1', 'P1.1.2', 'P1.1.3', 'P2.2.4'],
  },
];

const GUIDE_SECTIONS = [
  {
    id: 'guide-1',
    title: 'O que é uma Não Conformidade (NC)?',
    icon: BookOpen,
    content:
      'Uma Não Conformidade é qualquer desvio identificado durante a auditoria de qualidade em relação aos critérios estabelecidos no Manual de Qualidade v1.0. Cada NC registrada resulta em dedução de 20 pontos na nota final do analista no ciclo avaliado.',
  },
  {
    id: 'guide-2',
    title: 'Como são identificadas?',
    icon: Search,
    content:
      'As NCs são identificadas pelos auditores de qualidade durante a revisão das interações de atendimento. O auditor analisa cada protocolo conforme os critérios dos pilares P1 a P5 (QA) e E1 a E5 (IEPC), registrando qualquer desvio encontrado com descrição detalhada e referência ao critério violado.',
  },
  {
    id: 'guide-3',
    title: 'Impacto na nota final',
    icon: AlertTriangle,
    content:
      'Cada NC deduz 20 pontos da nota bruta do analista. Um analista com nota bruta de 100 e 2 NCs terá nota final de 60. O limite de NCs por ciclo que resulta em nota crítica (<70) é de 2 ou mais registros, dependendo da nota bruta inicial.',
  },
  {
    id: 'guide-4',
    title: 'Processo de contestação',
    icon: Info,
    content:
      'O analista pode contestar uma NC em até 5 dias úteis após a divulgação do ciclo. A contestação deve ser feita diretamente ao coordenador responsável, que avaliará junto ao auditor. Contestações aprovadas resultam na remoção da NC e restauração dos pontos deduzidos.',
  },
];

export default function NonConformitiesGuide() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [expandedGuide, setExpandedGuide] = useState<string | null>('guide-1');
  const [activeTab, setActiveTab] = useState<'registros' | 'guia'>('registros');

  const filteredNCs = NC_RECORDS.filter(
    (nc) =>
      searchTerm === '' ||
      nc.analista.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nc.protocolo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nc.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nc.squad.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ncByType = NC_TYPES.map((t) => ({
    ...t,
    count: NC_RECORDS.filter((nc) => nc.tipo === t.tipo).length,
  }));

  return (
    <div
      className="rounded-xl p-6"
      style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.12)' }}>
            <AlertTriangle size={18} style={{ color: '#EF4444' }} />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-white">Não Conformidades</h3>
            <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
              {NC_RECORDS.length} registros no ciclo ·{' '}
              {NC_RECORDS.reduce((s, nc) => s + nc.pontosDescontados, 0)} pts deduzidos
            </p>
          </div>
        </div>
        {/* Tabs */}
        <div
          className="flex items-center gap-1 p-1 rounded-lg"
          style={{ backgroundColor: '#1C2333', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {(['registros', 'guia'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 text-xs rounded-md transition-all capitalize"
              style={{
                backgroundColor: activeTab === tab ? 'rgba(43,79,129,0.5)' : 'transparent',
                color: activeTab === tab ? '#FFFFFF' : '#8B949E',
                border:
                  activeTab === tab ? '1px solid rgba(43,79,129,0.6)' : '1px solid transparent',
              }}
            >
              {tab === 'registros' ? 'Registros' : 'Guia'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'registros' && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {ncByType.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-xl"
                style={{ backgroundColor: t.bg, border: `1px solid ${t.border}` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <t.icon size={14} style={{ color: t.color }} />
                  <span className="text-xs font-medium text-white">{t.tipo}</span>
                </div>
                <p className="text-2xl font-bold metric-value" style={{ color: t.color }}>
                  {t.count}
                </p>
                <p className="text-xs" style={{ color: '#8B949E' }}>
                  registros · {t.count * 20} pts deduzidos
                </p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: '#8B949E' }}
            />
            <input
              type="text"
              placeholder="Buscar por analista, protocolo, tipo ou squad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-1"
              style={{
                backgroundColor: '#1C2333',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#FFFFFF',
              }}
            />
          </div>

          {/* NC Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {[
                    'Protocolo',
                    'Analista',
                    'Squad',
                    'Tipo',
                    'Pts',
                    'Coordenador',
                    'Data',
                    'Descrição',
                  ].map((h) => (
                    <th
                      key={`nc-th-${h}`}
                      className="text-left py-3 px-3 text-xs font-medium uppercase tracking-wide whitespace-nowrap"
                      style={{ color: '#8B949E' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredNCs.map((nc) => (
                  <tr
                    key={`nc-row-${nc.id}`}
                    className="transition-colors hover:bg-white/5"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <td className="py-3 px-3 font-mono text-xs text-white whitespace-nowrap">
                      {nc.protocolo}
                    </td>
                    <td className="py-3 px-3 font-medium text-white whitespace-nowrap">
                      {nc.analista}
                    </td>
                    <td
                      className="py-3 px-3 text-xs whitespace-nowrap"
                      style={{ color: '#8B949E' }}
                    >
                      {nc.squad}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{
                          backgroundColor:
                            nc.tipo === 'Integridade do Fluxo Operacional'
                              ? 'rgba(239,68,68,0.12)' :'rgba(234,179,8,0.12)',
                          color:
                            nc.tipo === 'Integridade do Fluxo Operacional' ? '#EF4444' : '#EAB308',
                        }}
                      >
                        {nc.tipo === 'Integridade do Fluxo Operacional' ? 'Fluxo' : 'Registro'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="badge-danger text-xs whitespace-nowrap">
                        {nc.pontosDescontados} pts
                      </span>
                    </td>
                    <td
                      className="py-3 px-3 text-xs whitespace-nowrap"
                      style={{ color: '#8B949E' }}
                    >
                      {nc.coordenador}
                    </td>
                    <td
                      className="py-3 px-3 text-xs whitespace-nowrap"
                      style={{ color: '#8B949E' }}
                    >
                      {nc.data}
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <p className="text-xs line-clamp-2" style={{ color: '#8B949E' }}>
                        {nc.descricao}
                      </p>
                    </td>
                  </tr>
                ))}
                {filteredNCs.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-sm"
                      style={{ color: '#8B949E' }}
                    >
                      Nenhum registro encontrado para "{searchTerm}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'guia' && (
        <div className="space-y-4">
          {/* Type cards */}
          <div className="space-y-3 mb-6">
            <p
              className="text-xs font-medium uppercase tracking-wide mb-3"
              style={{ color: '#8B949E' }}
            >
              Tipos de Não Conformidade
            </p>
            {NC_TYPES.map((t) => (
              <div
                key={t.id}
                className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${t.border}` }}
              >
                <button
                  onClick={() => setExpandedType(expandedType === t.id ? null : t.id)}
                  className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-white/5"
                  style={{ backgroundColor: t.bg }}
                >
                  <div className="flex items-center gap-3">
                    <t.icon size={16} style={{ color: t.color }} />
                    <div>
                      <p className="text-sm font-semibold text-white">{t.tipo}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
                        {t.pontos} pts por ocorrência · Refs: {t.referencias.join(', ')}
                      </p>
                    </div>
                  </div>
                  {expandedType === t.id ? (
                    <ChevronUp size={16} style={{ color: '#8B949E' }} />
                  ) : (
                    <ChevronDown size={16} style={{ color: '#8B949E' }} />
                  )}
                </button>
                {expandedType === t.id && (
                  <div
                    className="px-4 pb-4 pt-2"
                    style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                  >
                    <p className="text-sm leading-relaxed mb-3" style={{ color: '#8B949E' }}>
                      {t.descricao}
                    </p>
                    <p className="text-xs font-medium text-white mb-2">
                      Critérios que geram este tipo de NC:
                    </p>
                    <ul className="space-y-1">
                      {t.criterios.map((c, i) => (
                        <li
                          key={`crit-${i}`}
                          className="flex items-start gap-2 text-xs"
                          style={{ color: '#8B949E' }}
                        >
                          <span
                            className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: t.color }}
                          />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* FAQ / Guide sections */}
          <p
            className="text-xs font-medium uppercase tracking-wide mb-3"
            style={{ color: '#8B949E' }}
          >
            Guia de Referência
          </p>
          <div className="space-y-2">
            {GUIDE_SECTIONS.map((section) => (
              <div
                key={section.id}
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <button
                  onClick={() => setExpandedGuide(expandedGuide === section.id ? null : section.id)}
                  className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-white/5"
                  style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="flex items-center gap-3">
                    <section.icon size={15} style={{ color: '#5B8FD4' }} />
                    <p className="text-sm font-medium text-white">{section.title}</p>
                  </div>
                  {expandedGuide === section.id ? (
                    <ChevronUp size={15} style={{ color: '#8B949E' }} />
                  ) : (
                    <ChevronDown size={15} style={{ color: '#8B949E' }} />
                  )}
                </button>
                {expandedGuide === section.id && (
                  <div
                    className="px-4 pb-4 pt-1"
                    style={{ backgroundColor: 'rgba(255,255,255,0.01)' }}
                  >
                    <p className="text-sm leading-relaxed" style={{ color: '#8B949E' }}>
                      {section.content}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
