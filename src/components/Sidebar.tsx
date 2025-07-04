import React from 'react';
import { Button } from '@/components/ui/button';
import { NotebookText, Settings, Users } from 'lucide-react'; // Removed PlusCircle
import { useNavigate, useLocation } from 'react-router-dom';
import { usePlatform } from '@/hooks/use-platform';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // const platform = usePlatform(); // No longer needed directly here, but kept for context

  const isActive = (path: string) => location.pathname === path;

  // Removed handleNewNoteClick as the button is removed

  return (
    <div className="flex flex-col h-full p-4 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center justify-between mb-6">
        <img src="/logo.png" alt="Notica Logo" className="h-8 w-auto" />
      </div>
      <nav className="flex flex-col space-y-2 flex-grow">
        {/* Removed New Note Button */}
        <Button
          variant="ghost"
          className={`justify-start ${isActive('/dashboard/your-notes') || isActive('/dashboard') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
          onClick={() => navigate('/dashboard/your-notes')}
        >
          <NotebookText className="mr-2 h-4 w-4" />
          Your Notes
        </Button>
        <Button
          variant="ghost"
          className={`justify-start ${isActive('/dashboard/shared-notes') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
          onClick={() => navigate('/dashboard/shared-notes')}
        >
          <Users className="mr-2 h-4 w-4" />
          Shared Notes
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