import { notFound, redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth-helpers';
import { listRankings } from '@/lib/rankings-actions';
import NavHeader from '../../../_components/NavHeader';
import NewRankingForm from '../../_components/NewRankingForm';

export default async function EditRankingPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) {
    redirect('/auth/signin?callbackUrl=/rankings');
  }

  const { id } = await params;
  const rankings = await listRankings();
  const config = rankings.find((r) => r.id === id);
  if (!config) notFound();

  return (
    <main style={{ background: 'var(--color-bg-tertiary)' }}>
      <NavHeader activePage="profiles" />
      <div className="px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <NewRankingForm initial={config} />
        </div>
      </div>
    </main>
  );
}
