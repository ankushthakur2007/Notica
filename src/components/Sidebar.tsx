import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, NotebookText, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePlatform } from '@/hooks/use-platform'; // Import the new hook

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const platform = usePlatform(); // Get the current platform

  const isActive = (path: string) => location.pathname === path;

  const handleNewNoteClick = () => {
    if (platform === 'android') {
      // On Android, navigate to a special ID for local-first note creation
      navigate('/dashboard/edit-note/local-new');
    } else {
      // On other platforms (web, iOS), use the NewNoteForm for direct DB creation
      navigate('/dashboard/new-note');
    }
  };

  return (
    <div className="flex flex-col h-full p-4 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center justify-between mb-6">
        <img src="/logo.png" alt="Notica Logo" className="h-8 w-auto" />
      </div>
      <nav className="flex flex-col space-y-2 flex-grow">
        <Button
          variant="ghost"
          className={`justify-start ${isActive('/dashboard/edit-note/local-new') || isActive('/dashboard/new-note') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
          onClick={handleNewNoteClick}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Note
        </Button>
        <Button
          variant="ghost"
          className={`justify-start ${isActive('/dashboard/all-notes') || isActive('/dashboard') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
          onClick={() => navigate('/dashboard/all-notes')}
        >
          <NotebookText className="mr-2 h-4 w-4" />
          All Notes
        </Button>
      </nav>
      <div className="mt-auto pt-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className={`justify-start w-full ${isActive('/settings') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
          onClick={() => {
            console.log('Attempting to navigate to settings via useNavigate.');
            navigate('/settings');
          }}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;