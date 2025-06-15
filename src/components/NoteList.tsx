import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSessionContext } from '@/contexts/SessionContext';
import { showError } => '@/utils/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Note } from '@/types';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const NoteList = () => { // Removed onSelectNote prop
  const { user } = useSessionContext();
  const navigate = useNavigate(); // Initialize useNavigate

  const { data: notes, isLoading, isError, error, refetch } = useQuery<Note[], Error>({
    queryKey: ['notes', user?.id],
    queryFn: async () => {
      if (!user) {
        throw new Error('User not logged in.');
      }
      // RLS policies on the 'notes' table will automatically filter notes
      // to only show those owned by the user or shared with them.
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }
      return data;
    },
    enabled: !!user, // Only run query if user is available
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading notes...</p>
      </div>
    );
  }

  if (isError) {
    showError('Failed to load notes: ' + error?.message);
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        <p>Error loading notes. Please try again.</p>
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
            onClick={() => navigate(`/dashboard/edit-note/${note.id}`)} // Navigate to editor
          >
            <CardHeader>
              <CardTitle className="text-lg">{note.title}</CardTitle>
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