import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, NotebookText, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom'; // Import useLocation to highlight active link

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Get current location to determine active link

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex flex-col h-full p-4 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-sidebar-primary-foreground">Notica</h2>
      </div>
      <nav className="flex flex-col space-y-2 flex-grow">
        <Button
          variant="ghost"
          className={`justify-start ${isActive('/dashboard/new-note') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
          onClick={() => navigate('/dashboard/new-note')}
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