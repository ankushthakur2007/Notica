import React from 'react';
import { useSessionContext } from '@/contexts/SessionContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import Sidebar from '@/components/Sidebar';
import MobileSidebar from '@/components/MobileSidebar';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

const Dashboard = () => {
  const { session, signOut, loading } = useSessionContext();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (!loading && session && location.pathname === '/dashboard') {
      navigate('/dashboard/all-notes', { replace: true });
    }
  }, [loading, session, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Loading user session...</p>
      </div>
    );
  }

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
            <h1 className="text-xl font-semibold absolute left-1/2 -translate-x-1/2">Notica</h1>
            <div className="ml-auto"> {/* This pushes ThemeToggle to the right */}
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