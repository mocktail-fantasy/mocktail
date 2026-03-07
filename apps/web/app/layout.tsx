import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { ScoringProvider } from './_components/ScoringContext';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'Mocktail',
  description: 'Fantasy football projections and rankings',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} font-[family-name:var(--font-geist)] antialiased bg-gray-50 text-gray-900 min-h-screen`}
      >
        <ScoringProvider>{children}</ScoringProvider>
      </body>
    </html>
  );
}
