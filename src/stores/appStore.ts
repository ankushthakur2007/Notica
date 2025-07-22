import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { Note } from '@/types';

// Define the interface for the store's state
export interface AppState {
  session: Session | null;
  user: User | null;
  isLoadingSession: boolean;
  notes: Note[];
  sharedNotes: Note[];
  isFetchingNotes: boolean;
}

// Define the interface for the store's actions
export interface AppActions {
  setSession: (session: Session | null) => void;
  setNotes: (notes: Note[]) => void;
  setSharedNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNote: (updatedNote: Note) => void;
  deleteNote: (noteId: string) => void;
  startLoadingSession: () => void;
  finishLoadingSession: () => void;
  startFetchingNotes: () => void;
  finishFetchingNotes: () => void;
  signOut: () => void;
}

// Create the store by combining state and actions
export const useAppStore = create<AppState & AppActions>((set) => ({
  // Initial State
  session: null,
  user: null,
  isLoadingSession: true,
  notes: [],
  sharedNotes: [],
  isFetchingNotes: false,

  // Actions
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setNotes: (notes) => set({ notes }),
  setSharedNotes: (notes) => set({ sharedNotes: notes }),
  addNote: (note) => set((state) => ({ notes: [note, ...state.notes].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()) })),
  updateNote: (updatedNote) => set((state) => ({
    notes: state.notes.map((note) =>
      note.id === updatedNote.id ? updatedNote : note
    ),
  })),
  deleteNote: (noteId) => set((state) => ({
    notes: state.notes.filter((note) => note.id !== noteId),
  })),
  startLoadingSession: () => set({ isLoadingSession: true }),
  finishLoadingSession: () => set({ isLoadingSession: false }),
  startFetchingNotes: () => set({ isFetchingNotes: true }),
  finishFetchingNotes: () => set({ isFetchingNotes: false }),
  signOut: () => set({ session: null, user: null, notes: [], sharedNotes: [] }),
}));