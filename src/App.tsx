import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SettingsDashboard from "./pages/SettingsDashboard";
import NewNoteForm from "./components/NewNoteForm";
import NoteList from "./components/NoteList";
import NoteEditor from "./components/NoteEditor";
import { SessionContextProvider } from "./contexts/SessionContext";
import TryNow from "./pages/TryNow"; // Import the TryNow page

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner /> {/* Re-enabled Sonner for toast notifications */}
      <BrowserRouter>
        <SessionContextProvider>
          <Routes>
            <Route path="/" element={<TryNow />} /> {/* Set TryNow as the landing page */}
            <Route path="/login" element={<Login />} />
            <Route path="/try-now" element={<TryNow />} />
            
            {/* Dashboard and its nested routes */}
            <Route path="/dashboard" element={<Dashboard />}>
              {/* NoteList now handles its own navigation */}
              <Route index element={<NoteList />} />
              <Route path="all-notes" element={<NoteList />} />
              <Route path="new-note" element={<NewNoteForm onNoteCreated={() => { /* Handle post-creation navigation */ }} />} />
              {/* NoteEditor now handles its own closing navigation */}
              <Route path="edit-note/:noteId" element={<NoteEditor />} /> {/* Removed unnecessary onClose prop */}
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