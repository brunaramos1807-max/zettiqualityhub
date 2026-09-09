import { createClient } from '@/lib/supabase/client';
import { Organizacao, Operacao, Area, Equipe } from '../domain/types';

function getSupabase() {
  return createClient();
}

/**
 * Obtém o ID da organização do usuário autenticado a partir do token ou metadados da sessão.
 */
export async function getOrganizacaoIdDoUsuario(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Organização definida nos app_metadata ou user_metadata
    const orgId =
      user.app_metadata?.organizacao_id ||
      user.user_metadata?.organizacao_id ||
      user.user_metadata?.org_id;

    if (orgId) return orgId;

    // Caso não esteja nos metadados, busca na primeira organização vinculada ao usuário
    const { data: membro } = await supabase
      .from('organizacao_membros')
      .select('organizacao_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    return membro?.organizacao_id || null;
  } catch {
    return null;
  }
}

/**
 * Carrega a organização autorizada pelo escopo do usuário ou ID explícito
 */
export async function fetchOrganizacaoAtiva(orgId?: string): Promise<Organizacao | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const targetOrgId = orgId || (await getOrganizacaoIdDoUsuario());
  if (!targetOrgId) return null;

  try {
    const { data, error } = await supabase
      .from('organizacoes')
      .select('id, nome, slug, cnpj, created_at')
      .eq('id', targetOrgId)
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
 * Carrega a hierarquia estritamente isolada de uma organização:
 * Organização -> Operações (filtradas por orgId) -> Áreas (filtradas por operacao_id) -> Equipes (filtradas por area_id)
 * Zero vazamento de dados entre tenants.
 */
export async function fetchHierarquiaOrganizacional(orgId?: string): Promise<{
  organizacao: Organizacao | null;
  operacoes: Operacao[];
  areas: Area[];
  equipes: Equipe[];
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { organizacao: null, operacoes: [], areas: [], equipes: [] };
  }

  const targetOrgId = orgId || (await getOrganizacaoIdDoUsuario());
  if (!targetOrgId) {
    return { organizacao: null, operacoes: [], areas: [], equipes: [] };
  }

  try {
    // 1. Carregar Organização autorizada
    const { data: orgData } = await supabase
      .from('organizacoes')
      .select('id, nome, slug, cnpj')
      .eq('id', targetOrgId)
      .maybeSingle();

    if (!orgData) {
      return { organizacao: null, operacoes: [], areas: [], equipes: [] };
    }

    const organizacao: Organizacao = {
      id: orgData.id,
      nome: orgData.nome,
      slug: orgData.slug,
      cnpj: orgData.cnpj,
    };

    // 2. Carregar Operações filtradas estritamente pela Organização
    const { data: opsData } = await supabase
      .from('operacoes')
      .select('id, organizacao_id, nome, descricao, is_active')
      .eq('organizacao_id', targetOrgId);

    const operacoes: Operacao[] = (opsData || []).map((o: any) => ({
      id: o.id,
      organizacao_id: o.organizacao_id,
      nome: o.nome,
      descricao: o.descricao,
      is_active: o.is_active ?? true,
    }));

    if (operacoes.length === 0) {
      return { organizacao, operacoes: [], areas: [], equipes: [] };
    }

    const opIds = operacoes.map((o) => o.id);

    // 3. Carregar Áreas filtradas estritamente pelas Operações autorizadas da Organização
    const { data: areasData } = await supabase
      .from('areas')
      .select('id, operacao_id, nome, is_active')
      .in('operacao_id', opIds);

    const areas: Area[] = (areasData || []).map((a: any) => ({
      id: a.id,
      operacao_id: a.operacao_id,
      nome: a.nome,
      is_active: a.is_active ?? true,
    }));

    if (areas.length === 0) {
      return { organizacao, operacoes, areas: [], equipes: [] };
    }

    const areaIds = areas.map((a) => a.id);

    // 4. Carregar Equipes filtradas estritamente pelas Áreas autorizadas
    const { data: equipesData } = await supabase
      .from('equipes')
      .select('id, area_id, nome, coordenador_nome, is_active')
      .in('area_id', areaIds);

    const equipes: Equipe[] = (equipesData || []).map((e: any) => ({
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
