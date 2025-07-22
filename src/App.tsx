import React, { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import NotFound from "./pages/NotFound";

// Page imports
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SettingsDashboard from "./pages/SettingsDashboard";
import TryNow from "./pages/TryNow";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NoteEditorPage from "./pages/NoteEditorPage";

// Component imports
import NoteList from "./components/NoteList";
import SharedNoteList from "./components/SharedNoteList";

// Zustand store and Supabase client
import { useAppStore } from './stores/appStore';
import { supabase } from './integrations/supabase/client';

const queryClient = new QueryClient();

// Component to handle protected routes
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const session = useAppStore((state) => state.session);
    const isLoadingSession = useAppStore((state) => state.isLoadingSession);
    const location = useLocation();

    if (isLoadingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <p>Loading application...</p>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

const AppContent = () => {
  const { session, setSession, startLoadingSession, finishLoadingSession } = useAppStore();

  useEffect(() => {
    startLoadingSession();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      finishLoadingSession();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event !== 'INITIAL_SESSION') {
        finishLoadingSession();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, startLoadingSession, finishLoadingSession]);

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/dashboard/your-notes" /> : <Login />} />
      <Route path="/" element={session ? <Navigate to="/dashboard/your-notes" /> : <TryNow />} />
      <Route path="/try-now" element={session ? <Navigate to="/dashboard/your-notes" /> : <TryNow />} />
      
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}>
        <Route index element={<Navigate to="your-notes" replace />} />
        <Route path="your-notes" element={<NoteList />} />
        <Route path="shared-notes" element={<SharedNoteList />} />
      </Route>

      <Route path="/dashboard/edit-note/:noteId" element={<ProtectedRoute><NoteEditorPage /></ProtectedRoute>} />

      <Route path="/settings" element={<ProtectedRoute><SettingsDashboard /></ProtectedRoute>} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AppContent /> 
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;