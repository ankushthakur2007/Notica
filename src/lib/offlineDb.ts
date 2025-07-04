import Dexie, { Table } from 'dexie';
import { Note } from '@/types';

// Extend the Note interface to include a sync_status for offline tracking
export interface OfflineNote extends Note {
  sync_status: 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';
}

class NoticaDatabase extends Dexie {
  notes!: Table<OfflineNote, string>; // 'id' is the primary key

  constructor() {
    super('NoticaDatabase');
    this.version(1).stores({
      notes: 'id, user_id, updated_at, sync_status', // Indexed properties for efficient queries
    });
  }
}

export const db = new NoticaDatabase();

/**
 * Saves a note to IndexedDB. If the note already exists, it updates it.
 * If it's a new note, it adds it.
 * @param note The note object to save.
 * @param status The sync status to assign to the note.
 */
export async function saveNoteToOfflineDb(note: Note, status: OfflineNote['sync_status'] = 'synced'): Promise<void> {
  const offlineNote: OfflineNote = { ...note, sync_status: status };
  await db.notes.put(offlineNote);
  console.log(`Note ${note.id} saved to IndexedDB with status: ${status}`);
}

/**
 * Retrieves a note from IndexedDB by its ID.
 * @param id The ID of the note.
 * @returns The note if found, otherwise null.
 */
export async function getNoteFromOfflineDb(id: string): Promise<OfflineNote | undefined> {
  return await db.notes.get(id);
}

/**
 * Retrieves all notes for a specific user from IndexedDB.
 * @param userId The ID of the user.
 * @returns An array of notes.
 */
export async function getNotesForUserFromOfflineDb(userId: string): Promise<OfflineNote[]> {
  return await db.notes.where('user_id').equals(userId).toArray();
}

/**
 * Deletes a note from IndexedDB.
 * @param id The ID of the note to delete.
 */
export async function deleteNoteFromOfflineDb(id: string): Promise<void> {
  await db.notes.delete(id);
  console.log(`Note ${id} deleted from IndexedDB.`);
}

/**
 * Retrieves all notes with a specific sync status.
 * @param status The sync status to filter by.
 * @returns An array of notes.
 */
export async function getNotesBySyncStatus(status: OfflineNote['sync_status']): Promise<OfflineNote[]> {
  return await db.notes.where('sync_status').equals(status).toArray();
}

/**
 * Clears all notes from IndexedDB.
 */
export async function clearOfflineNotes(): Promise<void> {
  await db.notes.clear();
  console.log('All notes cleared from IndexedDB.');
}