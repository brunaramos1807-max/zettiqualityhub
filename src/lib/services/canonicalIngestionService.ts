import { AvaliacaoIngestaoSchema, AvaliacaoIngestaoInput, LoteIngestaoInput } from '../domain/canonicalSchemas';
import { AvaliacaoOficial, EventoNaoConformidade, IngestaoLote } from '../domain/types';
import { determinarCicloPorData } from '../domain/cycleGovernance';

/**
 * Serviço Canônico de Ingestão do QualiVisão
 * Converte payloads heterogêneos para o modelo canônico e valida com Zod
 */

export interface IngestaoResult {
  loteId: string;
  sucesso: boolean;
  totalRecebido: number;
  totalAceito: number;
  totalRejeitado: number;
  erros: string[];
  avaliacoesValidadas: AvaliacaoOficial[];
  naoConformidadesValidadas: EventoNaoConformidade[];
}

/**
 * Processa e valida um array de objetos brutos de avaliação.
 */
export async function processarLoteIngestao(
  origem: string,
  registrosBrutos: unknown[],
  organizacaoId: string = 'default'
): Promise<IngestaoResult> {
  const loteId = `lote_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const avaliacoesValidadas: AvaliacaoOficial[] = [];
  const naoConformidadesValidadas: EventoNaoConformidade[] = [];
  const erros: string[] = [];

  let totalRecebido = registrosBrutos.length;
  let totalAceito = 0;
  let totalRejeitado = 0;

  for (let i = 0; i < registrosBrutos.length; i++) {
    const raw = registrosBrutos[i];
    const parseResult = AvaliacaoIngestaoSchema.safeParse(raw);

    if (!parseResult.success) {
      totalRejeitado++;
      const msg = `Linha ${i + 1}: ${parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
      erros.push(msg);
      continue;
    }

    const data: AvaliacaoIngestaoInput = parseResult.data;
    const avaliacaoId = `av_${loteId}_${i + 1}`;
    const cicloDeterminado = data.periodo || determinarCicloPorData(data.data_registro || new Date());

    const avaliacaoOficial: AvaliacaoOficial = {
      id: avaliacaoId,
      organizacao_id: organizacaoId,
      ciclo_id: cicloDeterminado,
      periodo: cicloDeterminado,
      equipe_id: data.equipe_nome.toLowerCase().replace(/\s+/g, '_'),
      equipe_nome: data.equipe_nome,
      analista_identificador: data.analista_identificador,
      analista_nome: data.analista_nome,
      coordenador_nome: data.coordenador_nome || undefined,
      auditor_nome: data.auditor_nome || undefined,
      nota_final_qa: data.nota_final_qa,
      indice_iepc: data.indice_iepc,
      total_ncs: data.total_ncs,
      pontos_deduzidos_nc: data.pontos_deduzidos_nc,
      qtd_atendimentos_auditados: data.qtd_atendimentos_auditados,
      data_registro: data.data_registro || undefined,
      hash_registro: data.hash_registro || undefined,
    };

    avaliacoesValidadas.push(avaliacaoOficial);

    // Processar Não Conformidades vinculadas
    if (data.nao_conformidades && data.nao_conformidades.length > 0) {
      for (const nc of data.nao_conformidades) {
        naoConformidadesValidadas.push({
          id: `nc_${avaliacaoId}_${naoConformidadesValidadas.length + 1}`,
          avaliacao_id: avaliacaoId,
          ciclo_id: cicloDeterminado,
          periodo: cicloDeterminado,
          equipe_nome: data.equipe_nome,
          analista_nome: data.analista_nome,
          coordenador_nome: data.coordenador_nome || undefined,
          auditor_nome: data.auditor_nome || undefined,
          tipo_nc: nc.tipo_nc,
          pontos_deduzidos: nc.pontos_deduzidos,
          protocolo_referencia: nc.protocolo_referencia || undefined,
          data_registro: nc.data_registro,
          evidencia_resumo: nc.evidencia_resumo || undefined,
          justificativa: nc.justificativa || undefined,
          impacto: nc.impacto || undefined,
        });
      }
    }

    totalAceito++;
  }

  return {
    loteId,
    sucesso: totalAceito > 0,
    totalRecebido,
    totalAceito,
    totalRejeitado,
    erros,
    avaliacoesValidadas,
    naoConformidadesValidadas,
  };
}
