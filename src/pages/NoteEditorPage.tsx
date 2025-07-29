import React from 'react';
import NoteEditor from '@/components/NoteEditor';
import CommentSidebar from '@/components/CommentSidebar';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/appStore';
import { Note } from '@/types';
import { Loader2 } from 'lucide-react';

const NoteEditorPage = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const isMobile = useIsMobile();
  const { user } = useAppStore();

  const { data: note, isLoading, isError } = useQuery<Note, Error>({
    queryKey: ['note', noteId],
    queryFn: async () => {
      if (!noteId) throw new Error("Note ID is required.");
      const { data, error } = await supabase.from('notes').select('*').eq('id', noteId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!noteId,
  });

  const isNoteOwner = !!user && !!note && user.id === note.user_id;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading note...</p>
      </div>
    );
  }

  if (isError || !note) {
    return (
      <div className="flex items-center justify-center h-screen text-destructive">
        <p>Could not load the note. It may have been deleted or you may not have permission to view it.</p>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground overflow-hidden">
        <div className="relative z-10 h-screen flex flex-col">
          <NoteEditor note={note} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-background text-foreground">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={75}>
          <NoteEditor note={note} />
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