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
    <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 shadow-sm sm:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex items-center gap-4 sm:gap-8">
          <div className="flex items-center gap-2.5">
            <div className="relative h-10 w-10 overflow-hidden rounded-full sm:h-12 sm:w-12">
              <Image
                src="/logo/logo.png"
                alt="Mocktail"
                fill
                sizes="48px"
                priority
                className="object-cover"
              />
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              <span className="text-orange-500">Mock</span><span style={{ color: '#3D8C5C' }}>tail</span>
            </span>
          </div>
          <nav className="flex gap-1 rounded-lg bg-gray-100 p-1">
            <Link
              href="/"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
                activePage === 'rankings'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Rankings
            </Link>
            <Link
              href="/teams"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
                activePage === 'teams'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Teams
            </Link>
            <Link
              href="/free-agents"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
                activePage === 'free-agents'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Free Agents
            </Link>
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:flex-nowrap sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Scoring</span>
            <select
              value={scoringType}
              onChange={(e) => setScoringType(e.target.value as ScoringType)}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
            >
              {SCORING_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
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
