import React, { useEffect } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import Sidebar from '@/components/Sidebar';
import MobileSidebar from '@/components/MobileSidebar';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppStore } from '@/stores/appStore';
import { supabase } from '@/integrations/supabase/client';
import { Note } from '@/types';

const Dashboard = () => {
  const { session, setNotes, setSharedNotes, startFetchingNotes, finishFetchingNotes, addNote, updateNote, deleteNote } = useAppStore();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!session?.user) return;

    const fetchAllNotes = async () => {
      startFetchingNotes();
      
      // Fetch user's own notes
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false });

      if (notesError) {
        console.error('Error fetching notes:', notesError);
      } else {
        setNotes(notes as Note[]);
      }

      // Fetch notes shared with the user
      const { data: shared, error: sharedError } = await supabase
        .from('collaborators')
        .select('permission_level, notes(*)')
        .eq('user_id', session.user.id);

      if (sharedError) {
        console.error('Error fetching shared notes:', sharedError);
      } else {
        const sharedNotesData = shared
          ?.map(item => {
            const noteData = item.notes as unknown as Note;
            if (noteData) {
              return { ...noteData, permission_level: item.permission_level as 'read' | 'write' };
            }
            return null;
          })
          .filter(Boolean);
        
        if (sharedNotesData) {
            setSharedNotes(sharedNotesData as Note[]);
        }
      }
      
      finishFetchingNotes();
    };

    fetchAllNotes();

    const channel = supabase
      .channel('realtime notes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes' },
        (payload) => {
          console.log('Real-time change received!', payload);
          if (payload.eventType === 'INSERT') {
            addNote(payload.new as Note);
          }
          if (payload.eventType === 'UPDATE') {
            updateNote(payload.new as Note);
          }
          if (payload.eventType === 'DELETE') {
            // The old record is available in the payload on delete
            deleteNote((payload.old as Note).id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  if (!session) {
    navigate('/login', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {isMobile ? (
        <div className="flex flex-col flex-grow">
          <header className="flex items-center p-4 border-b border-border relative">
            <MobileSidebar />
            <img src="/logo.png" alt="Notica Logo" className="h-10 md:h-8 w-auto absolute left-1/2 -translate-x-1/2" />
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-grow overflow-y-auto">
            <Outlet />
          </main>
        </div>
      ) : (
        <ResizablePanelGroup direction="horizontal" className="flex-grow">
          <ResizablePanel defaultSize={20} minSize={15} maxSize={25}>
            <Sidebar />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={80}>
            <Outlet />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
};

export default Dashboard;