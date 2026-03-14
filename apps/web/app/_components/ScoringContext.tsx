'use client';

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { ScoringType, ScoringSettings } from '@mocktail/core';

interface ScoringContextValue {
  scoringType: ScoringType;
  setScoringType: (type: ScoringType) => void;
  tep: boolean;
  setTep: (v: boolean) => void;
  twoQB: boolean;
  setTwoQB: (v: boolean) => void;
  sixPtPass: boolean;
  setSixPtPass: (v: boolean) => void;
  scoringSettings: ScoringSettings;
}

const ScoringContext = createContext<ScoringContextValue | null>(null);

function readBool(key: string): boolean | null {
  const v = localStorage.getItem(key);
  return v === null ? null : v === 'true';
}

export function ScoringProvider({ children }: { children: React.ReactNode }) {
  const [scoringType, setScoringTypeState] = useState<ScoringType>('standard');
  const [tep, setTepState] = useState(false);
  const [twoQB, setTwoQBState] = useState(false);
  const [sixPtPass, setSixPtPassState] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('scoring_type') as ScoringType | null;
    if (saved === 'standard' || saved === 'half_ppr' || saved === 'ppr') {
      setScoringTypeState(saved);
    }
    const savedTep = readBool('scoring_tep');
    if (savedTep !== null) setTepState(savedTep);
    const savedTwoQB = readBool('scoring_two_qb');
    if (savedTwoQB !== null) setTwoQBState(savedTwoQB);
    const savedSixPtPass = readBool('scoring_six_pt_pass');
    if (savedSixPtPass !== null) setSixPtPassState(savedSixPtPass);
  }, []);

  function setScoringType(type: ScoringType) {
    setScoringTypeState(type);
    localStorage.setItem('scoring_type', type);
  }

  function setTep(v: boolean) {
    setTepState(v);
    localStorage.setItem('scoring_tep', String(v));
  }

  function setTwoQB(v: boolean) {
    setTwoQBState(v);
    localStorage.setItem('scoring_two_qb', String(v));
  }

  function setSixPtPass(v: boolean) {
    setSixPtPassState(v);
    localStorage.setItem('scoring_six_pt_pass', String(v));
  }

  const scoringSettings = useMemo<ScoringSettings>(
    () => ({ scoringType, tep, sixPointPassTDs: sixPtPass }),
    [scoringType, tep, sixPtPass],
  );

  return (
    <ScoringContext.Provider value={{ scoringType, setScoringType, tep, setTep, twoQB, setTwoQB, sixPtPass, setSixPtPass, scoringSettings }}>
      {children}
    </ScoringContext.Provider>
  );
}

export function useScoringType() {
  const ctx = useContext(ScoringContext);
  if (!ctx) throw new Error('useScoringType must be used within ScoringProvider');
  return ctx;
}
