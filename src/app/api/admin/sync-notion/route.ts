import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side only — Notion token never exposed to frontend
const NOTION_TOKEN = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const NOTION_VERSION = '2022-06-28';

async function notionFetch(endpoint: string, body?: object) {
  const res = await fetch(`https://api.notion.com/v1${endpoint}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion API error ${res.status}: ${err}`);
  }
  return res.json();
}

function extractText(prop: any): string {
  if (!prop) return '';
  if (prop.type === 'title') return prop.title?.map((t: any) => t.plain_text).join('') || '';
  if (prop.type === 'rich_text') return prop.rich_text?.map((t: any) => t.plain_text).join('') || '';
  if (prop.type === 'select') return prop.select?.name || '';
  if (prop.type === 'multi_select') return prop.multi_select?.map((s: any) => s.name).join(', ') || '';
  if (prop.type === 'number') return prop.number?.toString() || '';
  if (prop.type === 'checkbox') return prop.checkbox ? 'true' : 'false';
  return '';
}

async function syncDatabase(
  supabase: ReturnType<typeof createClient>,
  sourceId: string,
  notionDbId: string,
  tableName: string,
  mapper: (page: any) => Record<string, any>
) {
  let cursor: string | undefined;
  let totalSynced = 0;
  const errors: string[] = [];

  try {
    await supabase.from('knowledge_sources').update({
      sync_status: 'syncing',
      error_message: null,
      updated_at: new Date().toISOString(),
    }).eq('id', sourceId);

    do {
      const body: any = { page_size: 100 };
      if (cursor) body.start_cursor = cursor;

      let result = await notionFetch(`/databases/${notionDbId}/query`, body);
      const pages = result.results || [];

      for (const page of pages) {
        try {
          const record = mapper(page);
          const { error } = await supabase.from(tableName).upsert(record, {
            onConflict: 'notion_page_id',
          });
          if (error) errors.push(error.message);
          else totalSynced++;
        } catch (e: any) {
          errors.push(e.message);
        }
      }

      cursor = result.has_more ? result.next_cursor : undefined;
    } while (cursor);

    await supabase.from('knowledge_sources').update({
      sync_status: errors.length > 0 ? 'partial' : 'success',
      last_sync_at: new Date().toISOString(),
      records_synced: totalSynced,
      error_message: errors.length > 0 ? errors.slice(0, 3).join('; ') : null,
      updated_at: new Date().toISOString(),
    }).eq('id', sourceId);

    return { synced: totalSynced, errors };
  } catch (e: any) {
    await supabase.from('knowledge_sources').update({
      sync_status: 'error',
      error_message: e.message,
      updated_at: new Date().toISOString(),
    }).eq('id', sourceId);
    throw e;
  }
}

export async function POST(req: NextRequest) {
  // Validate admin token
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Verify user is admin via Supabase auth
  if (token) {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Check admin permission
    const { data: perm } = await supabase
      .from('user_permissions')
      .select('can_admin')
      .eq('user_profile_id', user.id)
      .maybeSingle();
    if (!perm?.can_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
  }

  if (!NOTION_TOKEN) {
    return NextResponse.json({ error: 'NOTION_API_KEY not configured. Add it to your environment variables.' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const { source_id, database_id, source_type } = body;

  if (!source_id || !database_id || !source_type) {
    return NextResponse.json({ error: 'source_id, database_id, and source_type are required' }, { status: 400 });
  }

  try {
    let result;

    if (source_type === 'qa_criteria') {
      result = await syncDatabase(supabase, source_id, database_id, 'knowledge_qa_criteria', (page) => ({
        notion_page_id: page.id,
        codigo: extractText(page.properties['Código'] || page.properties['codigo']),
        nome: extractText(page.properties['Nome'] || page.properties['nome'] || page.properties['Name']),
        pilar: extractText(page.properties['Pilar'] || page.properties['pilar']),
        peso: parseFloat(extractText(page.properties['Peso'] || page.properties['peso'])) || null,
        objetivo: extractText(page.properties['Objetivo'] || page.properties['objetivo']),
        o_que_avalia: extractText(page.properties['O que avalia'] || page.properties['o_que_avalia']),
        como_avaliar: extractText(page.properties['Como avaliar'] || page.properties['como_avaliar']),
        impactos_operacao: extractText(page.properties['Impactos na Operação'] || page.properties['impactos_operacao']),
        indicadores_relacionados: extractText(page.properties['Indicadores Relacionados'] || page.properties['indicadores_relacionados']),
        ncs_relacionadas: extractText(page.properties['NCs Relacionadas'] || page.properties['ncs_relacionadas']),
        nivel_impacto: extractText(page.properties['Nível de Impacto'] || page.properties['nivel_impacto']),
        possiveis_causas: extractText(page.properties['Possíveis Causas'] || page.properties['possiveis_causas']),
        possiveis_decisoes: extractText(page.properties['Possíveis Decisões'] || page.properties['possiveis_decisoes']),
        treinamentos: extractText(page.properties['Treinamentos'] || page.properties['treinamentos']),
        riscos: extractText(page.properties['Riscos'] || page.properties['riscos']),
        sinais_alerta: extractText(page.properties['Sinais de Alerta'] || page.properties['sinais_alerta']),
        ativo: true,
        updated_from_notion_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    } else if (source_type === 'iepc_dimensions') {
      result = await syncDatabase(supabase, source_id, database_id, 'knowledge_iepc_dimensions', (page) => ({
        notion_page_id: page.id,
        codigo: extractText(page.properties['Código'] || page.properties['codigo']),
        nome: extractText(page.properties['Nome'] || page.properties['nome'] || page.properties['Name']),
        objetivo: extractText(page.properties['Objetivo'] || page.properties['objetivo']),
        o_que_mede: extractText(page.properties['O que mede'] || page.properties['o_que_mede']),
        indicadores_relacionados: extractText(page.properties['Indicadores Relacionados'] || page.properties['indicadores_relacionados']),
        nivel_impacto: extractText(page.properties['Nível de Impacto'] || page.properties['nivel_impacto']),
        possiveis_decisoes: extractText(page.properties['Possíveis Decisões'] || page.properties['possiveis_decisoes']),
        treinamentos: extractText(page.properties['Treinamentos'] || page.properties['treinamentos']),
        sinais_alerta: extractText(page.properties['Sinais de Alerta'] || page.properties['sinais_alerta']),
        ativo: true,
        updated_from_notion_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    } else if (source_type === 'nc_types') {
      result = await syncDatabase(supabase, source_id, database_id, 'knowledge_nc_types', (page) => ({
        notion_page_id: page.id,
        codigo: extractText(page.properties['Código'] || page.properties['codigo']),
        nome: extractText(page.properties['Nome'] || page.properties['nome'] || page.properties['Name']),
        descricao: extractText(page.properties['Descrição'] || page.properties['descricao']),
        exemplos: extractText(page.properties['Exemplos'] || page.properties['exemplos']),
        impactos_operacao: extractText(page.properties['Impactos na Operação'] || page.properties['impactos_operacao']),
        indicadores_relacionados: extractText(page.properties['Indicadores Relacionados'] || page.properties['indicadores_relacionados']),
        nivel_impacto: extractText(page.properties['Nível de Impacto'] || page.properties['nivel_impacto']),
        riscos: extractText(page.properties['Riscos'] || page.properties['riscos']),
        sinais_alerta: extractText(page.properties['Sinais de Alerta'] || page.properties['sinais_alerta']),
        ativo: true,
        updated_from_notion_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    } else if (source_type === 'training') {
      result = await syncDatabase(supabase, source_id, database_id, 'knowledge_training_recommendations', (page) => ({
        notion_page_id: page.id,
        titulo: extractText(page.properties['Título'] || page.properties['titulo'] || page.properties['Name']),
        descricao: extractText(page.properties['Descrição'] || page.properties['descricao']),
        tipo: extractText(page.properties['Tipo'] || page.properties['tipo']),
        criterios_relacionados: extractText(page.properties['Critérios Relacionados'] || page.properties['criterios_relacionados']),
        dimensoes_relacionadas: extractText(page.properties['Dimensões Relacionadas'] || page.properties['dimensoes_relacionadas']),
        ncs_relacionadas: extractText(page.properties['NCs Relacionadas'] || page.properties['ncs_relacionadas']),
        quando_recomendar: extractText(page.properties['Quando Recomendar'] || page.properties['quando_recomendar']),
        ativo: true,
        updated_from_notion_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    } else {
      return NextResponse.json({ error: `Unknown source_type: ${source_type}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      synced: result.synced,
      errors: result.errors,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data, error } = await supabase
    .from('knowledge_sources')
    .select('*')
    .order('source_name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sources: data });
}
