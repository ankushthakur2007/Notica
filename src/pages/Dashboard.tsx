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
import { SearchCommand } from '@/components/SearchCommand';

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

      // Fetch notes shared with the user, including the owner's profile
      const { data: shared, error: sharedError } = await supabase
        .from('collaborators')
        .select('permission_level, notes(*, profiles(first_name, last_name, avatar_url))')
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
    <div className="min-h-screen w-full bg-background text-foreground overflow-hidden">
      <SearchCommand />
      {/* Background Glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-purple-200/50 dark:bg-purple-500/30 rounded-full filter blur-3xl animate-float-1 [will-change:transform]"></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-200/50 dark:bg-blue-500/30 rounded-full filter blur-3xl animate-float-2 [will-change:transform]"></div>
      </div>
      <div className="relative z-10 min-h-screen flex flex-col">
        {isMobile ? (
          <div className="flex flex-col flex-grow">
            <header className="flex items-center p-4 border-b border-border/50 bg-background/30 backdrop-blur-sm relative">
              <MobileSidebar />
              <img src="/logo.png" alt="Notica Logo" className="h-8 w-auto absolute left-1/2 -translate-x-1/2" />
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
    </div>
  );
};

export default Dashboard;