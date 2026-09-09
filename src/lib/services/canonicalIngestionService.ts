import { AvaliacaoIngestaoSchema, AvaliacaoIngestaoInput } from '../domain/canonicalSchemas';
import { AvaliacaoOficial, EventoNaoConformidade } from '../domain/types';
import {
  extrairPeriodoMesAno,
  normalizarIdentificadorCiclo,
  isCicloHomologado,
  validarDataNoIntervaloCiclo,
} from '../domain/cycleGovernance';
import { createClient } from '@/lib/supabase/client';
import { fetchCicloPorPeriodo } from './qualityDataService';

/**
 * Serviço Canônico de Ingestão do QualiVisão
 * Validação Zod estrita + Idempotência + Checagem de Intervalo do Ciclo + Persistência em Lote
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

export interface IngestaoPersistidaResult extends IngestaoResult {
  scoresInseridos: number;
  ncsInseridos: number;
  mensagem: string;
}

/**
 * Pré-validação canônica em memória para exibição em modal ou preview
 */
export async function processarLoteIngestao(
  origem: string,
  registrosBrutos: unknown[]
): Promise<{ totalRecebido: number; totalAceito: number; totalRejeitado: number; erros: string[] }> {
  let totalAceito = 0;
  let totalRejeitado = 0;
  const erros: string[] = [];

  for (let i = 0; i < registrosBrutos.length; i++) {
    const raw = registrosBrutos[i];
    const parseResult = AvaliacaoIngestaoSchema.safeParse(raw);
    if (!parseResult.success) {
      totalRejeitado++;
      erros.push(`Linha ${i + 1}: ${parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    } else {
      totalAceito++;
    }
  }

  return { totalRecebido: registrosBrutos.length, totalAceito, totalRejeitado, erros };
}

/**
 * Executa a validação e persistência unificada de um lote de ingestão.
 * Garante idempotência total: reimportações do mesmo ciclo atualizam sem duplicar.
 */
export async function executarIngestaoCanonicaLote(
  origem: string,
  periodoAlvo: string,
  registrosBrutos: unknown[],
  fileName: string = 'lote_ingestao.xlsx'
): Promise<IngestaoPersistidaResult> {
  const loteId = `lote_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const mesAno = extrairPeriodoMesAno(periodoAlvo);
  const identificacaoCiclo = normalizarIdentificadorCiclo(mesAno);

  const supabase = createClient();
  if (!supabase) {
    throw new Error('Supabase client indisponível.');
  }

  // 1. Validar status do ciclo no banco
  const cicloExistente = await fetchCicloPorPeriodo(mesAno);
  if (cicloExistente && isCicloHomologado(cicloExistente)) {
    return {
      loteId,
      sucesso: false,
      totalRecebido: registrosBrutos.length,
      totalAceito: 0,
      totalRejeitado: registrosBrutos.length,
      erros: [
        `O ${identificacaoCiclo} está HOMOLOGADO e não aceita novos dados. Reabra o ciclo na governança antes de importar.`,
      ],
      avaliacoesValidadas: [],
      naoConformidadesValidadas: [],
      scoresInseridos: 0,
      ncsInseridos: 0,
      mensagem: `Importação bloqueada: ${identificacaoCiclo} homologado.`,
    };
  }

  const dataInicioCiclo = cicloExistente?.data_inicio;
  const dataFimCiclo = cicloExistente?.data_fim;

  const avaliacoesValidadas: AvaliacaoOficial[] = [];
  const naoConformidadesValidadas: EventoNaoConformidade[] = [];
  const erros: string[] = [];

  const totalRecebido = registrosBrutos.length;
  let totalAceito = 0;
  let totalRejeitado = 0;

  // 2. Validação canônica linha a linha
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

    // 3. Validação do intervalo de datas do ciclo (se datas cadastradas)
    if (data.data_registro && dataInicioCiclo && dataFimCiclo) {
      const dataCheck = validarDataNoIntervaloCiclo(
        data.data_registro,
        dataInicioCiclo,
        dataFimCiclo
      );
      if (!dataCheck.valido) {
        totalRejeitado++;
        erros.push(`Linha ${i + 1} (${data.analista_nome}): ${dataCheck.mensagem}`);
        continue;
      }
    }

    const avaliacaoId = `av_${loteId}_${i + 1}`;

    const avaliacaoOficial: AvaliacaoOficial = {
      id: avaliacaoId,
      ciclo_id: mesAno,
      periodo: mesAno,
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
        // Validação da data da NC no ciclo
        if (nc.data_registro && dataInicioCiclo && dataFimCiclo) {
          const ncDateCheck = validarDataNoIntervaloCiclo(
            nc.data_registro,
            dataInicioCiclo,
            dataFimCiclo
          );
          if (!ncDateCheck.valido) {
            erros.push(`NC de ${data.analista_nome}: ${ncDateCheck.mensagem}`);
            continue;
          }
        }

        naoConformidadesValidadas.push({
          id: `nc_${avaliacaoId}_${naoConformidadesValidadas.length + 1}`,
          avaliacao_id: avaliacaoId,
          ciclo_id: mesAno,
          periodo: mesAno,
          equipe_nome: data.equipe_nome,
          analista_nome: data.analista_nome,
          coordenador_nome: data.coordenador_nome || undefined,
          auditor_nome: data.auditor_nome || undefined,
          tipo_nc: nc.tipo_nc,
          pontos_deduzidos: nc.pontos_deduzidos,
          protocolo_referencia: nc.protocolo_referencia || undefined,
          data_registro: nc.data_registro || new Date().toISOString().split('T')[0],
          evidencia_resumo: nc.evidencia_resumo || undefined,
          justificativa: nc.justificativa || undefined,
          impacto: nc.impacto || undefined,
        });
      }
    }

    totalAceito++;
  }

  // 4. Se nenhum registro foi aceito, retornar erro
  if (totalAceito === 0) {
    return {
      loteId,
      sucesso: false,
      totalRecebido,
      totalAceito: 0,
      totalRejeitado,
      erros,
      avaliacoesValidadas: [],
      naoConformidadesValidadas: [],
      scoresInseridos: 0,
      ncsInseridos: 0,
      mensagem: `Nenhum registro válido aceito para o ${identificacaoCiclo}.`,
    };
  }

  // 5. Persistência Idempotente no Supabase
  let cycleId = cicloExistente?.id;
  if (!cycleId) {
    const { data: novoCiclo } = await supabase
      .from('import_cycles')
      .upsert(
        {
          periodo: mesAno,
          identificacao: identificacaoCiclo,
          data_inicio: dataInicioCiclo || null,
          data_fim: dataFimCiclo || null,
          file_name: fileName,
          status: 'em_apuracao',
          is_closed: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'periodo' }
      )
      .select('id')
      .single();
    cycleId = novoCiclo?.id;
  }

  // Upsert dos Scores com conflito em (periodo, analista, squad) -> idempotência garantida
  const scoresPayload = avaliacoesValidadas.map((s) => ({
    cycle_id: cycleId,
    periodo: mesAno,
    data_registro: s.data_registro || null,
    analista: s.analista_nome,
    squad: s.equipe_nome,
    coordenador: s.coordenador_nome || null,
    auditor: s.auditor_nome || null,
    nota_final_qa: s.nota_final_qa,
    iepc_total: s.indice_iepc,
    total_ncs: s.total_ncs,
    pontos_deduzidos_nc: s.pontos_deduzidos_nc,
    qtd_atendimentos_avaliados: s.qtd_atendimentos_auditados,
    p1: s.p1 || 0,
    p2: s.p2 || 0,
    p3: s.p3 || 0,
    p4: s.p4 || 0,
    p5: s.p5 || 0,
    e1: s.e1 || 0,
    e2: s.e2 || 0,
    e3: s.e3 || 0,
    e4: s.e4 || 0,
    e5: s.e5 || 0,
    source: 'canonical_batch_import',
  }));

  const { error: scoresError } = await supabase
    .from('cycle_scores')
    .upsert(scoresPayload, { onConflict: 'periodo,analista,squad' });

  if (scoresError) {
    throw new Error(`Falha ao persistir scores no banco: ${scoresError.message}`);
  }

  // Persistência de Não Conformidades (idempotência: limpa NCs anteriores daquele ciclo para este lote ou insere)
  if (naoConformidadesValidadas.length > 0) {
    // Para manter idempotência das NCs neste ciclo sem duplicar em reimportação completa:
    await supabase.from('nc_records').delete().eq('periodo', mesAno);

    const ncsPayload = naoConformidadesValidadas.map((nc) => ({
      cycle_id: cycleId,
      periodo: mesAno,
      data_registro: nc.data_registro,
      analista: nc.analista_nome,
      squad: nc.equipe_nome,
      coordenador: nc.coordenador_nome || null,
      auditor: nc.auditor_nome || null,
      tipo_nc: nc.tipo_nc,
      pontos_deduzidos: nc.pontos_deduzidos,
      protocolo_referencia: nc.protocolo_referencia || null,
      descricao: nc.evidencia_resumo || nc.justificativa || null,
      source: 'canonical_batch_import',
    }));

    await supabase.from('nc_records').insert(ncsPayload);
  }

  // Registrar auditoria do lote em import_logs
  await supabase.from('import_logs').insert({
    periodo: mesAno,
    file_name: fileName,
    step: 'canonical_batch_completed',
    level: erros.length > 0 ? 'warn' : 'success',
    message: `Lote ${loteId}: ${totalAceito} avaliações aceitas, ${totalRejeitado} rejeitadas`,
    details: {
      loteId,
      totalRecebido,
      totalAceito,
      totalRejeitado,
      totalNCs: naoConformidadesValidadas.length,
      erros: erros.slice(0, 10),
    },
    rows_affected: totalAceito,
  });

  // Atualizar record_count no ciclo
  await supabase
    .from('import_cycles')
    .update({
      record_count: totalAceito,
      file_name: fileName,
      updated_at: new Date().toISOString(),
    })
    .eq('periodo', mesAno);

  return {
    loteId,
    sucesso: true,
    totalRecebido,
    totalAceito,
    totalRejeitado,
    erros,
    avaliacoesValidadas,
    naoConformidadesValidadas,
    scoresInseridos: totalAceito,
    ncsInseridos: naoConformidadesValidadas.length,
    mensagem: `Lote processado com sucesso: ${totalAceito} avaliações e ${naoConformidadesValidadas.length} NCs registradas no ${identificacaoCiclo}.`,
  };
}
