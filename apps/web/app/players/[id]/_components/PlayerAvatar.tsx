'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Position } from '@mocktail/core';

const POSITION_AVATAR_STYLES: Record<Position, string> = {
  QB: 'bg-blue-100 text-blue-600',
  RB: 'bg-emerald-100 text-emerald-600',
  WR: 'bg-violet-100 text-violet-600',
  TE: 'bg-orange-100 text-orange-600',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface Props {
  name: string;
  headshot: string;
  primaryPosition: Position;
}

export default function PlayerAvatar({ name, headshot, primaryPosition }: Props) {
  const [failed, setFailed] = useState(!headshot);

  if (failed) {
    return (
      <div className={`flex h-[100px] w-[100px] items-center justify-center rounded-xl text-3xl font-bold ${POSITION_AVATAR_STYLES[primaryPosition]}`}>
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div className="relative h-[100px] w-[100px] overflow-hidden rounded-xl bg-gray-100">
      <Image
        src={headshot}
        alt={name}
        fill
        sizes="200px"
        className="object-cover object-top"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
