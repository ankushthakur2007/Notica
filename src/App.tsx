import React, { useEffect, useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import NotFound from "./pages/NotFound";

// Page imports
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SettingsDashboard from "./pages/SettingsDashboard";
import TryNow from "./pages/TryNow";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NoteEditorPage from "./pages/NoteEditorPage";
import MeetingIntelligencePage from "./pages/MeetingIntelligencePage";
import MeetingDetailsPage from "./pages/MeetingDetailsPage";

// Component imports
import NoteList from "./components/NoteList";
import SharedNoteList from "./components/SharedNoteList";
import { Loader2 } from "lucide-react";

// Zustand store and Supabase client
import { useAppStore } from './stores/appStore';
import { supabase } from './integrations/supabase/client';

const queryClient = new QueryClient();

// A layout for protected routes that redirects if the user is not logged in
const ProtectedLayout = () => {
    const session = useAppStore((state) => state.session);
    const location = useLocation();

    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};

// A layout for public routes that redirects if the user IS logged in
const PublicLayout = () => {
    const session = useAppStore((state) => state.session);

    if (session) {
        return <Navigate to="/dashboard/your-notes" replace />;
    }

    return <Outlet />;
};

const AppContent = () => {
  const { setSession, isLoadingSession, finishLoadingSession } = useAppStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
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
  }, [setSession, finishLoadingSession]);

  if (isLoadingSession || !isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes that redirect away if you are logged in */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<TryNow />} />
        <Route path="/login" element={<Login />} />
        <Route path="/try-now" element={<TryNow />} />
      </Route>

      {/* Protected routes that require authentication */}
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<Dashboard />}>
          <Route index element={<Navigate to="your-notes" replace />} />
          <Route path="your-notes" element={<NoteList />} />
          <Route path="shared-notes" element={<SharedNoteList />} />
          <Route path="meetings" element={<MeetingIntelligencePage />} />
          <Route path="settings" element={<SettingsDashboard />} />
          <Route path="edit-note/:noteId" element={<NoteEditorPage />} />
        </Route>
        <Route path="/meetings/:meetingId" element={<MeetingDetailsPage />} />
      </Route>

      {/* Static routes that are always accessible */}
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