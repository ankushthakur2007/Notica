import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, NotebookText, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SidebarProps {
  onNavigate: (view: 'newNote' | 'allNotes' | 'welcome') => void;
}

const Sidebar = ({ onNavigate }: SidebarProps) => {
  return (
    <div className="flex flex-col h-full p-4 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-sidebar-primary-foreground">Notica</h2>
      </div>
      <nav className="flex flex-col space-y-2 flex-grow">
        <Button
          variant="ghost"
          className="justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => onNavigate('newNote')}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Note
        </Button>
        <Button
          variant="ghost"
          className="justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => onNavigate('allNotes')}
        >
          <NotebookText className="mr-2 h-4 w-4" />
          All Notes
        </Button>
      </nav>
      <div className="mt-auto pt-4 border-t border-sidebar-border">
        <Link to="/settings" onClick={() => console.log('Navigating to settings...')}>
          <Button
            variant="ghost"
            className="justify-start w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;