import { Ciclo, CicloStatus } from './types';

/**
 * Governança de Ciclos Temporais do QualiVisão
 * Regra: Dia 26 do mês anterior ao dia 25 do mês atual
 */

/**
 * Determina deterministicamente o ciclo a partir de uma data de atendimento/registro.
 * Se dia >= 26 -> Ciclo do mês seguinte (MM/YYYY)
 * Se dia <= 25 -> Ciclo do mês atual (MM/YYYY)
 */
export function determinarCicloPorData(data: Date | string): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  if (isNaN(d.getTime())) return '08/2026'; // fallback seguro se data inválida

  const dia = d.getDate();
  let mes = d.getMonth() + 1; // 1-12
  let ano = d.getFullYear();

  if (dia >= 26) {
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }

  const mesFormatado = mes.toString().padStart(2, '0');
  return `${mesFormatado}/${ano}`;
}

/**
 * Calcula os limites de datas (início e fim) de um período no formato MM/YYYY.
 * Ex: "08/2026" -> Início: 26/07/2026, Fim: 25/08/2026
 */
export function calcularLimitesCiclo(periodo: string): { dataInicio: string; dataFim: string } {
  const match = periodo.trim().match(/^(\d{2})\/(\d{4})$/);
  if (!match) {
    return { dataInicio: '2026-07-26', dataFim: '2026-08-25' };
  }

  const mes = parseInt(match[1], 10);
  const ano = parseInt(match[2], 10);

  let mesAnterior = mes - 1;
  let anoAnterior = ano;
  if (mesAnterior === 0) {
    mesAnterior = 12;
    anoAnterior = ano - 1;
  }

  const dataInicio = `${anoAnterior}-${mesAnterior.toString().padStart(2, '0')}-26`;
  const dataFim = `${ano}-${mes.toString().padStart(2, '0')}-25`;

  return { dataInicio, dataFim };
}

/**
 * Verifica se um ciclo permite modificações ou inserção de dados.
 * Apenas ciclos que NÃO estejam em 'fechado_homologado' podem receber novos dados.
 */
export function isCicloEditavel(ciclo: Ciclo): boolean {
  return ciclo.status !== 'fechado_homologado';
}

/**
 * Valida a transição de estado de um ciclo.
 */
export function validarTransicaoCiclo(atual: CicloStatus, proximo: CicloStatus): boolean {
  const transicoesPermitidas: Record<CicloStatus, CicloStatus[]> = {
    aberto: ['em_apuracao'],
    em_apuracao: ['em_validacao', 'aberto'],
    em_validacao: ['fechado_homologado', 'em_apuracao'],
    fechado_homologado: ['em_validacao'], // Reabertura somente por auditoria autorizada
  };

  return transicoesPermitidas[atual]?.includes(proximo) ?? false;
}
