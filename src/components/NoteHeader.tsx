import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Cloud, Trash2, MoreHorizontal } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NoteCollaborationDialog from '@/components/NoteCollaborationDialog';
import RenameNoteDialog from '@/components/RenameNoteDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Note } from '@/types';
import { User } from '@supabase/supabase-js';

interface NoteHeaderProps {
  noteId: string | undefined;
  note: Note | undefined;
  user: User | null;
  isNewNote: boolean;
  isNoteOwner: boolean;
  canEdit: boolean;
  title: string;
  currentTitleInput: string;
  setCurrentTitleInput: (title: string) => void;
  onSaveNote: (title: string, content: string) => Promise<void>;
  onDeleteNote: () => Promise<void>;
  isDeleting: boolean;
  onRenameNote: (newTitle: string) => void;
  onToggleShareableLink: (checked: boolean, permissionLevel: 'read' | 'write') => Promise<void>;
  editorContent: string; // Pass editor content for saving
  onNavigateToYourNotes: () => void; // Callback to navigate back
}

const NoteHeader = ({
  noteId,
  note,
  user,
  isNewNote,
  isNoteOwner,
  canEdit,
  title,
  currentTitleInput,
  setCurrentTitleInput,
  onSaveNote,
  onDeleteNote,
  isDeleting,
  onRenameNote,
  onToggleShareableLink,
  editorContent,
  onNavigateToYourNotes,
}: NoteHeaderProps) => {
  const isMobileView = useIsMobile();

  return (
    <div className={`flex ${isMobileView ? 'flex-col space-y-3' : 'justify-between items-center'} mb-4`}>
      <Input
        className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold border-none focus-visible:ring-0 focus-visible:ring-offset-0`}
        value={currentTitleInput}
        onChange={(e) => setCurrentTitleInput(e.target.value)}
        onBlur={() => onSaveNote(currentTitleInput, editorContent)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSaveNote(currentTitleInput, editorContent);
            e.currentTarget.blur();
          }
        }}
        placeholder="Note Title"
        disabled={!canEdit}
      />
      
      <div className={`flex ${isMobileView ? 'flex-col space-y-2' : 'space-x-2'}`}>
        <Button 
          onClick={() => onSaveNote(currentTitleInput, editorContent)} 
          disabled={!user || !canEdit}
        >
          <Cloud className="mr-2 h-4 w-4" />
          Save Note
        </Button>

        {isMobileView ? (
          <>
            <div className="flex space-x-2">
              {noteId && note && user && !isNewNote && (
                <NoteCollaborationDialog 
                  noteId={noteId} 
                  isNoteOwner={isNoteOwner} 
                  isSharableLinkEnabled={note.is_sharable_link_enabled}
                  sharableLinkPermissionLevel={note.sharable_link_permission_level || 'read'}
                  onToggleShareableLink={onToggleShareableLink}
                />
              )}
            </div>
            <div className="flex space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && !isNewNote && (
                    <RenameNoteDialog currentTitle={title} onRename={onRenameNote}>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        Rename
                      </DropdownMenuItem>
                    </RenameNoteDialog>
                  )}
                  <DropdownMenuItem onClick={onNavigateToYourNotes}>
                    Close
                  </DropdownMenuItem>
                  {isNoteOwner && (
                    <DropdownMenuItem onClick={onDeleteNote} disabled={isDeleting} className="text-destructive">
                      {isDeleting ? 'Deleting...' : 'Delete Note'}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        ) : (
          <>
            {noteId && note && user && !isNewNote && (
              <NoteCollaborationDialog 
                noteId={noteId} 
                isNoteOwner={isNoteOwner} 
                isSharableLinkEnabled={note.is_sharable_link_enabled}
                sharableLinkPermissionLevel={note.sharable_link_permission_level || 'read'}
                onToggleShareableLink={onToggleShareableLink}
              />
            )}
            {canEdit && !isNewNote && (
              <RenameNoteDialog currentTitle={title} onRename={onRenameNote}>
                <Button variant="outline">
                  Rename
                </Button>
              </RenameNoteDialog>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting || !isNoteOwner}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Deleting...' : 'Delete Note'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your note
                    and remove its data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDeleteNote}>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" onClick={onNavigateToYourNotes}>
              Close
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default NoteHeader;