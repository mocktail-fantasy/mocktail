'use client';

import Link from 'next/link';
import LogoBlock from './LogoBlock';
import UserMenu from './UserMenu';

export default function NavHeader({ activePage }: { activePage: 'rankings' | 'teams' | 'free-agents' }) {
  const navItems: { href: string; label: string; shortLabel: string; key: 'rankings' | 'teams' | 'free-agents' }[] = [
    { href: '/', label: 'Rankings', shortLabel: 'Rnk', key: 'rankings' },
    { href: '/teams', label: 'Teams', shortLabel: 'Tm', key: 'teams' },
    { href: '/free-agents', label: 'Free Agents', shortLabel: 'FA', key: 'free-agents' },
  ];

  return (
    <header style={{
      background: 'var(--color-bg-primary)',
      borderBottom: '0.5px solid var(--color-border-light)',
      padding: '0 20px',
      display: 'flex',
      alignItems: 'stretch',
      height: '52px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo block */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        paddingRight: '24px',
        marginRight: '24px',
        borderRight: '0.5px solid var(--color-border-light)',
        height: '100%',
        flexShrink: 0,
      }}>
        <LogoBlock />
      </div>

      {/* Nav items */}
      <nav style={{ display: 'flex', alignItems: 'stretch' }}>
        {navItems.map(({ href, label, shortLabel, key }) => {
          const isActive = activePage === key;
          return (
            <Link
              key={key}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                height: '100%',
                fontSize: '14px',
                textDecoration: 'none',
                borderBottom: isActive ? '2px solid var(--color-brand)' : '2px solid transparent',
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? 500 : 400,
                transition: 'color 0.15s',
              }}
            >
              <span className="sm:hidden">{shortLabel}</span>
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User menu — pushed to right */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
        <UserMenu />
      </div>
    </header>
  );
}
