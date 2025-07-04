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
import { db, saveNoteToOfflineDb, getNotesForUserFromOfflineDb, OfflineNote } from '@/lib/offlineDb'; // Import offline DB functions
import { useOnlineStatus } from '@/hooks/use-online-status'; // Import useOnlineStatus

// Define a type for the data fetched from the collaborators table
interface CollaboratorNote {
  note_id: string;
  permission_level: 'read' | 'write';
  notes: Note; // The nested note object
}

const SharedNoteList = () => {
  const { user } = useSessionContext();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus(); // Get online status

  const { data: sharedNotes, isLoading, isError, error, refetch } = useQuery<Note[], Error>({
    queryKey: ['sharedNotes', user?.id],
    queryFn: async () => {
      console.log('🔍 Starting shared notes fetch...');
      console.log('User ID:', user?.id);
      
      if (!user) {
        console.error('❌ User not logged in, cannot fetch shared notes.');
        return [];
      }

      if (isOnline) {
        try {
          console.log('📡 Online: Making Supabase query for shared notes...');
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

          console.log('✅ Shared notes fetched successfully from Supabase:', data?.length || 0, 'notes');
          
          const notesWithPermissions: Note[] = data
            .filter((collabEntry: CollaboratorNote) => collabEntry.notes !== null)
            .map((collabEntry: CollaboratorNote) => ({
              ...collabEntry.notes,
              permission_level: collabEntry.permission_level,
            }));
          
          // Sync fetched shared notes to IndexedDB
          if (notesWithPermissions) {
            for (const note of notesWithPermissions) {
              // Shared notes are always 'synced' from the perspective of the local cache
              await saveNoteToOfflineDb(note, 'synced'); 
            }
          }
          return notesWithPermissions || [];
        } catch (fetchError: any) {
          console.error('❌ Online fetch operation failed for shared notes, attempting to load from offline cache:', fetchError);
          showError('Failed to load shared notes from cloud. Loading from local cache.');
          // Fallback to offline data if online fetch fails
          // For shared notes, we need to filter notes from offlineDb that are not owned by the user
          const allOfflineNotes = await getNotesForUserFromOfflineDb(user.id);
          // This is a simplification; a more robust solution would involve storing collaborator info in IndexedDB
          // For now, we'll just return all notes from offlineDb, which might include owned notes.
          // A proper shared notes offline view would require a separate IndexedDB table for shared notes or more complex filtering.
          return allOfflineNotes.filter(note => note.user_id !== user.id); // Basic filter to exclude owned notes
        }
      } else {
        console.log('📴 Offline: Loading shared notes from IndexedDB...');
        // When offline, we can only show notes that were previously synced.
        // This is a simplified approach. A full offline shared notes feature
        // would require caching collaborator data and permissions in IndexedDB.
        const allOfflineNotes = await getNotesForUserFromOfflineDb(user.id);
        return allOfflineNotes.filter(note => note.user_id !== user.id); // Filter out owned notes
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Cache data for 10 minutes
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
      <div className="flex flex-col items-center justify-center h-full p-4 text-center animate-in fade-in-0 duration-700 delay-100">
        <h2 className="text-2xl font-bold mb-2">No shared notes yet!</h2>
        <p className="text-muted-foreground">Notes shared with you will appear here.</p>
      </div>
    );
  }

  return (
    <div className="p-6 w-full max-w-4xl mx-auto overflow-y-auto h-full animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <h2 className="text-3xl font-bold mb-6 text-foreground">Shared Notes</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sharedNotes.map((note, index) => (
          <Card 
            key={note.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer animate-in fade-in-0 zoom-in-95 duration-300" 
            style={{ animationDelay: `${index * 50}ms` }} // Staggered animation
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