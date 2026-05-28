import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === 'your-supabase-service-role-key-here') {
      return NextResponse.json({ users: [], error: 'Service role key not configured' }, { status: 200 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // List all auth users
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (authError) {
      return NextResponse.json({ users: [], error: authError.message }, { status: 200 });
    }

    const authUsers = authData?.users || [];

    // For each auth user, ensure they exist in user_profiles
    const upserts = authUsers.map((u) => ({
      id: u.id,
      email: u.email || '',
      full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || '',
      role: 'Visualizador',
      is_active: true,
      status_usuario: 'ativo',
      squads: [],
      equipes: [],
      updated_at: new Date().toISOString(),
    }));

    if (upserts.length > 0) {
      // Upsert but only set role/name if not already set (use ignoreDuplicates=false with merge)
      await adminClient.from('user_profiles').upsert(upserts, {
        onConflict: 'id',
        ignoreDuplicates: true, // Don't overwrite existing data
      });
    }

    // Return all auth users for display
    return NextResponse.json({
      users: authUsers.map((u) => ({
        id: u.id,
        email: u.email || '',
        full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || '',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        provider: u.app_metadata?.provider || 'email',
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ users: [], error: e.message }, { status: 200 });
  }
}
