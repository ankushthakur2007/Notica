import React, { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
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
import { PlusCircle, Search } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const NoteList = () => {
  const { user, notes, isFetchingNotes, addNote } = useAppStore();
  const navigate = useNavigate();
  const [isCreateNoteDialogOpen, setIsCreateNoteDialogOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('Untitled Note');
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
      const newId = uuidv4();
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('notes')
        .insert({
          id: newId,
          user_id: user.id,
          title: newNoteTitle.trim(),
          content: '',
          created_at: now,
          updated_at: now,
          is_sharable_link_enabled: false,
          sharable_link_permission_level: 'read',
        })
        .select()
        .single();

      if (error) throw error;

      addNote(data); // Add to store for immediate UI update
      showSuccess('Note created successfully!');
      setIsCreateNoteDialogOpen(false);
      setNewNoteTitle('Untitled Note');
      navigate(`/dashboard/edit-note/${newId}`);
    } catch (error: any) {
      console.error('Error creating new note:', error);
      showError('Failed to create note: ' + error.message);
    } finally {
      setIsCreatingNote(false);
    }
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isFetchingNotes) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading your notes...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 w-full max-w-6xl mx-auto overflow-y-auto h-full animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '0.2s' }}>
      <div className="flex justify-between items-center mb-6 flex-col sm:flex-row gap-4">
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground self-start sm:self-center">Your Notes</h2>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full bg-card/50 dark:bg-gray-900/50 border-border/50 backdrop-blur-md"
            />
          </div>
          <Dialog open={isCreateNoteDialogOpen} onOpenChange={setIsCreateNoteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">New Note</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Note</DialogTitle>
                <DialogDescription>Enter a title for your new note.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="new-note-title" className="text-right">Title</Label>
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
      </div>
      
      {filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] p-4 text-center animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '0.4s' }}>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">{searchTerm ? 'No notes found' : 'No notes yet!'}</h2>
          <p className="text-muted-foreground">{searchTerm ? 'Try a different search term.' : 'Click "New Note" to get started.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note, index) => (
            <Card 
              key={note.id} 
              className="bg-card/50 dark:bg-gray-900/50 border border-border/50 backdrop-blur-md hover:border-primary/50 transition-all duration-300 cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => navigate(`/dashboard/edit-note/${note.id}`)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">{note.title}</CardTitle>
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