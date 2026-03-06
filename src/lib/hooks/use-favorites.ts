import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useFavorites() {
  const { data, mutate } = useSWR<string[]>('/api/favorites', fetcher, {
    revalidateOnFocus: false,
    fallbackData: [],
  });

  const favorites = new Set(data || []);

  const toggleFavorite = async (assetId: string) => {
    const wasFav = favorites.has(assetId);
    // Optimistic update
    const optimisticData = wasFav
      ? (data || []).filter(id => id !== assetId)
      : [...(data || []), assetId];

    mutate(optimisticData, false);

    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_id: assetId }),
      });
      if (!res.ok) throw new Error();
      // Revalidate to get server truth
      mutate();
    } catch {
      // Revert on error
      mutate();
    }
  };

  return { favorites, toggleFavorite, mutate };
}
