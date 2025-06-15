import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, NotebookText } from 'lucide-react';

interface SidebarProps {
  onNavigate: (view: 'newNote' | 'allNotes' | 'welcome') => void;
}

const Sidebar = ({ onNavigate }: SidebarProps) => {
  return (
    <div className="flex flex-col h-full p-4 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-sidebar-primary-foreground">Notica</h2>
      </div>
      <nav className="flex flex-col space-y-2">
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
    </div>
  );
};

export default Sidebar;