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
    let authSubscription: any; // To hold the subscription object

    const initializeSession = async () => {
      console.log('Initializing session...');
      // Explicitly fetch the session on initial load
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      setUser(initialSession?.user || null);
      setLoading(false); // Initial load complete

      // Set up the auth state change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        console.log('Supabase Auth Event:', event);
        console.log('Current Session:', currentSession);

        setSession(currentSession);
        setUser(currentSession?.user || null);

        const currentPath = location.pathname;
        const isPublicPath = currentPath === '/' || currentPath === '/login' || currentPath === '/try-now' || currentPath === '/privacy-policy' || currentPath === '/terms-of-service';
        const isProtectedPath = currentPath.startsWith('/dashboard') || currentPath.startsWith('/settings');

        if (currentSession) {
          // User is logged in
          const lastSignInDate = new Date(currentSession.user.last_sign_in_at || currentSession.user.created_at);
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

          if (lastSignInDate < oneMonthAgo) {
            console.log('User session too old, forcing sign out.');
            await supabase.auth.signOut();
            showError('Your session has expired. Please sign in again.');
            navigate('/login');
            return;
          }

          // Removed: if (event === 'SIGNED_IN') { showSuccess('Successfully signed in!'); }

          if (isPublicPath) {
            console.log('Navigating to /dashboard as user is logged in and on a public page.');
            navigate('/dashboard');
          }
        } else {
          // User is NOT logged in
          // Removed: if (event === 'SIGNED_OUT') { showSuccess('Successfully signed out!'); }
          if (isProtectedPath) {
            console.log('Navigating to /login as user is logged out and on a protected page.');
            navigate('/login');
          } else if (currentPath === '/') {
            console.log('Navigating to /try-now as user is logged out and on root.');
            navigate('/try-now');
          }
        }
      });
      authSubscription = subscription; // Store the subscription
    };

    initializeSession();

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe(); // Unsubscribe on cleanup
      }
    };
  }, [navigate, location.pathname]); // Dependencies remain the same

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