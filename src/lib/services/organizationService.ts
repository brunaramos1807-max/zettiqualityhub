import { createClient } from '@/lib/supabase/client';
import { Organizacao, Operacao, Area, Equipe } from '../domain/types';

function getSupabase() {
  return createClient();
}

export const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Carrega a organização ativa
 */
export async function fetchOrganizacaoAtiva(
  orgId: string = DEFAULT_ORG_ID
): Promise<Organizacao | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('organizacoes')
      .select('*')
      .eq('id', orgId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      nome: data.nome,
      slug: data.slug,
      cnpj: data.cnpj,
      created_at: data.created_at,
    };
  } catch {
    return null;
  }
}

/**
 * Carrega a hierarquia completa de uma organização:
 * Organização -> Operações -> Áreas -> Equipes
 */
export async function fetchHierarquiaOrganizacional(orgId: string = DEFAULT_ORG_ID): Promise<{
  organizacao: Organizacao | null;
  operacoes: Operacao[];
  areas: Area[];
  equipes: Equipe[];
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { organizacao: null, operacoes: [], areas: [], equipes: [] };
  }

  try {
    const [orgRes, opRes, areaRes, eqRes] = await Promise.all([
      supabase.from('organizacoes').select('*').eq('id', orgId).maybeSingle(),
      supabase.from('operacoes').select('*').eq('organizacao_id', orgId),
      supabase.from('areas').select('*'),
      supabase.from('equipes').select('*'),
    ]);

    const organizacao = orgRes.data
      ? {
          id: orgRes.data.id,
          nome: orgRes.data.nome,
          slug: orgRes.data.slug,
          cnpj: orgRes.data.cnpj,
        }
      : null;

    const operacoes: Operacao[] = (opRes.data || []).map((o: any) => ({
      id: o.id,
      organizacao_id: o.organizacao_id,
      nome: o.nome,
      descricao: o.descricao,
      is_active: o.is_active ?? true,
    }));

    const areas: Area[] = (areaRes.data || []).map((a: any) => ({
      id: a.id,
      operacao_id: a.operacao_id,
      nome: a.nome,
      is_active: a.is_active ?? true,
    }));

    const equipes: Equipe[] = (eqRes.data || []).map((e: any) => ({
      id: e.id,
      area_id: e.area_id,
      nome: e.nome,
      coordenador_nome: e.coordenador_nome,
      is_active: e.is_active ?? true,
    }));

    return { organizacao, operacoes, areas, equipes };
  } catch (err) {
    console.error('Erro ao carregar hierarquia multi-tenant:', err);
    return { organizacao: null, operacoes: [], areas: [], equipes: [] };
  }
}
