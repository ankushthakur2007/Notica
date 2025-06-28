import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider = ({ children }: { ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Supabase Auth Event:', event);
      console.log('Current Session:', currentSession);

      setSession(currentSession);
      setUser(currentSession?.user || null);
      setLoading(false); // Set loading to false after initial session check

      const currentPath = location.pathname;
      const isPublicPath = currentPath === '/' || currentPath === '/login' || currentPath === '/try-now' || currentPath === '/privacy-policy' || currentPath === '/terms-of-service';
      const isProtectedPath = currentPath.startsWith('/dashboard') || currentPath.startsWith('/settings');

      if (currentSession) {
        // User is logged in
        if (event === 'SIGNED_IN') { // Only show success toast on explicit sign-in, not initial session load
          showSuccess('Successfully signed in!');
        }
        if (isPublicPath) {
          console.log('Navigating to /dashboard as user is logged in and on a public page.');
          navigate('/dashboard');
        }
        // If already on a protected path, do nothing (stay there)
      } else {
        // User is NOT logged in
        if (event === 'SIGNED_OUT') {
          showSuccess('Successfully signed out!');
        }
        if (isProtectedPath) {
          console.log('Navigating to /login as user is logged out and on a protected page.');
          navigate('/login'); // Redirect to login if trying to access protected route
        } else if (!isPublicPath) {
          // If not logged in and not on a public path, and not a protected path (e.g., 404 or other unknown),
          // redirect to try-now as the default landing for unauthenticated users.
          console.log('Navigating to /try-now as user is logged out and on an unrecognized/non-public page.');
          navigate('/try-now');
        }
        // If already on a public path, do nothing (stay there)
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Error signing out: ' + error.message);
    }
  };

  return (
    <SessionContext.Provider value={{ session, user, signOut, loading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSessionContext = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSessionContext must be used within a SessionContextProvider');
  }
  return context;
};