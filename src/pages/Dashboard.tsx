import React from 'react';
import { useSessionContext } from '@/contexts/SessionContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import Sidebar from '@/components/Sidebar';
import MobileSidebar from '@/components/MobileSidebar'; // Import MobileSidebar
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile'; // Import useIsMobile hook

const Dashboard = () => {
  const { session, signOut, loading } = useSessionContext();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile(); // Use the hook to detect mobile

  // Redirect to default dashboard view if on /dashboard directly
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
    // If session is not available after loading, redirect to login
    navigate('/login', { replace: true });
    return null; // Or a loading spinner
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {isMobile ? (
        <div className="flex flex-col flex-grow">
          <header className="flex items-center justify-between p-4 border-b border-border">
            <MobileSidebar />
            <h1 className="text-xl font-semibold">Notica</h1>
            {/* ThemeToggle is already absolute, so it will float above */}
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