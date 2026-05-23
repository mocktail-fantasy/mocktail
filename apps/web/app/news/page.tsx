import { getNews, getNewsPlayerMap } from '@/lib/data';
import NavHeader from '../_components/NavHeader';
import NewsFeed from '../_components/NewsFeed';

export default async function NewsPage() {
  const [items, playerMap] = await Promise.all([getNews(), getNewsPlayerMap()]);

  return (
    <main style={{ background: 'var(--color-bg-tertiary)' }}>
      <NavHeader activePage="news" />
      <div className="px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-7xl">
          <NewsFeed
            items={items}
            playerMap={playerMap}
            title="League news"
            showCategoryFilter
            initialCount={20}
            expandedCount={items.length}
          />
        </div>
      </div>
    </main>
  );
}
