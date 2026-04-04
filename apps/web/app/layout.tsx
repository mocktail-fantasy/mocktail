import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import './globals.css';
import { ScoringProvider } from './_components/ScoringContext';
import { auth } from '@/auth';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'Mocktail',
  description: 'Fantasy football projections and rankings',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="en">
      <body
        className={`${geist.variable} font-[family-name:var(--font-geist)] antialiased min-h-screen`}
        style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
      >
        <SessionProvider session={session}>
          <ScoringProvider>{children}</ScoringProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
