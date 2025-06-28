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

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        if (currentSession) {
          showSuccess('Successfully signed in!');
          // Only navigate to dashboard if coming from login or root/try-now
          if (location.pathname === '/login' || location.pathname === '/' || location.pathname === '/try-now') {
            console.log('Navigating to /dashboard after successful sign-in.');
            navigate('/dashboard');
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        showSuccess('Successfully signed out!');
        console.log('Navigating to /login after sign-out.');
        navigate('/login');
      } else if (event === 'INITIAL_SESSION') {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        if (currentSession) {
          console.log('Initial session found. User is logged in.');
          // Only navigate to dashboard if coming from login or root/try-now
          if (location.pathname === '/login' || location.pathname === '/' || location.pathname === '/try-now') {
            console.log('Navigating to /dashboard from initial session.');
            navigate('/dashboard');
          }
        } else {
          console.log('No initial session found. User is not logged in.');
          // If no session and not on login or try-now, redirect to try-now
          if (location.pathname !== '/login' && location.pathname !== '/try-now') {
            console.log('Navigating to /try-now as no session found and not on login/try-now page.');
            navigate('/try-now');
          }
        }
      }
      setLoading(false);
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