import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSessionContext } from '@/contexts/SessionContext';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import Sidebar from '@/components/Sidebar';
import NewNoteForm from '@/components/NewNoteForm';
import NoteList from '@/components/NoteList';
import NoteEditor from '@/components/NoteEditor'; // Import the new NoteEditor component

type DashboardView = 'welcome' | 'newNote' | 'allNotes' | 'editNote';

const Dashboard = () => {
  const { session, signOut } = useSessionContext();
  const [activeView, setActiveView] = useState<DashboardView>('welcome');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Loading user session...</p>
      </div>
    );
  }

  const handleNavigate = (view: DashboardView) => {
    setActiveView(view);
    if (view !== 'editNote') {
      setSelectedNoteId(null); // Clear selected note when changing view
    }
  };

  const handleSelectNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    setActiveView('editNote');
  };

  const renderMainContent = () => {
    switch (activeView) {
      case 'newNote':
        return <NewNoteForm onNoteCreated={() => handleNavigate('allNotes')} />;
      case 'allNotes':
        return <NoteList onSelectNote={handleSelectNote} />;
      case 'editNote':
        if (selectedNoteId) {
          return <NoteEditor noteId={selectedNoteId} onClose={() => handleNavigate('allNotes')} />;
        }
        return (
          <div className="flex items-center justify-center h-full text-destructive">
            <p>No note selected for editing.</p>
          </div>
        );
      case 'welcome':
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold">Welcome to Notica, {session.user?.email}!</h1>
              <p className="text-xl text-muted-foreground">Your personal voice-powered note-taking assistant.</p>
              <Button onClick={signOut} className="mt-6">
                Sign Out
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <ResizablePanelGroup direction="horizontal" className="flex-grow">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={25}>
          <Sidebar onNavigate={handleNavigate} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={80}>
          {renderMainContent()}
        </ResizablePanel>
      </ResizablePanelGroup>
      <MadeWithDyad />
    </div>
  );
};

export default Dashboard;