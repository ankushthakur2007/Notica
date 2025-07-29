import React from 'react';
import { Button } from '@/components/ui/button';
import { NotebookText, Settings, Users, BrainCircuit } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile'; // Import useIsMobile

interface SidebarProps {
  onLinkClick?: () => void; // Optional prop for closing mobile sidebar
}

const Sidebar = ({ onLinkClick }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile(); // Determine if it's a mobile view

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleNavigationClick = (path: string) => {
    navigate(path);
    if (isMobile && onLinkClick) {
      onLinkClick(); // Close sidebar only if on mobile and callback is provided
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
          className={`justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive('/dashboard/your-notes') || location.pathname === '/dashboard' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}
          onClick={() => handleNavigationClick('/dashboard/your-notes')}
        >
          <NotebookText className="mr-2 h-4 w-4" />
          Your Notes
        </Button>
        <Button
          variant="ghost"
          className={`justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive('/dashboard/shared-notes') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}
          onClick={() => handleNavigationClick('/dashboard/shared-notes')}
        >
          <Users className="mr-2 h-4 w-4" />
          Shared Notes
        </Button>
        <Button
          variant="ghost"
          className={`justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive('/dashboard/meetings') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}
          onClick={() => handleNavigationClick('/dashboard/meetings')}
        >
          <BrainCircuit className="mr-2 h-4 w-4" />
          Meetings
        </Button>
      </nav>
      <div className="mt-auto pt-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className={`justify-start w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isActive('/dashboard/settings') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}
          onClick={() => handleNavigationClick('/dashboard/settings')}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;