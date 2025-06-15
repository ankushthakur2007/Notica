import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSessionContext } from '@/contexts/SessionContext';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import Sidebar from '@/components/Sidebar';
import NewNoteForm from '@/components/NewNoteForm';
import NoteList from '@/components/NoteList'; // Import the new NoteList component

type DashboardView = 'welcome' | 'newNote' | 'allNotes';

const Dashboard = () => {
  const { session, signOut } = useSessionContext();
  const [activeView, setActiveView] = useState<DashboardView>('welcome');

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Loading user session...</p>
      </div>
    );
  }

  const renderMainContent = () => {
    switch (activeView) {
      case 'newNote':
        return <NewNoteForm onNoteCreated={() => setActiveView('allNotes')} />; // After creating, switch to all notes view
      case 'allNotes':
        return <NoteList />; // Render the NoteList component
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
          <Sidebar onNavigate={setActiveView} />
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