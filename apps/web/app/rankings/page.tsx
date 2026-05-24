import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth-helpers';
import { listRankings } from '@/lib/rankings-actions';
import NavHeader from '../_components/NavHeader';
import RankingsListActions from './_components/RankingsListActions';

export default async function RankingsListPage() {
  const userId = await requireUserId();
  if (!userId) {
    redirect('/auth/signin?callbackUrl=/rankings');
  }

  const rankings = await listRankings();

  return (
    <main style={{ background: 'var(--color-bg-tertiary)' }}>
      <NavHeader activePage="profiles" />
      <div className="px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                Ranking Profiles
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Tune the rankings for each league you draft in. Select one on the rankings page.
              </p>
            </div>
            <Link href="/rankings/new" className="btn-brand">
              + New profile
            </Link>
          </div>

          {rankings.length === 0 ? (
            <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                You haven&apos;t created any ranking profiles yet.
              </p>
              <Link href="/rankings/new" className="btn-brand">
                Create your first profile
              </Link>
            </div>
          ) : (
            <RankingsListActions rankings={rankings} />
          )}
        </div>
      </div>
    </main>
  );
}
