'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (status === 'loading') {
    return (
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%',
        background: 'var(--color-bg-secondary)',
        border: '0.5px solid var(--color-border-medium)',
      }} />
    );
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn()}
        style={{
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--color-text-secondary)',
          background: 'transparent',
          border: '0.5px solid var(--color-border-medium)',
          borderRadius: '6px',
          padding: '5px 12px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => {
          (e.target as HTMLElement).style.color = 'var(--color-text-primary)';
          (e.target as HTMLElement).style.borderColor = 'var(--color-border-strong)';
        }}
        onMouseLeave={e => {
          (e.target as HTMLElement).style.color = 'var(--color-text-secondary)';
          (e.target as HTMLElement).style.borderColor = 'var(--color-border-medium)';
        }}
      >
        Sign in
      </button>
    );
  }

  const name = session.user?.name ?? '';
  const email = session.user?.email ?? '';
  const image = session.user?.image;
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '32px', height: '32px', borderRadius: '50%',
          overflow: 'hidden',
          border: '0.5px solid var(--color-border-medium)',
          background: 'var(--color-bg-secondary)',
          cursor: 'pointer',
          padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 500,
          color: 'var(--color-text-secondary)',
          flexShrink: 0,
        }}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : initials}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'var(--color-bg-primary)',
          border: '0.5px solid var(--color-border-medium)',
          borderRadius: '8px',
          padding: '4px',
          minWidth: '200px',
          zIndex: 200,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {/* User info */}
          <div style={{
            padding: '8px 10px 10px',
            borderBottom: '0.5px solid var(--color-border-light)',
            marginBottom: '4px',
          }}>
            {name && (
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {name}
              </div>
            )}
            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
              {email}
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={() => { signOut(); setOpen(false); }}
            style={{
              width: '100%', textAlign: 'left',
              padding: '7px 10px',
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              background: 'transparent',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.1s, color 0.1s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.background = 'var(--color-bg-secondary)';
              (e.target as HTMLElement).style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.background = 'transparent';
              (e.target as HTMLElement).style.color = 'var(--color-text-secondary)';
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
