import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth-helpers';
import NavHeader from '../../_components/NavHeader';
import NewRankingForm from '../_components/NewRankingForm';

export default async function NewRankingPage() {
  const userId = await requireUserId();
  if (!userId) {
    redirect('/auth/signin?callbackUrl=/rankings/new');
  }

  return (
    <main style={{ background: 'var(--color-bg-tertiary)' }}>
      <NavHeader activePage="profiles" />
      <div className="px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <NewRankingForm />
        </div>
      </div>
    </main>
  );
}
