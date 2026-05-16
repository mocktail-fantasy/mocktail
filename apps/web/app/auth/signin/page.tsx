'use client';

import { signIn } from 'next-auth/react';
import LogoBlock from '@/app/_components/LogoBlock';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.805.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function SignInPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--color-bg-tertiary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '380px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '32px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <LogoBlock />
          <p style={{
            fontSize: '13px',
            color: 'var(--color-text-tertiary)',
            textAlign: 'center',
            margin: 0,
          }}>
            Sign in to save your projections across devices
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => signIn('google', { callbackUrl: '/' })}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '11px 16px',
              borderRadius: '8px',
              border: '0.5px solid var(--color-border-medium)',
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-strong)';
              (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-primary)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-medium)';
              (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-secondary)';
            }}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p style={{
            fontSize: '11px',
            color: 'var(--color-text-tertiary)',
            textAlign: 'center',
            margin: '4px 0 0',
            lineHeight: 1.6,
          }}>
            By signing in you agree to your projections being saved to your account.
          </p>
        </div>
      </div>
    </main>
  );
}
