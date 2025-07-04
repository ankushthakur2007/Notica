import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useSessionContext } from '@/contexts/SessionContext';
import { db, getNotesBySyncStatus, saveNoteToOfflineDb, deleteNoteFromOfflineDb, OfflineNote } from '@/lib/offlineDb';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { useQueryClient } from '@tanstack/react-query';

interface SyncContextType {
  isSyncing: boolean;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const isOnline = useOnlineStatus();
  const { user, loading: userSessionLoading } = useSessionContext();
  const queryClient = useQueryClient();

  const syncNotes = useCallback(async () => {
    if (isSyncing || !user || !isOnline || userSessionLoading) {
      console.log('Sync skipped:', { isSyncing, user: !!user, isOnline, userSessionLoading });
      return;
    }

    setIsSyncing(true);
    const syncToastId = showLoading('Syncing notes with cloud...');
    console.log('Starting note synchronization...');

    try {
      // --- Phase 1: Push local changes to Supabase ---

      // 1. Sync pending_create notes
      const pendingCreates = await getNotesBySyncStatus('pending_create');
      for (const note of pendingCreates) {
        try {
          console.log(`Attempting to create note ${note.id} in Supabase...`);
          const { data, error } = await supabase
            .from('notes')
            .insert({
              id: note.id, // Use the locally generated ID
              user_id: note.user_id,
              title: note.title,
              content: note.content,
              created_at: note.created_at,
              updated_at: note.updated_at,
              is_sharable_link_enabled: note.is_sharable_link_enabled,
              sharable_link_permission_level: note.sharable_link_permission_level,
            })
            .select()
            .single();

          if (error) {
            console.error(`Error creating note ${note.id} in Supabase:`, error);
            showError(`Failed to create note "${note.title}": ${error.message}`);
            // Keep as pending_create if Supabase fails, will retry later
          } else {
            console.log(`Note ${note.id} created successfully in Supabase.`);
            await saveNoteToOfflineDb({ ...note, sync_status: 'synced' }, 'synced');
          }
        } catch (opError: any) {
          console.error(`Operation error during pending_create for note ${note.id}:`, opError);
          showError(`Error creating note "${note.title}": ${opError.message}`);
        }
      }

      // 2. Sync pending_update notes
      const pendingUpdates = await getNotesBySyncStatus('pending_update');
      for (const note of pendingUpdates) {
        try {
          console.log(`Attempting to update note ${note.id} in Supabase...`);
          const { error } = await supabase
            .from('notes')
            .update({
              title: note.title,
              content: note.content,
              updated_at: note.updated_at,
              is_sharable_link_enabled: note.is_sharable_link_enabled,
              sharable_link_permission_level: note.sharable_link_permission_level,
            })
            .eq('id', note.id)
            .eq('user_id', user.id); // Ensure only owner can update their own notes

          if (error) {
            console.error(`Error updating note ${note.id} in Supabase:`, error);
            showError(`Failed to update note "${note.title}": ${error.message}`);
            // Keep as pending_update if Supabase fails
          } else {
            console.log(`Note ${note.id} updated successfully in Supabase.`);
            await saveNoteToOfflineDb({ ...note, sync_status: 'synced' }, 'synced');
          }
        } catch (opError: any) {
          console.error(`Operation error during pending_update for note ${note.id}:`, opError);
          showError(`Error updating note "${note.title}": ${opError.message}`);
        }
      }

      // 3. Sync pending_delete notes
      const pendingDeletes = await getNotesBySyncStatus('pending_delete');
      for (const note of pendingDeletes) {
        try {
          console.log(`Attempting to delete note ${note.id} from Supabase...`);
          const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', note.id)
            .eq('user_id', user.id); // Ensure only owner can delete their own notes

          if (error) {
            console.error(`Error deleting note ${note.id} from Supabase:`, error);
            showError(`Failed to delete note "${note.title}": ${error.message}`);
            // Keep as pending_delete if Supabase fails
          } else {
            console.log(`Note ${note.id} deleted successfully from Supabase.`);
            await deleteNoteFromOfflineDb(note.id);
          }
        } catch (opError: any) {
          console.error(`Operation error during pending_delete for note ${note.id}:`, opError);
          showError(`Error deleting note "${note.title}": ${opError.message}`);
        }
      }

      // --- Phase 2: Pull remote changes from Supabase and update local cache ---
      console.log('Pulling latest notes from Supabase to refresh local cache...');
      const { data: remoteNotes, error: fetchError } = await supabase
        .from('notes')
        .select(`
          id,
          user_id,
          title,
          content,
          created_at,
          updated_at,
          is_sharable_link_enabled,
          sharable_link_permission_level,
          collaborators(
            user_id,
            permission_level
          )
        `); // Removed the .or() clause, relying on RLS

      if (fetchError) {
        console.error('Error fetching all notes from Supabase during pull sync:', fetchError);
        showError('Failed to refresh local notes from cloud: ' + fetchError.message);
      } else {
        const remoteNoteIds = new Set(remoteNotes.map(n => n.id));
        const localNotes = await db.notes.toArray();

        // Delete local notes that no longer exist remotely
        for (const localNote of localNotes) {
          if (!remoteNoteIds.has(localNote.id) && localNote.user_id === user.id) { // Only delete owned notes if not found remotely
            console.log(`Deleting local note ${localNote.id} as it no longer exists remotely.`);
            await deleteNoteFromOfflineDb(localNote.id);
          }
        }

        // Add/Update local notes with remote data
        for (const remoteNote of remoteNotes) {
          // Determine effective permission level for shared notes
          let effectivePermissionLevel: 'read' | 'write' = 'read';
          if (remoteNote.user_id === user.id) {
            effectivePermissionLevel = 'write'; // Owner always has write
          } else {
            const collaboratorEntry = remoteNote.collaborators.find((collab: any) => collab.user_id === user.id);
            if (collaboratorEntry) {
              effectivePermissionLevel = collaboratorEntry.permission_level;
            } else if (remoteNote.is_sharable_link_enabled && remoteNote.sharable_link_permission_level === 'write') {
              effectivePermissionLevel = 'write'; // Public write link
            }
          }

          const noteToSave: OfflineNote = {
            id: remoteNote.id,
            user_id: remoteNote.user_id,
            title: remoteNote.title,
            content: remoteNote.content,
            created_at: remoteNote.created_at,
            updated_at: remoteNote.updated_at,
            is_sharable_link_enabled: remoteNote.is_sharable_link_enabled,
            sharable_link_permission_level: remoteNote.sharable_link_permission_level,
            permission_level: effectivePermissionLevel, // Add this for shared notes
            sync_status: 'synced',
          };
          await saveNoteToOfflineDb(noteToSave, 'synced');
        }
        console.log('Local cache refreshed with latest remote data.');
      }

      dismissToast(syncToastId);
      showSuccess('Notes synced successfully!');
    } catch (error: any) {
      console.error('Overall sync process failed:', error);
      dismissToast(syncToastId);
      showError('Synchronization failed: ' + error.message);
    } finally {
      setIsSyncing(false);
      // Invalidate all relevant queries to ensure UI reflects latest data
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['sharedNotes'] });
      queryClient.invalidateQueries({ queryKey: ['note'] }); // Invalidate any open note
    }
  }, [isSyncing, user, isOnline, userSessionLoading, queryClient]);

  // Trigger sync when online status changes to online, or on initial load if already online
  useEffect(() => {
    if (isOnline && user && !userSessionLoading) {
      console.log('Online status detected or user session loaded, triggering sync...');
      syncNotes();
    }
  }, [isOnline, user, userSessionLoading, syncNotes]);

  return (
    <SyncContext.Provider value={{ isSyncing, triggerSync: syncNotes }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSyncContext = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSyncContext must be used within a SyncProvider');
  }
  return context;
};