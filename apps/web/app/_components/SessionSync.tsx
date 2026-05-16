'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';
import { getUserProjections, importProjections } from '@/lib/actions';
import type { PlayerProjection } from '@mocktail/core';

export default function SessionSync() {
  const { status } = useSession();
  const synced = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || synced.current) return;
    synced.current = true;

    getUserProjections().then((dbProjections) => {
      if (Object.keys(dbProjections).length > 0) {
        // Hydrate localStorage from DynamoDB
        for (const [playerId, projection] of Object.entries(dbProjections)) {
          localStorage.setItem(`projection_${playerId}`, JSON.stringify(projection));
        }
      } else {
        // DynamoDB empty — silently migrate any existing localStorage projections
        const local: Record<string, PlayerProjection> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)!;
          if (key.startsWith('projection_')) {
            try {
              local[key.replace('projection_', '')] = JSON.parse(localStorage.getItem(key)!);
            } catch {
              // Corrupted entry — skip
            }
          }
        }
        if (Object.keys(local).length > 0) {
          importProjections(local);
        }
      }
    });
  }, [status]);

  return null;
}
