import React, { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Note } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { ImageIcon, Bold, Italic, Underline as UnderlineIcon, Code, List, ListOrdered, Quote, Minus, Undo, Redo, Heading1, Heading2, AlignLeft, AlignCenter, AlignRight, AlignJustify, Palette, Highlighter, Trash2, Sparkles, Share2, Download } from 'lucide-react';
import { useSessionContext } from '@/contexts/SessionContext';
import { useNavigate, useParams } from 'react-router-dom';
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
import VoiceRecorder from '@/components/VoiceRecorder';
import ShareNoteDialog from '@/components/ShareNoteDialog'; // Import the new component

interface NoteEditorProps {} 

const NoteEditor = ({}: NoteEditorProps) => {
  const queryClient = useQueryClient();
  const { user, session } = useSessionContext(); // Get session here
  const navigate = useNavigate();
  const { noteId } = useParams<{ noteId: string }>();

  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefiningAI, setIsRefiningAI] = useState(false);
  const [canEdit, setCanEdit] = useState(false); // New state for edit permission

  const { data: note, isLoading, isError, error } = useQuery<Note, Error>({
    queryKey: ['note', noteId],
    queryFn: async () => {
      if (!user) {
        throw new Error('User not logged in.');
      }
      if (!noteId) {
        throw new Error('Note ID is missing.');
      }
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (error) {
        throw error;
      }
      return data;
    },
    enabled: !!user && !!noteId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  // Fetch permission level for the current user on this note
  const { data: permissionData, isLoading: isLoadingPermission } = useQuery<{ permission_level: 'read' | 'write' } | null, Error>({
    queryKey: ['notePermission', noteId, user?.id],
    queryFn: async () => {
      if (!user || !noteId) return null;

      // If current user is the owner, they have write access
      if (note && note.user_id === user.id) {
        return { permission_level: 'write' };
      }

      // Otherwise, check collaborators table
      const { data, error } = await supabase
        .from('collaborators')
        .select('permission_level')
        .eq('note_id', noteId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
        console.error('Error fetching collaboration permission:', error.message);
        return null;
      }
      return data;
    },
    enabled: !!user && !!noteId && !!note, // Only run if user, noteId, and note data are available
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (note && user && !isLoadingPermission) {
      if (note.user_id === user.id) {
        setCanEdit(true); // Owner always has write access
      } else if (permissionData?.permission_level === 'write') {
        setCanEdit(true); // Collaborator with write access
      } else {
        setCanEdit(false); // Read-only or no permission
      }
    }
  }, [note, user, permissionData, isLoadingPermission]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Placeholder.configure({
        placeholder: 'Start typing your note content here...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none p-4 min-h-[300px] border rounded-md bg-background text-foreground',
      },
      handleDrop: (view, event, slice, moved) => {
        if (!canEdit) return false; // Prevent drop if not editable
        if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            handleImageUpload(file);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event, slice) => {
        if (!canEdit) return false; // Prevent paste if not editable
        if (event.clipboardData?.files && event.clipboardData.files[0]) {
          const file = event.clipboardData.files[0];
          if (file.type.startsWith('image/')) {
            handleImageUpload(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor && note) {
      setTitle(note.title);
      editor.commands.setContent(note.content || '');
    }
  }, [editor, note]);

  useEffect(() => {
    if (isError) {
      showError('Failed to load note: ' + error?.message);
      navigate('/dashboard/all-notes');
    }
  }, [isError, error, navigate]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!user) {
      showError('You must be logged in to upload images.');
      return;
    }
    if (!canEdit) {
      showError('You do not have permission to upload images to this note.');
      return;
    }

    setIsUploadingImage(true);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${user.id}/${uuidv4()}.${fileExtension}`;
    
    try {
      const { data, error } = await supabase.storage
        .from('note-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from('note-images')
        .getPublicUrl(fileName);

      if (publicUrlData?.publicUrl) {
        editor?.chain().focus().setImage({ src: publicUrlData.publicUrl }).run();
        showSuccess('Image uploaded successfully!');
      } else {
        throw new Error('Failed to get public URL for image.');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      showError('Failed to upload image: ' + error.message);
    } finally {
      setIsUploadingImage(false);
    }
  }, [user, editor, canEdit]);

  const handleSave = async () => {
    if (!note || !editor) return;
    if (!canEdit) {
      showError('You do not have permission to save changes to this note.');
      return;
    }

    setIsSaving(true);
    const updatedContent = editor.getHTML();

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title: title,
          content: updatedContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', note.id);

      if (error) {
        throw error;
      }
      showSuccess('Note saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['notes'] }); // Invalidate the list of notes
      queryClient.invalidateQueries({ queryKey: ['note', noteId] }); // Invalidate the specific note to refetch
    } catch (error: any) {
      console.error('Error saving note:', error);
      showError('Failed to save note: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!note) return;
    if (note.user_id !== user?.id) { // Only owner can delete
      showError('You do not have permission to delete this note.');
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', note.id);

      if (error) {
        throw error;
      }
      showSuccess('Note deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      navigate('/dashboard/all-notes');
    } catch (error: any) {
      console.error('Error deleting note:', error);
      showError('Failed to delete note: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRefineAI = async () => {
    if (!editor) return;
    if (!canEdit) {
      showError('You do not have permission to refine this note with AI.');
      return;
    }

    const currentContent = editor.getHTML();
    if (!currentContent || currentContent === '<p></p>') {
      showError('Please add some content to the note before refining with AI.');
      return;
    }

    if (!session?.access_token) { // Check for session token
      showError('You must be logged in to use AI refinement.');
      return;
    }

    setIsRefiningAI(true);
    try {
      const response = await fetch('https://yibrrjblxuoebnecbntp.supabase.co/functions/v1/generate-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // Add Authorization header
        },
        body: JSON.stringify({ text: currentContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refine note with AI.');
      }

      const data = await response.json();
      editor.commands.setContent(data.generatedContent);
      showSuccess('Note refined with AI successfully!');
    } catch (error: any) {
      console.error('Error refining note with AI:', error);
      showError('Failed to refine note with AI: ' + error.message);
    } finally {
      setIsRefiningAI(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleImageUpload(event.target.files[0]);
    }
  };

  const handleTranscription = (text: string) => {
    if (!canEdit) {
      showError('You do not have permission to add voice transcription to this note.');
      return;
    }
    if (editor) {
      editor.chain().focus().insertContent(text + ' ').run(); // Insert transcribed text into the editor
    }
  };

  const getPlainTextContent = () => {
    if (!editor) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editor.getHTML();
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  const handleExportAsText = () => {
    if (!editor || editor.isEmpty) {
      showError('Note is empty, nothing to export.');
      return;
    }
    const plainText = getPlainTextContent();
    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title || 'untitled-note'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSuccess('Note exported as TXT!');
  };

  const handleCopyToClipboard = async () => {
    if (!editor || editor.isEmpty) {
      showError('Note is empty, nothing to copy.');
      return;
    }
    const plainText = getPlainTextContent();
    try {
      await navigator.clipboard.writeText(plainText);
      showSuccess('Note content copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      showError('Failed to copy content to clipboard.');
    }
  };

  if (isLoading || isLoadingPermission) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading note and permissions...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        <p>Error loading note. Please try again.</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Note not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 w-full max-w-4xl mx-auto overflow-y-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <Input
          className="text-2xl font-bold border-none focus-visible:ring-0 focus-visible:ring-offset-0"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note Title"
          disabled={!canEdit} // Disable title editing if not editable
        />
        <div className="flex space-x-2">
          {noteId && <ShareNoteDialog noteId={noteId} />}
          <Button onClick={handleSave} disabled={isSaving || !canEdit}>
            {isSaving ? 'Saving...' : 'Save Note'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting || note.user_id !== user?.id}> {/* Only owner can delete */}
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
                <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" onClick={() => navigate('/dashboard/all-notes')}>
            Close
          </Button>
        </div>
      </div>
      <div className="mb-4 p-2 rounded-md border bg-muted flex flex-wrap gap-1">
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().toggleBold() || !canEdit}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().toggleItalic() || !canEdit}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().toggleStrike() || !canEdit}>
          Strike
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} disabled={!editor.can().toggleUnderline() || !canEdit}>
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleCode().run()} disabled={!editor.can().toggleCode() || !canEdit}>
          <Code className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().setParagraph().run()} disabled={!editor.can().setParagraph() || !canEdit}>
          P
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} disabled={!editor.can().toggleHeading({ level: 1 }) || !canEdit}>
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} disabled={!editor.can().toggleHeading({ level: 2 }) || !canEdit}>
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={!editor.can().toggleBulletList() || !canEdit}>
          <List className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} disabled={!editor.can().toggleOrderedList() || !canEdit}>
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBlockquote().run()} disabled={!editor.can().toggleBlockquote() || !canEdit}>
          <Quote className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().setHorizontalRule().run()} disabled={!editor.can().setHorizontalRule() || !canEdit}>
          <Minus className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().setHardBreak().run()} disabled={!editor.can().setHardBreak() || !canEdit}>
          BR
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo() || !canEdit}>
          <Undo className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo() || !canEdit}>
          <Redo className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().setTextAlign('left').run()} disabled={!editor.can().setTextAlign('left') || !canEdit}>
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().setTextAlign('center').run()} disabled={!editor.can().setTextAlign('center') || !canEdit}>
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().setTextAlign('right').run()} disabled={!editor.can().setTextAlign('right') || !canEdit}>
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().setTextAlign('justify').run()} disabled={!editor.can().setTextAlign('justify') || !canEdit}>
          <AlignJustify className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().setColor('#958DF1').run()} disabled={!editor.can().setColor('#958DF1') || !canEdit}>
          <Palette className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHighlight({ color: '#fae0e0' }).run()} disabled={!editor.can().toggleHighlight({ color: '#fae0e0' }) || !canEdit}>
          <Highlighter className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().unsetColor().run()} disabled={!editor.can().unsetColor() || !canEdit}>
          Unset Color
        </Button>
        <label htmlFor="image-upload" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer">
          <ImageIcon className="h-4 w-4 mr-2" />
          {isUploadingImage ? 'Uploading...' : 'Upload Image'}
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploadingImage || !canEdit}
          />
        </label>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefineAI} 
          disabled={isRefiningAI || !editor.getHTML() || editor.getHTML() === '<p></p>' || !canEdit}
        >
          <Sparkles className="mr-2 h-4 w-4" /> 
          {isRefiningAI ? 'Refining...' : 'Refine with AI'}
        </Button>
        <VoiceRecorder onTranscription={handleTranscription} isIconButton={true} />
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                <span className="sr-only">Export Note</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportAsText} disabled={!editor || editor.isEmpty}>
                Export as TXT
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCopyToClipboard} disabled={!editor || editor.isEmpty}>
                Copy to Clipboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
      <div className="flex-grow overflow-y-auto">
        <EditorContent editor={editor} editable={canEdit} /> {/* Set editable prop */}
      </div>
    </div>
  );
};

export default NoteEditor;