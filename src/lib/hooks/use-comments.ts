import useSWR from 'swr';
import type { AssetComment } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export interface CommentWithReplies extends AssetComment {
  replies?: CommentWithReplies[];
}

export function useComments(assetId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<CommentWithReplies[]>(
    assetId ? `/api/comments?asset_id=${assetId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const addComment = async (content: string, parentCommentId?: string) => {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset_id: assetId,
        content,
        parent_comment_id: parentCommentId || null,
      }),
    });
    if (res.ok) {
      mutate();
    }
    return res.ok;
  };

  const deleteComment = async (commentId: string) => {
    const res = await fetch(`/api/comments?id=${commentId}`, { method: 'DELETE' });
    if (res.ok) {
      mutate();
    }
    return res.ok;
  };

  // Group into threads
  const allComments = data || [];
  const topLevel = allComments.filter(c => !c.parent_comment_id);
  const threaded = topLevel.map(c => ({
    ...c,
    replies: allComments.filter(r => r.parent_comment_id === c.id),
  }));

  return {
    comments: threaded,
    allComments,
    isLoading,
    error,
    addComment,
    deleteComment,
    mutate,
  };
}
