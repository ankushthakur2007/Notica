import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Comment } from '@/types';
import { useAppStore } from '@/stores/appStore';
import { showError, showSuccess } from '@/utils/toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageSquare } from 'lucide-react';
import CommentThread from './CommentThread';

interface CommentSidebarProps {
  noteId: string;
  isNoteOwner: boolean;
}

const fetchComments = async (noteId: string): Promise<Comment[]> => {
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(first_name, last_name, avatar_url)')
    .eq('note_id', noteId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data as Comment[];
};

const CommentSidebar = ({ noteId, isNoteOwner }: CommentSidebarProps) => {
  const { user } = useAppStore();
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery<Comment[], Error>({
    queryKey: ['comments', noteId],
    queryFn: () => fetchComments(noteId),
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', noteId] });
    },
    onError: (error: any) => {
      showError(error.message);
    },
  };

  const replyMutation = useMutation({
    mutationFn: async ({ content, parentCommentId }: { content: string, parentCommentId: string }) => {
      if (!user) throw new Error('You must be logged in to comment.');
      const { error } = await supabase.from('comments').insert({ content, note_id: noteId, user_id: user.id, parent_comment_id: parentCommentId });
      if (error) throw error;
    },
    ...mutationOptions,
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ commentId, isResolved }: { commentId: string, isResolved: boolean }) => {
      const { error } = await supabase.from('comments').update({ is_resolved: isResolved }).eq('id', commentId);
      if (error) throw error;
    },
    ...mutationOptions,
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    ...mutationOptions,
  });

  const commentThreads = React.useMemo(() => {
    if (!comments) return [];
    const commentMap = new Map(comments.map(c => [c.id, { ...c, replies: [] }]));
    const threads: Comment[] = [];
    for (const comment of comments) {
      if (comment.parent_comment_id) {
        commentMap.get(comment.parent_comment_id)?.replies.push(comment as any);
      } else {
        threads.push(commentMap.get(comment.id)!);
      }
    }
    return threads;
  }, [comments]);

  return (
    <div className="h-full flex flex-col bg-muted/30 dark:bg-black/20 border-l">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-center text-foreground">Comments</h3>
      </div>
      <ScrollArea className="flex-grow">
        <div className="p-4 space-y-4">
          {isLoading && <div className="flex justify-center items-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>}
          {!isLoading && commentThreads.length === 0 && (
            <div className="text-center py-16">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <h4 className="mt-4 text-lg font-semibold">No comments yet</h4>
              <p className="text-sm text-muted-foreground">Highlight text in the note to start a conversation.</p>
            </div>
          )}
          {commentThreads.map(comment => (
            <CommentThread
              key={comment.id}
              comment={comment}
              isNoteOwner={isNoteOwner}
              onReply={(content, parentId) => replyMutation.mutateAsync({ content, parentCommentId: parentId })}
              onResolve={(commentId, isResolved) => resolveMutation.mutateAsync({ commentId, isResolved })}
              onDelete={(commentId) => deleteMutation.mutateAsync(commentId)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CommentSidebar;