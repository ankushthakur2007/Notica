import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSessionContext } from '@/contexts/SessionContext';
import { showError } from '@/utils/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Note, Collaborator } from '@/types';
import { useNavigate } from 'react-router-dom';

// Define a type for the data fetched from the collaborators table
interface CollaboratorNote {
  note_id: string;
  permission_level: 'read' | 'write';
  notes: Note; // The nested note object
}

const SharedNoteList = () => {
  const { user } = useSessionContext();
  const navigate = useNavigate();

  const { data: sharedNotes, isLoading, isError, error, refetch } = useQuery<Note[], Error>({
    queryKey: ['sharedNotes', user?.id],
    queryFn: async () => {
      console.log('🔍 Starting shared notes fetch...');
      console.log('User ID:', user?.id);
      
      if (!user) {
        console.error('❌ User not logged in, cannot fetch shared notes.');
        throw new Error('User not logged in.');
      }

      try {
        console.log('📡 Making Supabase query for shared notes...');
        // Fetch entries from the 'collaborators' table where the current user is a collaborator
        // and join with the 'notes' table to get note details.
        const { data, error } = await supabase
          .from('collaborators')
          .select(`
            note_id,
            permission_level,
            notes(
              id,
              user_id,
              title,
              content,
              created_at,
              updated_at,
              is_sharable_link_enabled,
              sharable_link_permission_level
            )
          `)
          .eq('user_id', user.id);

        if (error) {
          console.error('❌ Supabase query error for shared notes:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }

        console.log('✅ Shared notes fetched successfully:', data?.length || 0, 'notes');
        // Map the fetched data to an array of Note objects, adding permission_level
        const notesWithPermissions: Note[] = data
          .filter((collabEntry: CollaboratorNote) => collabEntry.notes !== null) // Filter out null notes if any
          .map((collabEntry: CollaboratorNote) => ({
            ...collabEntry.notes,
            permission_level: collabEntry.permission_level, // Add permission level to the Note object
          }));
        
        return notesWithPermissions || [];
      } catch (fetchError: any) {
        console.error('❌ Fetch operation failed for shared notes:', {
          name: fetchError.name,
          message: fetchError.message,
          stack: fetchError.stack
        });
        
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
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading shared notes...</p>
      </div>
    );
  }

  if (isError) {
    console.error('❌ SharedNoteList error state:', error?.message);
    showError('Failed to load shared notes: ' + error?.message);
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
        <p className="mb-4">Error loading shared notes: {error?.message}</p>
        <button 
          onClick={() => refetch()} 
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!sharedNotes || sharedNotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <h2 className="text-2xl font-bold mb-2">No shared notes yet!</h2>
        <p className="text-muted-foreground">Notes shared with you will appear here.</p>
      </div>
    );
  }

  return (
    <div className="p-6 w-full max-w-4xl mx-auto overflow-y-auto h-full">
      <h2 className="text-3xl font-bold mb-6 text-foreground">Shared Notes</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sharedNotes.map((note) => (
          <Card 
            key={note.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer" 
            onClick={() => navigate(`/dashboard/edit-note/${note.id}`)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">{note.title}</CardTitle>
              {/* Display permission level for shared notes */}
              <Badge variant={note.permission_level === 'write' ? 'default' : 'secondary'} className="ml-2">
                {note.permission_level === 'write' ? 'Editable' : 'Read-Only'}
              </Badge>
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

export default SharedNoteList;