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

export const SessionContextProvider = ({ children }: { children: ReactNode }) => {
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
        const lastSignInDate = new Date(currentSession.user.last_sign_in_at || currentSession.user.created_at); // Fallback to created_at if last_sign_in_at is null
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        if (lastSignInDate < oneMonthAgo) {
          console.log('User session too old, forcing sign out.');
          await supabase.auth.signOut(); // Force sign out
          showError('Your session has expired. Please sign in again.');
          navigate('/login'); // Redirect to login after forced sign out
          return; // Stop further processing
        }

        if (event === 'SIGNED_IN') {
          showSuccess('Successfully signed in!');
        }

        // If user is logged in and on a public path, redirect to dashboard
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
        // If trying to access a protected path while logged out, redirect to login
        if (isProtectedPath) {
          console.log('Navigating to /login as user is logged out and on a protected page.');
          navigate('/login');
        } else if (currentPath === '/') {
          // If on the root path and logged out, redirect to try-now
          console.log('Navigating to /try-now as user is logged out and on root.');
          navigate('/try-now');
        }
        // For other public paths (e.g., /try-now, /privacy-policy, /terms-of-service), stay there.
        // For 404s, NotFound component handles it.
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