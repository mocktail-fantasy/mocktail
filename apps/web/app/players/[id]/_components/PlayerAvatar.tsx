'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Position } from '@mocktail/core';

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

export default function PlayerAvatar({ name, headshot }: Props) {
  const [failed, setFailed] = useState(!headshot);

  if (failed) {
    return (
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'var(--color-bg-tertiary)',
        border: '0.5px solid var(--color-border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        fontWeight: 500,
        color: 'var(--color-text-secondary)',
        flexShrink: 0,
      }}>
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div style={{
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      overflow: 'hidden',
      background: 'var(--color-bg-tertiary)',
      flexShrink: 0,
    }}>
      <Image
        src={headshot}
        alt={name}
        width={112}
        height={112}
        style={{ objectFit: 'cover', objectPosition: 'top', width: '100%', height: '100%' }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
