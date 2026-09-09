import { z } from 'zod';

/**
 * Schemas Zod Canônicos para Ingestão e Validação de Dados no QualiVisão
 */

// Helper para converter valores numéricos em formatos variados (string com vírgula ou ponto, number)
const numericCoerce = z.union([z.number(), z.string()]).transform((val) => {
  if (typeof val === 'number') return val;
  const sanitized = val.trim().replace(',', '.');
  const parsed = parseFloat(sanitized);
  return isNaN(parsed) ? 0 : parsed;
});

export const SubcriterioQASchema = z.object({
  pilar_codigo: z.string().min(1),
  subpilar_codigo: z.string().min(1),
  subpilar_nome: z.string().default(''),
  pontos_obtidos: numericCoerce,
  pontos_maximos: numericCoerce,
  classificacao: z.enum(['pontuou', 'parcial', 'nao_pontuou']).optional(),
});

export const DimensaoIEPCSchema = z.object({
  dimensao_codigo: z.string().min(1),
  dimensao_nome: z.string().default(''),
  pontos_obtidos: numericCoerce,
  pontos_maximos: numericCoerce,
});

export const EventoNCSchema = z.object({
  tipo_nc: z.string().min(2),
  pontos_deduzidos: numericCoerce.default(20),
  protocolo_referencia: z.string().optional().nullable(),
  data_registro: z.string().default(() => new Date().toISOString()),
  evidencia_resumo: z.string().optional().nullable(),
  justificativa: z.string().optional().nullable(),
  impacto: z.string().optional().nullable(),
});

export const AvaliacaoIngestaoSchema = z.object({
  periodo: z.string().regex(/^(\d{2}\/\d{4}|\d{4}-\d{2})$/, 'Período deve estar no formato MM/YYYY ou YYYY-MM'),
  equipe_nome: z.string().min(1, 'Nome da equipe é obrigatório'),
  analista_identificador: z.string().min(1, 'Identificador da pessoa é obrigatório'),
  analista_nome: z.string().min(1, 'Nome da pessoa avaliada é obrigatório'),
  coordenador_nome: z.string().optional().nullable(),
  auditor_nome: z.string().optional().nullable(),
  
  // Notas oficiais
  nota_final_qa: numericCoerce,
  indice_iepc: numericCoerce,
  total_ncs: numericCoerce.default(0),
  pontos_deduzidos_nc: numericCoerce.default(0),
  qtd_atendimentos_auditados: numericCoerce.default(1),
  data_registro: z.string().optional().nullable(),
  hash_registro: z.string().optional().nullable(),

  // Detalhamento opcional
  subcriterios_qa: z.array(SubcriterioQASchema).optional().default([]),
  dimensoes_iepc: z.array(DimensaoIEPCSchema).optional().default([]),
  nao_conformidades: z.array(EventoNCSchema).optional().default([]),
});

export const LoteIngestaoSchema = z.object({
  origem: z.string().min(1),
  versao_schema: z.string().default('v1.0'),
  avaliacoes: z.array(AvaliacaoIngestaoSchema).min(1, 'O lote deve conter pelo menos uma avaliação'),
});

export type AvaliacaoIngestaoInput = z.infer<typeof AvaliacaoIngestaoSchema>;
export type LoteIngestaoInput = z.infer<typeof LoteIngestaoSchema>;
