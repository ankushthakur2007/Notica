import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound"; // Keep NotFound as direct import or lazy load if it's large

// Lazy load main page components to enable code-splitting
const Login = React.lazy(() => import("./pages/Login"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const SettingsDashboard = React.lazy(() => import("./pages/SettingsDashboard"));
const TryNow = React.lazy(() => import("./pages/TryNow"));
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = React.lazy(() => import("./pages/TermsOfService"));

// Note: NewNoteForm, NoteList, NoteEditor are nested within Dashboard,
// so their loading will be handled when Dashboard is loaded or when they are rendered.
// For now, we'll focus on the top-level routes.

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
            Loading application...
          </div>
        }>
          <Routes>
            <Route path="/" element={<TryNow />} />
            <Route path="/login" element={<Login />} />
            <Route path="/try-now" element={<TryNow />} />
            
            {/* Dashboard and its nested routes */}
            <Route path="/dashboard/*" element={<Dashboard />} /> {/* Use /* for nested routes */}

            <Route path="/settings" element={<SettingsDashboard />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;