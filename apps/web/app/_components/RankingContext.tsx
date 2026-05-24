'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import type { RankingConfig } from '@mocktail/core';

interface RankingContextValue {
  activeId: string | null;        // null = Default ranking (hardcoded VORP)
  setActiveId: (id: string | null) => void;
  rankings: RankingConfig[];      // user's saved custom rankings (empty if signed out)
  activeConfig: RankingConfig | null;
}

const RankingContext = createContext<RankingContextValue | null>(null);

const STORAGE_KEY = 'active_ranking_id';

export function RankingProvider({
  rankings,
  initialActiveId,
  children,
}: {
  rankings: RankingConfig[];
  initialActiveId: string | null;
  children: React.ReactNode;
}) {
  const [activeId, setActiveIdState] = useState<string | null>(initialActiveId);

  useEffect(() => {
    if (initialActiveId !== null) return; // URL param wins over localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && rankings.some((r) => r.id === saved)) {
      setActiveIdState(saved);
    }
  }, [initialActiveId, rankings]);

  function setActiveId(id: string | null) {
    setActiveIdState(id);
    if (id === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, id);
  }

  const activeConfig = activeId ? rankings.find((r) => r.id === activeId) ?? null : null;

  return (
    <RankingContext.Provider value={{ activeId, setActiveId, rankings, activeConfig }}>
      {children}
    </RankingContext.Provider>
  );
}

export function useRanking() {
  const ctx = useContext(RankingContext);
  if (!ctx) throw new Error('useRanking must be used within RankingProvider');
  return ctx;
}
