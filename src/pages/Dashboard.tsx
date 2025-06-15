import React from 'react';
import { Button } from '@/components/ui/button';
import { useSessionContext } from '@/contexts/SessionContext';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { ThemeToggle } from '@/components/ThemeToggle';

const Dashboard = () => {
  const { session, signOut } = useSessionContext();

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Loading user session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to Notica, {session.user?.email}!</h1>
        <p className="text-xl text-muted-foreground">Your personal voice-powered note-taking assistant.</p>
        <Button onClick={signOut} className="mt-6">
          Sign Out
        </Button>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Dashboard;