import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";

// Directly import main page components
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SettingsDashboard from "./pages/SettingsDashboard";
import TryNow from "./pages/TryNow";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

// Import components for nested dashboard routes
import NewNoteForm from "./components/NewNoteForm"; // Re-added
import NoteList from "./components/NoteList";
import NoteEditor from "./components/NoteEditor";

// Import SessionContextProvider and useSessionContext
import { SessionContextProvider, useSessionContext } from "./contexts/SessionContext";

const queryClient = new QueryClient();

// New component to handle loading state
const AppContent = () => {
  const { loading } = useSessionContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Loading application...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<TryNow />} />
      <Route path="/login" element={<Login />} />
      <Route path="/try-now" element={<TryNow />} />
      
      {/* Dashboard and its nested routes */}
      <Route path="/dashboard" element={<Dashboard />}>
        <Route path="new-note" element={<NewNoteForm />} /> {/* Re-added */}
        <Route path="all-notes" element={<NoteList />} />
        <Route path="edit-note/:noteId" element={<NoteEditor />} />
      </Route>

      <Route path="/settings" element={<SettingsDashboard />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <AppContent /> {/* Render AppContent inside SessionContextProvider */}
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;