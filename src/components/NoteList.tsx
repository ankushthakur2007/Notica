import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSessionContext } from '@/contexts/SessionContext';
import { showError, showSuccess } from '@/utils/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Note } from '@/types';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for local note IDs
import { db, getNotesForUserFromOfflineDb, saveNoteToOfflineDb, OfflineNote } from '@/lib/offlineDb'; // Import offline DB functions
import { useOnlineStatus } from '@/hooks/use-online-status'; // Import useOnlineStatus

const NoteList = () => {
  const { user } = useSessionContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus(); // Get online status

  const [isCreateNoteDialogOpen, setIsCreateNoteDialogOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('Untitled Note');
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const { data: notes, isLoading, isError, error, refetch } = useQuery<Note[], Error>({
    queryKey: ['notes', user?.id],
    queryFn: async () => {
      console.log('🔍 Starting notes fetch...');
      console.log('User ID:', user?.id);
      
      if (!user) {
        console.error('❌ User not logged in, cannot fetch notes.');
        // If offline and no user, or user logs out, return empty array
        return [];
      }

      if (isOnline) {
        try {
          console.log('📡 Online: Fetching owned notes from Supabase...');
          const { data, error } = await supabase
            .from('notes')
            .select(`*`)
            .eq('user_id', user.id)
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

          console.log('✅ Owned notes fetched successfully from Supabase:', data?.length || 0, 'notes');
          
          // Sync fetched notes to IndexedDB
          if (data) {
            for (const note of data) {
              await saveNoteToOfflineDb(note, 'synced');
            }
          }
          return data || [];
        } catch (fetchError: any) {
          console.error('❌ Online fetch operation failed, attempting to load from offline cache:', fetchError);
          showError('Failed to load notes from cloud. Loading from local cache.');
          // Fallback to offline data if online fetch fails
          return await getNotesForUserFromOfflineDb(user.id);
        }
      } else {
        console.log('📴 Offline: Loading notes from IndexedDB...');
        return await getNotesForUserFromOfflineDb(user.id);
      }
    },
    enabled: !!user,
    retry: (failureCount, error) => {
      console.log(`🔄 Query retry attempt ${failureCount + 1}:`, error.message);
      return failureCount < 2; // Retry up to 2 times
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const handleCreateNewNote = async () => {
    if (!user) {
      showError('You must be logged in to create notes.');
      return;
    }
    if (newNoteTitle.trim() === '') {
      showError('Note title cannot be empty.');
      return;
    }

    setIsCreatingNote(true);
    try {
      const newId = uuidv4(); // Generate a local UUID for the new note
      const now = new Date().toISOString();
      const newNote: OfflineNote = {
        id: newId,
        user_id: user.id,
        title: newNoteTitle.trim(),
        content: '',
        created_at: now,
        updated_at: now,
        is_sharable_link_enabled: false,
        sharable_link_permission_level: 'read',
        sync_status: 'pending_create', // Mark as pending creation
      };

      await saveNoteToOfflineDb(newNote, 'pending_create');
      showSuccess('Note created locally!');
      queryClient.invalidateQueries({ queryKey: ['notes'] }); // Invalidate to refresh the list
      setIsCreateNoteDialogOpen(false); // Close the dialog
      setNewNoteTitle('Untitled Note'); // Reset title for next time
      navigate(`/dashboard/edit-note/${newId}`); // Navigate to the new note's editor
    } catch (error: any) {
      console.error('Error creating new note locally:', error);
      showError('Failed to create note: ' + error.message);
    } finally {
      setIsCreatingNote(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading your notes...</p>
      </div>
    );
  }

  if (isError) {
    console.error('❌ NoteList error state:', error?.message);
    showError('Failed to load your notes: ' + error?.message);
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
        <p className="mb-4">Error loading your notes: {error?.message}</p>
        <button 
          onClick={() => refetch()} 
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 w-full max-w-4xl mx-auto overflow-y-auto h-full animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-foreground">Your Notes</h2>
        <Dialog open={isCreateNoteDialogOpen} onOpenChange={setIsCreateNoteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Note
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Note</DialogTitle>
              <DialogDescription>
                Enter a title for your new note.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-note-title" className="text-right">
                  Title
                </Label>
                <Input
                  id="new-note-title"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="col-span-3"
                  placeholder="Untitled Note"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateNewNote();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateNoteDialogOpen(false)}>Cancel</Button>
              <Button type="submit" onClick={handleCreateNewNote} disabled={isCreatingNote}>
                {isCreatingNote ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {!notes || notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] p-4 text-center animate-in fade-in-0 duration-700 delay-100">
          <h2 className="text-2xl font-bold mb-2">No notes yet!</h2>
          <p className="text-muted-foreground">Click "Create New Note" to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((note, index) => (
            <Card 
              key={note.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer animate-in fade-in-0 zoom-in-95 duration-300" 
              style={{ animationDelay: `${index * 50}ms` }} // Staggered animation
              onClick={() => navigate(`/dashboard/edit-note/${note.id}`)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">{note.title}</CardTitle>
                {note.sync_status && note.sync_status !== 'synced' && (
                  <Badge variant="secondary" className="ml-2">
                    {note.sync_status === 'pending_create' ? 'New (Offline)' : 'Unsynced Changes'}
                  </Badge>
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
      )}
    </div>
  );
};

export default NoteList;