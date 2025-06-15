import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SettingsDashboard from "./pages/SettingsDashboard";
import NewNoteForm from "./components/NewNoteForm"; // Import NewNoteForm
import NoteList from "./components/NoteList"; // Import NoteList
import NoteEditor from "./components/NoteEditor"; // Import NoteEditor
import { SessionContextProvider } from "./contexts/SessionContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            
            {/* Dashboard and its nested routes */}
            <Route path="/dashboard" element={<Dashboard />}>
              <Route index element={<NoteList onSelectNote={(noteId) => { /* Handle navigation to editor */ }} />} /> {/* Default dashboard view */}
              <Route path="all-notes" element={<NoteList onSelectNote={(noteId) => { /* Handle navigation to editor */ }} />} />
              <Route path="new-note" element={<NewNoteForm onNoteCreated={() => { /* Handle post-creation navigation */ }} />} />
              <Route path="edit-note/:noteId" element={<NoteEditor onClose={() => { /* Handle close editor navigation */ }} />} />
            </Route>

            <Route path="/settings" element={<SettingsDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;