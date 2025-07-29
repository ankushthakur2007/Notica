import React from 'react';
import NoteEditor from '@/components/NoteEditor';
import CommentSidebar from '@/components/CommentSidebar';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/appStore';

const NoteEditorPage = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const isMobile = useIsMobile();
  const { user } = useAppStore();

  const { data: note } = useQuery({
    queryKey: ['note', noteId],
    queryFn: async () => {
      if (!noteId) return null;
      const { data } = await supabase.from('notes').select('user_id').eq('id', noteId).single();
      return data;
    },
    enabled: !!noteId,
  });

  const isNoteOwner = !!user && !!note && user.id === note.user_id;

  if (isMobile) {
    // On mobile, we'll eventually use a tab or drawer for comments.
    // For now, we'll just show the editor.
    return (
      <div className="min-h-screen w-full bg-background text-foreground overflow-hidden">
        <div className="relative z-10 h-screen flex flex-col">
          <NoteEditor />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-background text-foreground">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={75}>
          <NoteEditor />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={25} minSize={20}>
          {noteId && <CommentSidebar noteId={noteId} isNoteOwner={isNoteOwner} />}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default NoteEditorPage;