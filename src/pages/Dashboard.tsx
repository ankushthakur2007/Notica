import React from 'react';
import { useSessionContext } from '@/contexts/SessionContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import Sidebar from '@/components/Sidebar';
import { Outlet, useLocation, useNavigate } from 'react-router-dom'; // Import Outlet, useLocation, useNavigate
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  const { session, signOut, loading } = useSessionContext();
  const location = useLocation();
  const navigate = useNavigate();

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

  // Render welcome message if no specific sub-route is matched (e.g., if user navigates directly to /dashboard)
  const renderWelcomeContent = () => (
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

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <ResizablePanelGroup direction="horizontal" className="flex-grow">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={25}>
          <Sidebar />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={80}>
          {/* Outlet will render the matched nested route component */}
          <Outlet />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default Dashboard;