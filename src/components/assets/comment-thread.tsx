'use client';

import { useState } from 'react';
import { MessageSquare, Reply, Trash2, Send } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/provider';
import type { CommentWithReplies } from '@/lib/hooks/use-comments';

interface CommentThreadProps {
  comments: CommentWithReplies[];
  currentUserId: string | null;
  onAddComment: (content: string, parentId?: string) => Promise<boolean>;
  onDeleteComment: (id: string) => Promise<boolean>;
}

function SingleComment({
  comment,
  currentUserId,
  onReply,
  onDelete,
  isReply = false,
}: {
  comment: CommentWithReplies;
  currentUserId: string | null;
  onReply: (id: string) => void;
  onDelete: (id: string) => void;
  isReply?: boolean;
}) {
  return (
    <div className={`${isReply ? 'mr-6 border-r-2 border-ono-green-light pr-3' : ''}`}>
      <div className="flex items-start gap-2 group">
        <div className="w-7 h-7 bg-ono-green-light rounded-full flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-ono-green-dark">
            {(comment.user_name || 'U')[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ono-gray-dark">
              {comment.user_name || 'משתמש'}
            </span>
            <span className="text-[10px] text-ono-gray">
              {new Date(comment.created_at).toLocaleDateString('he-IL')}{' '}
              {new Date(comment.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-xs text-ono-gray-dark mt-0.5 whitespace-pre-wrap">{comment.content}</p>
          <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isReply && (
              <button
                onClick={() => onReply(comment.id)}
                className="text-[10px] text-ono-gray hover:text-ono-green flex items-center gap-0.5"
              >
                <Reply className="w-3 h-3" />
                הגב
              </button>
            )}
            {comment.user_id === currentUserId && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-[10px] text-ono-gray hover:text-red-500 flex items-center gap-0.5"
              >
                <Trash2 className="w-3 h-3" />
                מחק
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommentThread({ comments, currentUserId, onAddComment, onDeleteComment }: CommentThreadProps) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    const ok = await onAddComment(newComment.trim());
    if (ok) setNewComment('');
    setSending(false);
  };

  const handleReply = async () => {
    if (!replyText.trim() || !replyingTo) return;
    setSending(true);
    const ok = await onAddComment(replyText.trim(), replyingTo);
    if (ok) {
      setReplyText('');
      setReplyingTo(null);
    }
    setSending(false);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold text-ono-gray-dark flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5 text-ono-green" />
        {t('assets.comments')} ({comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0)})
      </h4>

      {comments.length === 0 && (
        <p className="text-xs text-ono-gray text-center py-4">{t('assets.noComments')}</p>
      )}

      {comments.map(comment => (
        <div key={comment.id} className="space-y-2">
          <SingleComment
            comment={comment}
            currentUserId={currentUserId}
            onReply={setReplyingTo}
            onDelete={onDeleteComment}
          />

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="space-y-2">
              {comment.replies.map(reply => (
                <SingleComment
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  onReply={() => setReplyingTo(comment.id)}
                  onDelete={onDeleteComment}
                  isReply
                />
              ))}
            </div>
          )}

          {/* Reply input */}
          {replyingTo === comment.id && (
            <div className="mr-6 flex gap-2">
              <input
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={t('assets.reply') + '...'}
                className="flex-1 text-xs border border-[#E8E8E8] rounded px-2 py-1.5 focus:border-ono-green outline-none"
                onKeyDown={e => e.key === 'Enter' && handleReply()}
              />
              <button
                onClick={handleReply}
                disabled={sending || !replyText.trim()}
                className="text-xs bg-ono-green text-white px-2 py-1 rounded hover:bg-ono-green-dark disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
              </button>
              <button
                onClick={() => { setReplyingTo(null); setReplyText(''); }}
                className="text-xs text-ono-gray hover:text-ono-gray-dark px-1"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      ))}

      {/* New comment */}
      <div className="flex gap-2 pt-2 border-t border-[#E8E8E8]">
        <input
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder={t('assets.addComment')}
          className="flex-1 text-xs border border-[#E8E8E8] rounded px-3 py-2 focus:border-ono-green outline-none"
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
        <button
          onClick={handleSubmit}
          disabled={sending || !newComment.trim()}
          className="bg-ono-green text-white px-3 py-2 rounded hover:bg-ono-green-dark disabled:opacity-50 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
