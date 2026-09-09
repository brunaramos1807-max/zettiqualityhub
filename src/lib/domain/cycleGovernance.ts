import { Ciclo, CicloStatus } from './types';

/**
 * Governança de Ciclos do QualiVisão
 *
 * Regra:
 * - Ciclos são identificados estritamente por mês e ano (ex: "Ciclo 09/2026" ou "09/2026").
 * - NÃO há regra fixa de período (26 -> 25).
 * - A data de início e a data final são informadas MANUALMENTE no cadastro do ciclo.
 * - Todos os filtros, validações de importação e cálculos utilizam as datas cadastradas no ciclo.
 * - Ciclos homologados (status = 'fechado_homologado') são bloqueados contra alteração de datas e dados.
 */

/**
 * Normaliza o identificador do ciclo.
 * Ex: "09/2026" -> "Ciclo 09/2026", "Ciclo 09/2026" -> "Ciclo 09/2026".
 */
export function normalizarIdentificadorCiclo(periodoOuNome: string): string {
  if (!periodoOuNome) return '';
  const trimmed = periodoOuNome.trim();
  const match = trimmed.match(/(?:Ciclo\s+)?(\d{2}\/\d{4})/i);
  if (match) {
    return `Ciclo ${match[1]}`;
  }
  return trimmed;
}

/**
 * Extrai o mês e ano canônico "MM/AAAA".
 */
export function extrairPeriodoMesAno(identificador: string): string {
  if (!identificador) return '';
  const match = identificador.match(/(\d{2}\/\d{4})/);
  return match ? match[1] : identificador.trim();
}

/**
 * Valida se uma data de registro está dentro do intervalo manual cadastrado no ciclo.
 */
export function validarDataNoIntervaloCiclo(
  dataRegistro: Date | string,
  dataInicio: string,
  dataFim: string
): { valido: boolean; mensagem?: string } {
  if (!dataInicio || !dataFim) {
    return { valido: true }; // Sem restrição de data cadastrada
  }

  const d = typeof dataRegistro === 'string' ? new Date(dataRegistro) : dataRegistro;
  if (isNaN(d.getTime())) {
    return { valido: false, mensagem: 'Data de registro inválida.' };
  }

  // Normaliza para comparação de datas sem fuso horário
  const dStr = d.toISOString().split('T')[0];
  const inicio = dataInicio.split('T')[0];
  const fim = dataFim.split('T')[0];

  if (dStr < inicio || dStr > fim) {
    return {
      valido: false,
      mensagem: `A data do registro (${dStr}) está fora do intervalo cadastrado para este ciclo (${inicio} até ${fim}).`,
    };
  }

  return { valido: true };
}

/**
 * Verifica se um ciclo permite modificações, edições de datas ou novas importações.
 * Ciclos com status 'fechado_homologado' são IMUTÁVEIS.
 */
export function isCicloHomologado(ciclo: Pick<Ciclo, 'status' | 'is_closed'>): boolean {
  return ciclo.status === 'fechado_homologado' || ciclo.is_closed === true;
}

/**
 * Valida se um ciclo pode receber dados ou sofrer edições.
 */
export function podeModificarCiclo(ciclo: Pick<Ciclo, 'status' | 'is_closed'>): boolean {
  return !isCicloHomologado(ciclo);
}

/**
 * Validação de transição formal dos estados de ciclo:
 * aberto -> em_apuracao -> em_validacao -> fechado_homologado
 */
export function validarTransicaoCiclo(atual: CicloStatus, proximo: CicloStatus): boolean {
  if (atual === proximo) return true;

  const transicoesPermitidas: Record<CicloStatus, CicloStatus[]> = {
    aberto: ['em_apuracao'],
    em_apuracao: ['em_validacao', 'aberto'],
    em_validacao: ['fechado_homologado', 'em_apuracao'],
    fechado_homologado: [], // Bloqueado: ciclo homologado não aceita transição comum
  };

  return transicoesPermitidas[atual]?.includes(proximo) ?? false;
}
