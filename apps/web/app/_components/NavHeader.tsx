'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ScoringType } from '@mocktail/core';
import { useScoringType } from './ScoringContext';

const SCORING_OPTIONS: { value: ScoringType; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'half_ppr', label: '0.5 PPR' },
  { value: 'ppr', label: 'PPR' },
];

export default function NavHeader({ activePage }: { activePage: 'rankings' | 'teams' | 'free-agents' }) {
  const { scoringType, setScoringType, tep, setTep, twoQB, setTwoQB } = useScoringType();

  return (
    <header className="shrink-0 border-b border-gray-200 bg-white px-8 py-3 shadow-sm">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2.5">
          <div className="relative h-12 w-12 overflow-hidden rounded-full">
            <Image
              src="/logo/logo.png"
              alt="Mocktail"
              fill
              sizes="48px"
              priority
              className="object-cover"
            />
          </div>
          <span className="text-3xl font-bold tracking-tight text-gray-900">
            <span className="text-orange-500">Mock</span><span style={{ color: '#3D8C5C' }}>tail</span>
          </span>
        </div>
        <nav className="flex gap-1 rounded-lg bg-gray-100 p-1">
          <Link
            href="/"
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activePage === 'rankings'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Rankings
          </Link>
          <Link
            href="/teams"
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activePage === 'teams'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Teams
          </Link>
          <Link
            href="/free-agents"
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activePage === 'free-agents'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Free Agents
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Scoring</span>
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
              {SCORING_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setScoringType(value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    scoringType === value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setTep(!tep)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
              tep
                ? 'border-orange-300 bg-orange-50 text-orange-600'
                : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            TEP
          </button>
          <button
            onClick={() => setTwoQB(!twoQB)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
              twoQB
                ? 'border-orange-300 bg-orange-50 text-orange-600'
                : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            2QB
          </button>
        </div>
      </div>
    </header>
  );
}
