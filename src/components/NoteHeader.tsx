import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, MoreVertical, ChevronLeft, Share2, Download, FileType, FileText, Copy } from 'lucide-react';
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import NoteCollaborationDialog from '@/components/NoteCollaborationDialog';
import RenameNoteDialog from '@/components/RenameNoteDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Note } from '@/types';
import { User } from '@supabase/supabase-js';
import PresenceAvatars from './PresenceAvatars';
import { PresentUser } from '@/hooks/use-presence';
import { exportAsPdf, exportAsPlainText, copyToClipboard } from '@/utils/export';
import { showError } from '@/utils/toast';

interface NoteHeaderProps {
  noteId: string | undefined;
  note: Note | undefined;
  user: User | null;
  isNewNote: boolean;
  isNoteOwner: boolean;
  canEdit: boolean;
  title: string;
  currentTitleInput?: string;
  setCurrentTitleInput?: (title: string) => void;
  onSaveNote?: (title: string, content: string) => Promise<void>;
  onDeleteNote: () => Promise<void>;
  isDeleting: boolean;
  onRenameNote: (newTitle: string) => void;
  onToggleShareableLink: (checked: boolean, permissionLevel: 'read' | 'write') => Promise<void>;
  editorContent?: string;
  onNavigateToYourNotes: () => void;
  presentUsers: PresentUser[];
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
  presentUsers,
}: NoteHeaderProps) => {
  const isMobileView = useIsMobile();

  const handleExport = (format: 'pdf' | 'txt' | 'clipboard') => {
    if (!editorContent || editorContent === '<p></p>') {
      showError("There is no content to export.");
      return;
    }
    switch (format) {
      case 'pdf':
        exportAsPdf(title, editorContent);
        break;
      case 'txt':
        exportAsPlainText(title, editorContent);
        break;
      case 'clipboard':
        copyToClipboard(editorContent);
        break;
    }
  };

  const ExportMenuItems = () => (
    <>
      <DropdownMenuItem onSelect={() => handleExport('pdf')}>
        <FileType className="mr-2 h-4 w-4" />
        <span>Export as PDF</span>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => handleExport('txt')}>
        <FileText className="mr-2 h-4 w-4" />
        <span>Export as Plain Text</span>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => handleExport('clipboard')}>
        <Copy className="mr-2 h-4 w-4" />
        <span>Copy Content</span>
      </DropdownMenuItem>
    </>
  );

  if (isMobileView) {
    return (
      <div className="flex justify-between items-center">
        <Button variant="ghost" size="icon" onClick={onNavigateToYourNotes}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        
        <RenameNoteDialog currentTitle={title} onRename={onRenameNote}>
          <div className="flex-1 text-center mx-2 cursor-pointer">
            <h1 className="text-lg font-bold truncate">{title}</h1>
            <p className="text-xs text-muted-foreground">Tap to rename</p>
          </div>
        </RenameNoteDialog>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {noteId && note && user && !isNewNote && (
              <NoteCollaborationDialog 
                noteId={noteId} 
                isNoteOwner={isNoteOwner} 
                isSharableLinkEnabled={note.is_sharable_link_enabled}
                sharableLinkPermissionLevel={note.sharable_link_permission_level || 'read'}
                onToggleShareableLink={onToggleShareableLink}
              >
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Share2 className="mr-2 h-4 w-4" />
                  <span>Share</span>
                </DropdownMenuItem>
              </NoteCollaborationDialog>
            )}
            <DropdownMenuSeparator />
            <ExportMenuItems />
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem disabled={isDeleting || !isNoteOwner} className="text-destructive" onSelect={(e) => e.preventDefault()}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action is permanent and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDeleteNote}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center mb-4">
      <Input
        className="text-2xl font-bold border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
        value={currentTitleInput}
        onChange={(e) => setCurrentTitleInput?.(e.target.value)}
        onBlur={() => onSaveNote?.(currentTitleInput!, editorContent!)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSaveNote?.(currentTitleInput!, editorContent!);
            e.currentTarget.blur();
          }
        }}
        placeholder="Note Title"
        disabled={!canEdit}
      />
      
      <div className="flex items-center space-x-2">
        <PresenceAvatars users={presentUsers} selfId={user?.id} />
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
            <Button variant="outline">Rename</Button>
          </RenameNoteDialog>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <ExportMenuItems />
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isDeleting || !isNoteOwner}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Note
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
        <Button variant="outline" onClick={onNavigateToYourNotes}>Close</Button>
      </div>
    </div>
  );
};

export default NoteHeader;