'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

type RealtimeTable = 'cycle_scores' | 'nc_records' | 'elogios' | 'import_cycles';

interface UseRealtimeSyncOptions {
  tables: RealtimeTable[];
  onUpdate: () => void;
  enabled?: boolean;
}

/**
 * Hook that subscribes to Supabase real-time changes on specified tables.
 * Calls onUpdate whenever INSERT, UPDATE, or DELETE happens on any of the tables.
 */
export function useRealtimeSync({ tables, onUpdate, enabled = true }: UseRealtimeSyncOptions) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    if (!supabase) return;

    const channelName = `realtime-sync-${tables.join('-')}`;
    const channel = supabase.channel(channelName);

    tables.forEach((table) => {
      channel.on(
        'postgres_changes' as Parameters<typeof channel.on>[0],
        { event: '*', schema: 'public', table },
        () => {
          onUpdateRef.current();
        }
      );
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[RealtimeSync] Subscribed to: ${tables.join(', ')}`);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tables.join(','), enabled]);
}

/**
 * Subscribe to a single table with a callback.
 */
export function useRealtimeTable(table: RealtimeTable, onUpdate: () => void, enabled = true) {
  return useRealtimeSync({ tables: [table], onUpdate, enabled });
}
