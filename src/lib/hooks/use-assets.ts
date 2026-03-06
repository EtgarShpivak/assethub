import useSWR from 'swr';
import type { Asset } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface AssetsResponse {
  assets: Asset[];
  total: number;
  uploaders: { id: string; name: string }[];
}

interface UseAssetsParams {
  search?: string;
  slug_id?: string;
  initiative_id?: string;
  file_type?: string;
  platform?: string;
  aspect_ratio?: string;
  domain_context?: string;
  asset_type?: string;
  dimensions?: string;
  date_from?: string;
  date_to?: string;
  tag?: string;
  expiry?: string;
  uploaded_by?: string;
  unclassified?: string;
  favorites_only?: boolean;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export function useAssets(params: UseAssetsParams) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.slug_id) searchParams.set('slug_id', params.slug_id);
  if (params.initiative_id) searchParams.set('initiative_id', params.initiative_id);
  if (params.file_type) searchParams.set('file_type', params.file_type);
  if (params.platform) searchParams.set('platform', params.platform);
  if (params.aspect_ratio) searchParams.set('aspect_ratio', params.aspect_ratio);
  if (params.domain_context) searchParams.set('domain_context', params.domain_context);
  if (params.asset_type) searchParams.set('asset_type', params.asset_type);
  if (params.dimensions) searchParams.set('dimensions', params.dimensions);
  if (params.date_from) searchParams.set('date_from', params.date_from);
  if (params.date_to) searchParams.set('date_to', params.date_to);
  if (params.tag) searchParams.set('tag', params.tag);
  if (params.expiry) searchParams.set('expiry', params.expiry);
  if (params.uploaded_by) searchParams.set('uploaded_by', params.uploaded_by);
  if (params.unclassified) searchParams.set('unclassified', params.unclassified);
  if (params.favorites_only) searchParams.set('favorites_only', 'true');
  searchParams.set('page', String(params.page || 1));
  if (params.limit) searchParams.set('limit', String(params.limit));
  searchParams.set('sort_by', params.sort_by || 'upload_date');
  searchParams.set('sort_dir', params.sort_dir || 'desc');

  const key = `/api/assets?${searchParams.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<AssetsResponse>(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  });

  return {
    assets: data?.assets || [],
    total: data?.total || 0,
    uploaders: data?.uploaders || [],
    isLoading,
    error,
    mutate,
  };
}

export function useAssetById(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/assets/${id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return { asset: data as Asset | null, isLoading, error, mutate };
}
