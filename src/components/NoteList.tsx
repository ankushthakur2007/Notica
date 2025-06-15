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
      console.log('Attempting to fetch notes for user:', user?.id); // Debug log
      if (!user) {
        console.error('NoteList: User not logged in, cannot fetch notes.'); // Debug log
        throw new Error('User not logged in.');
      }
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('NoteList: Error fetching notes from Supabase:', error.message, error); // Debug log
        throw error;
      }
      console.log('NoteList: Successfully fetched notes:', data); // Debug log
      return data;
    },
    enabled: !!user,
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