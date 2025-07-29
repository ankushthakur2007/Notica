import React, { useState } from 'react';
import { Comment } from '@/types';
import { useAppStore } from '@/stores/appStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { Check, CornerDownRight, Trash2 } from 'lucide-react';

interface CommentThreadProps {
  comment: Comment;
  isNoteOwner: boolean;
  onReply: (content: string, parentCommentId: string) => Promise<void>;
  onResolve: (commentId: string, isResolved: boolean) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

const CommentThread = ({ comment, isNoteOwner, onReply, onResolve, onDelete }: CommentThreadProps) => {
  const { user } = useAppStore();
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleReplySubmit = async () => {
    if (replyContent.trim()) {
      await onReply(replyContent, comment.id);
      setReplyContent('');
      setIsReplying(false);
    }
  };

  const CommentCard = ({ c }: { c: Comment }) => (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={c.profiles?.avatar_url || undefined} />
        <AvatarFallback>{c.profiles?.first_name?.[0] || 'U'}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{c.profiles?.first_name || 'Anonymous'}</p>
          <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</p>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{c.content}</p>
        <div className="flex items-center gap-2 mt-2">
          {user?.id === c.user_id && (
            <Button variant="ghost" size="sm" className="text-destructive h-auto px-2 py-1 text-xs" onClick={() => onDelete(c.id)}>
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`p-3 rounded-lg ${comment.is_resolved ? 'bg-muted/50 opacity-60' : 'bg-card'}`}>
      {comment.highlighted_text && (
        <blockquote className="border-l-2 pl-3 text-sm italic text-muted-foreground mb-2">
          "{comment.highlighted_text}"
        </blockquote>
      )}
      <CommentCard c={comment} />
      <div className="flex items-center gap-2 mt-2 ml-11">
        <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={() => setIsReplying(!isReplying)}>
          <CornerDownRight className="h-3 w-3 mr-1" /> Reply
        </Button>
        {isNoteOwner && (
          <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={() => onResolve(comment.id, !comment.is_resolved)}>
            <Check className="h-3 w-3 mr-1" /> {comment.is_resolved ? 'Unresolve' : 'Resolve'}
          </Button>
        )}
      </div>
      
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-8 mt-3 space-y-3 border-l pl-3">
          {comment.replies.map(reply => <CommentCard key={reply.id} c={reply} />)}
        </div>
      )}

      {isReplying && (
        <div className="ml-11 mt-3">
          <Textarea 
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            className="text-sm"
            rows={2}
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsReplying(false)}>Cancel</Button>
            <Button size="sm" onClick={handleReplySubmit}>Reply</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentThread;