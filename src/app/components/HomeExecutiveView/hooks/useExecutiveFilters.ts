'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export interface ExecutiveFilters {
  periodo: string;
  squad: string | null;
  setPeriodo: (periodo: string) => void;
  setSquad: (squad: string | null) => void;
  clearFilters: () => void;
}

export function useExecutiveFilters(
  defaultPeriodo: string
): ExecutiveFilters {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [periodo, setPeriodoState] = useState(defaultPeriodo);
  const [squad, setSquadState] = useState<string | null>(null);

  // Initialize from URL on mount
  useEffect(() => {
    const urlPeriodo = searchParams.get('periodo');
    const urlSquad = searchParams.get('squad');

    if (urlPeriodo) setPeriodoState(urlPeriodo);
    if (urlSquad) setSquadState(urlSquad);
  }, [searchParams]);

  const setPeriodo = useCallback(
    (newPeriodo: string) => {
      setPeriodoState(newPeriodo);
      updateURL({ periodo: newPeriodo, squad });
    },
    [squad]
  );

  const setSquad = useCallback(
    (newSquad: string | null) => {
      setSquadState(newSquad);
      updateURL({ periodo, squad: newSquad });
    },
    [periodo]
  );

  const clearFilters = useCallback(() => {
    setPeriodoState(defaultPeriodo);
    setSquadState(null);
    updateURL({ periodo: defaultPeriodo, squad: null });
  }, [defaultPeriodo]);

  const updateURL = useCallback(
    (params: { periodo: string; squad: string | null }) => {
      const current = new URLSearchParams(searchParams.toString());

      if (params.periodo) {
        current.set('periodo', params.periodo);
      } else {
        current.delete('periodo');
      }

      if (params.squad) {
        current.set('squad', params.squad);
      } else {
        current.delete('squad');
      }

      const search = current.toString();
      router.push(`?${search}`, { shallow: true } as any);
    },
    [router, searchParams]
  );

  return {
    periodo,
    squad,
    setPeriodo,
    setSquad,
    clearFilters,
  };
}
