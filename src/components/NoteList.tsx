import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSessionContext } from '@/contexts/SessionContext';
import { showError } from '@/utils/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge'; // Import Badge component
import { format } from 'date-fns';
import { Note } from '@/types';
import { useNavigate } from 'react-router-dom';

const NoteList = () => {
  const { user } = useSessionContext();
  const navigate = useNavigate();

  const { data: notes, isLoading, isError, error, refetch } = useQuery<Note[], Error>({
    queryKey: ['notes', user?.id],
    queryFn: async () => {
      console.log('🔍 Starting notes fetch...');
      console.log('User ID:', user?.id);
      
      if (!user) {
        console.error('❌ User not logged in, cannot fetch notes.');
        throw new Error('User not logged in.');
      }

      try {
        console.log('📡 Making Supabase query...');
        // Fetch notes owned by the user OR notes where the user is a collaborator
        // RLS policies on the 'notes' table will handle filtering based on ownership and collaboration.
        const { data, error } = await supabase
          .from('notes')
          .select(`
            *,
            collaborators!left(
              user_id,
              permission_level
            )
          `)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('❌ Supabase query error:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }

        console.log('✅ Notes fetched successfully:', data?.length || 0, 'notes');
        // Filter out duplicate notes if a note is both owned and collaborated on
        // The RLS should already handle this, but a client-side unique filter is a safe fallback
        const uniqueNotes = Array.from(new Map(data.map(item => [item.id, item])).values());
        return uniqueNotes || [];
      } catch (fetchError: any) {
        console.error('❌ Fetch operation failed:', {
          name: fetchError.name,
          message: fetchError.message,
          stack: fetchError.stack
        });
        
        // Provide more specific error messages
        if (fetchError.message?.includes('Failed to fetch')) {
          throw new Error('Network connection failed. Please check your internet connection and Supabase configuration.');
        } else if (fetchError.message?.includes('CORS')) {
          throw new Error('CORS error. Please check your Supabase project settings.');
        } else {
          throw fetchError;
        }
      }
    },
    enabled: !!user,
    retry: (failureCount, error) => {
      console.log(`🔄 Query retry attempt ${failureCount + 1}:`, error.message);
      return failureCount < 2; // Retry up to 2 times
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading notes...</p>
      </div>
    );
  }

  if (isError) {
    console.error('❌ NoteList error state:', error?.message);
    showError('Failed to load notes: ' + error?.message);
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
        <p className="mb-4">Error loading notes: {error?.message}</p>
        <button 
          onClick={() => refetch()} 
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!notes || notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <h2 className="text-2xl font-bold mb-2">No notes yet!</h2>
        <p className="text-muted-foreground">Start by creating your first note using the "New Note" button.</p>
      </div>
    );
  }

  return (
    <div className="p-6 w-full max-w-4xl mx-auto overflow-y-auto h-full">
      <h2 className="text-3xl font-bold mb-6 text-foreground">Your Notes</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {notes.map((note) => (
          <Card 
            key={note.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer" 
            onClick={() => navigate(`/dashboard/edit-note/${note.id}`)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">{note.title}</CardTitle>
              {user && note.user_id !== user.id && (
                <Badge variant="secondary" className="ml-2">Shared</Badge>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-3">{note.content ? 'Content available' : 'No content preview available.'}</p>
              <p className="text-xs text-gray-500">Created: {format(new Date(note.created_at), 'PPP')}</p>
              <p className="text-xs text-gray-500">Updated: {format(new Date(note.updated_at), 'PPP')}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default NoteList;