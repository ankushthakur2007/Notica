import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import FontFamily from '@tiptap/extension-font-family';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Note } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { ImageIcon, Bold, Italic, Underline as UnderlineIcon, Code, List, ListOrdered, Quote, Minus, Undo, Redo, Heading1, Heading2, AlignLeft, AlignCenter, AlignRight, AlignJustify, Palette, Highlighter, Trash2, Sparkles, Share2, Download, Type, Plus, Minus as MinusIcon, MoreHorizontal, ChevronDown, Cloud } from 'lucide-react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import VoiceRecorder from '@/components/VoiceRecorder';
import NoteCollaborationDialog from '@/components/NoteCollaborationDialog';
import RenameNoteDialog from '@/components/RenameNoteDialog';
import jsPDF from 'jspdf';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePlatform } from '@/hooks/use-platform'; // Import usePlatform

// Custom FontSize extension
import { Extension } from '@tiptap/core';

const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run()
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run()
      },
    }
  },
})

interface NoteEditorProps {} 

const NOTE_CACHE_PREFIX = 'notica-note-cache-'; // Keep for potential future use or if old local notes exist

const NoteEditor = ({}: NoteEditorProps) => {
  const queryClient = useQueryClient();
  const { user, session } = useSessionContext();
  const navigate = useNavigate();
  const { noteId } = useParams<{ noteId: string }>();
  const isMobileView = useIsMobile();
  const platform = usePlatform(); // Get the current platform

  const [title, setTitle] = useState('');
  const [currentTitleInput, setCurrentTitleInput] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefiningAI, setIsRefiningAI] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState('16');
  const [currentFontFamily, setCurrentFontFamily] = useState('Inter');
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
  const [isNewNote, setIsNewNote] = useState(false); // Tracks if it's a new note (not yet in DB)
  const [isSavingToCloud, setIsSavingToCloud] = useState(false); // State for "Save to Cloud" button

  // States to track the last successfully saved values to Supabase
  const [lastSavedTitle, setLastSavedTitle] = useState('');
  const [lastSavedContent, setLastSavedContent] = useState('');

  // Query to fetch note from Supabase
  const { data: note, isLoading, isError, error, refetch } = useQuery<Note, Error>({
    queryKey: ['note', noteId],
    queryFn: async () => {
      console.log('🔍 Fetching note from Supabase...');
      if (!noteId || noteId === 'new') {
        console.log('Note ID is "new", not fetching from Supabase directly.');
        return Promise.resolve(null as unknown as Note); // Return null for new notes
      }
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (error) {
        console.error('❌ Supabase fetch error:', error);
        throw error;
      }
      console.log('✅ Note fetched successfully. Raw data:', JSON.stringify(data, null, 2));
      return data;
    },
    enabled: !!noteId && noteId !== 'new', // Only enable if noteId is present and not 'new'
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    onSuccess: (data) => {
      console.log('✅ Note query success callback. Data ID:', data ? data.id : 'null', 'Owner ID from success callback:', data?.user_id);
      console.log('Shareable Link Status from Supabase:', {
        is_sharable_link_enabled: data?.is_sharable_link_enabled,
        sharable_link_permission_level: data?.sharable_link_permission_level
      });
    },
    onError: (err) => {
      console.error('❌ Note query error callback:', err);
    },
  });

  // Query to fetch permission level for the current user on this note
  const { data: permissionData, isLoading: isLoadingPermission } = useQuery<{ permission_level: 'read' | 'write' } | null, Error>({
    queryKey: ['notePermission', noteId, user?.id],
    queryFn: async () => {
      if (!user || !noteId || noteId === 'new') return null;

      // If the current user is the owner, they implicitly have write permission
      if (note && note.user_id === user.id) {
        return { permission_level: 'write' };
      }

      const { data, error } = await supabase
        .from('collaborators')
        .select('permission_level')
        .eq('note_id', noteId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') { // No rows found
        return null;
      } else if (error) {
        console.error('Error fetching collaboration permission:', error.message);
        throw error;
      }
      return data;
    },
    enabled: !!user && !!noteId && noteId !== 'new' && !!note, // Only enable if note is loaded and not a new note
    staleTime: 5 * 60 * 1000,
  });

  const isNoteOwner = React.useMemo(() => {
    const calculatedOwner = !!user && !!note && user.id === note.user_id;
    console.log('Inside useMemo for isNoteOwner: Current user ID:', user?.id, 'Note user_id:', note?.user_id, 'Result:', calculatedOwner);
    return calculatedOwner;
  }, [user, note]);

  // Initialize editor
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
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      Image.configure({
        inline: true,
        allowBase64: true,
        resizable: true,
      }),
      FontFamily.configure({
        types: ['textStyle'],
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: `prose dark:prose-invert max-w-none focus:outline-none p-4 min-h-[300px] border rounded-md bg-background text-foreground ${isMobileView ? 'text-base' : ''}`,
      },
      handleDrop: (view, event, slice, moved) => {
        if (!canEdit) return false;
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
        if (!canEdit) return false;
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
    onUpdate: ({ editor }) => {
      setEditorContent(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      const attributes = editor.getAttributes('textStyle');
      const fontSize = attributes.fontSize;
      if (fontSize) {
        setCurrentFontSize(fontSize.replace('px', ''));
      } else {
        setCurrentFontSize('16');
      }
      setCurrentFontFamily(attributes.fontFamily || 'Inter');
    },
  });

  // Effect to determine if it's a new note
  useEffect(() => {
    setIsNewNote(noteId === 'new');
  }, [noteId]);

  // Effect to initialize editor content and last saved state when note data loads or for new notes
  useEffect(() => {
    if (!editor) return;

    if (isNewNote) {
      // For new notes, initialize with default values
      setTitle('Untitled Note');
      setCurrentTitleInput('Untitled Note');
      setEditorContent('');
      editor.commands.setContent('');
      setLastSavedTitle('Untitled Note');
      setLastSavedContent('');

      // Immediately save new note to Supabase for all platforms
      if (user && !isSavingToCloud) {
        console.log('New note: Attempting immediate save to Supabase.');
        handleSaveNewNoteToCloud('Untitled Note', ''); // Pass initial title and content
      } else if (!user) {
        // If not logged in, new notes cannot be created. Redirect.
        showError('You must be logged in to create new notes.');
        navigate('/dashboard/your-notes');
      }
    } else if (note) {
      // For existing notes, load from fetched data
      console.log('🔄 Initializing editor with fetched note data.');
      setTitle(note.title);
      setCurrentTitleInput(note.title);
      setEditorContent(note.content || ''); 
      setLastSavedTitle(note.title); 
      setLastSavedContent(note.content || ''); 
      editor.commands.setContent(note.content || '');
    }
  }, [editor, note, isNewNote, user, navigate]); // Removed isLocalOnly from dependencies

  // Effect to update canEdit status
  useEffect(() => {
    if (isNewNote) {
      // New notes are always editable if user is logged in (as they are immediately saved to cloud)
      setCanEdit(!!user); 
    } else if (note && !isLoadingPermission) {
      const hasWritePermission = isNoteOwner || (user && permissionData?.permission_level === 'write');
      // If public link is enabled and set to 'write', and user is not logged in, grant edit.
      // This is a client-side check, actual write permission is enforced by RLS.
      if (!user && note.is_sharable_link_enabled && note.sharable_link_permission_level === 'write') {
        setCanEdit(true);
      } else {
        setCanEdit(hasWritePermission);
      }
      console.log('useEffect for canEdit: isNoteOwner:', isNoteOwner, 'permissionData:', permissionData, 'canEdit:', hasWritePermission);
    }
  }, [note, user, permissionData, isLoadingPermission, isNoteOwner, isNewNote]);


  // Function to save an existing note to Supabase (or update a newly created one)
  const saveNote = useCallback(async (currentTitle: string, currentContent: string) => {
    if (!noteId || !user || !canEdit) { // Need noteId and user to save
      console.log('Save skipped: Missing noteId, user, or no edit permission.');
      return;
    }

    // Compare with last successfully saved values to avoid redundant saves
    if (currentTitle === lastSavedTitle && currentContent === lastSavedContent) {
      console.log('Save skipped: No changes detected since last successful save.');
      return;
    }

    console.log('Attempting to save note to Supabase...'); 
    console.log('Saving Title:', currentTitle);
    console.log('Saving Content (first 100 chars):', currentContent.substring(0, 100));

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title: currentTitle,
          content: currentContent,
        })
        .eq('id', noteId); // Use noteId from params

      if (error) {
        console.error('Supabase update error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      console.log('Save successful!'); 
      setLastSavedTitle(currentTitle); // Update last saved values on success
      setLastSavedContent(currentContent); // Update last saved values on success
      
      // Manually update the cache instead of invalidating to prevent refetch and editor reset
      queryClient.setQueryData(['note', noteId], (oldNote: Note | undefined) => {
        if (!oldNote) return oldNote;
        return {
          ...oldNote,
          title: currentTitle,
          content: currentContent,
          updated_at: new Date().toISOString(), // Update locally for immediate UI consistency
        };
      });
      queryClient.invalidateQueries({ queryKey: ['notes'] }); // Invalidate the list of notes to update title/timestamp
    } catch (error: any) {
      console.error('Error during save:', error);
      showError('Failed to save note: ' + error.message);
    }
  }, [noteId, user, canEdit, queryClient, lastSavedTitle, lastSavedContent]);

  // Function to handle initial save of a NEW note to Supabase
  const handleSaveNewNoteToCloud = useCallback(async (initialTitle: string, initialContent: string) => {
    if (!user) {
      showError('You must be logged in to create notes.');
      return;
    }
    if (!isNewNote) {
      console.warn('Attempted to call handleSaveNewNoteToCloud on an existing note.');
      return;
    }

    setIsSavingToCloud(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({ user_id: user.id, title: initialTitle, content: initialContent })
        .select()
        .single();

      if (error) {
        throw error;
      }

      showSuccess('Note created successfully!');
      // Update URL to the new Supabase ID
      navigate(`/dashboard/edit-note/${data.id}`, { replace: true });
      
      // Invalidate queries to refetch the note with its new ID and update note list
      queryClient.invalidateQueries({ queryKey: ['note', noteId] }); // Invalidate old 'new' key
      queryClient.invalidateQueries({ queryKey: ['note', data.id] }); // Invalidate new cloud key
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      
      // Set the last saved values to the newly saved cloud values
      setLastSavedTitle(data.title);
      setLastSavedContent(data.content || '');

      // The `note` query will now refetch with the new `noteId` from the URL
    } catch (error: any) {
      console.error('Error saving new note to cloud:', error);
      showError('Failed to create note: ' + error.message);
    } finally {
      setIsSavingToCloud(false);
    }
  }, [user, isNewNote, noteId, navigate, queryClient]);


  // Effect to save on component unmount or before page unload
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Only prompt/save if it's an existing note with changes
      if (editor && noteId !== 'new' && note) { // Only for existing cloud notes
        const currentContent = editor.getHTML();
        if (title !== lastSavedTitle || currentContent !== lastSavedContent) {
          console.log('BeforeUnload event detected with unsaved changes. Attempting to save...');
          event.preventDefault();
          event.returnValue = ''; // Required for Chrome
          saveNote(title, currentContent);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // This runs on component unmount (e.g., internal navigation)
      if (editor && noteId !== 'new' && note) { // Only for existing cloud notes
        const currentContent = editor.getHTML();
        if (title !== lastSavedTitle || currentContent !== lastSavedContent) {
          console.log('NoteEditor unmounting with unsaved changes. Attempting to save...');
          saveNote(title, currentContent);
        }
      }
    };
  }, [editor, note, title, saveNote, lastSavedTitle, lastSavedContent, noteId]);


  const handleImageUpload = useCallback(async (file: File) => {
    if (!user) { // Image upload still requires a logged-in user for bucket permissions
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
        // Removed: showSuccess('Image uploaded successfully!');
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

  const handleDelete = async () => {
    if (!note) return; // Ensure there's a note to delete
    if (!isNoteOwner) { // Use isNoteOwner directly
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
      // Removed: showSuccess('Note deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      // No need to clear local storage for local-only notes anymore
      navigate('/dashboard/your-notes'); // Corrected navigation path
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

    if (!session?.access_token) { // AI refinement requires a logged-in user for token
      showError('You must be logged in to use AI refinement.');
      return;
    }

    setIsRefiningAI(true);
    try {
      const response = await fetch('https://yibrrjblxuoebnecbntp.supabase.co/functions/v1/generate-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text: currentContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refine note with AI.');
      }

      const data = await response.json();
      editor.commands.setContent(data.generatedContent);
      // Removed: showSuccess('Note refined with AI successfully!');
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
      editor.chain().focus().insertContent(text + ' ').run();
    }
  };

  const handleFontFamilyChange = (fontFamily: string) => {
    if (!editor || !canEdit) return;
    
    editor.chain().focus().setFontFamily(fontFamily).run();
    setCurrentFontFamily(fontFamily);
  };

  const increaseFontSize = () => {
    if (!editor || !canEdit) return;
    
    const currentSize = parseInt(currentFontSize) || 16;
    const newSize = Math.min(currentSize + 2, 32);
    
    editor.chain().focus().setFontSize(`${newSize}px`).run();
    
    setCurrentFontSize(newSize.toString());
  };

  const decreaseFontSize = () => {
    if (!editor || !canEdit) return;
    
    const currentSize = parseInt(currentFontSize) || 16;
    const newSize = Math.max(currentSize - 2, 10);
    
    editor.chain().focus().setFontSize(`${newSize}px`).run();
    
    setCurrentFontSize(newSize.toString());
  };

  const getPlainTextContent = () => {
    if (!editor) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editor.getHTML();
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  const handleExportAsPDF = () => {
    if (!editor || editor.isEmpty) {
      showError('Note is empty, nothing to export.');
      return;
    }

    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      const titleLines = pdf.splitTextToSize(title || 'Untitled Note', maxWidth);
      pdf.text(titleLines, margin, yPosition);
      yPosition += titleLines.length * 10 + 10;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      
      const content = getPlainTextContent();
      const lines = pdf.splitTextToSize(content, maxWidth);
      
      for (let i = 0; i < lines.length; i++) {
        if (yPosition > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(lines[i], margin, yPosition);
        yPosition += 7;
      }

      const currentDate = new Date().toLocaleDateString();
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Generated on ${currentDate}`, margin, pageHeight - 10);

      pdf.save(`${title || 'untitled-note'}.pdf`);
      // Removed: showSuccess('Note exported as PDF!');
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      showError('Failed to generate PDF: ' + error.message);
    }
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
    // Removed: showSuccess('Note exported as TXT!');
  };

  const handleCopyToClipboard = async () => {
    if (!editor || editor.isEmpty) {
      showError('Note is empty, nothing to copy.');
      return;
    }
    const plainText = getPlainTextContent();
    try {
      await navigator.clipboard.writeText(plainText);
      // Removed: showSuccess('Note content copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      showError('Failed to copy content to clipboard.');
    }
  };

  // New function to handle toggling shareable link from NoteCollaborationDialog
  const handleToggleShareableLinkFromDialog = useCallback(async (checked: boolean, permissionLevel: 'read' | 'write') => {
    if (!note) return;
    try {
      const { error } = await supabase
        .from('notes')
        .update({ 
          is_sharable_link_enabled: checked,
          sharable_link_permission_level: permissionLevel // Update the new column
        })
        .eq('id', note.id);

      if (error) {
        throw error;
      }
      // Invalidate the note query to refetch the updated status and ensure cache consistency
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] }); // Also invalidate the list
    } catch (error: any) {
      console.error('Error updating shareable link status from dialog:', error.message);
      throw error; // Re-throw to be caught by the dialog's mutation/state
    }
  }, [note, noteId, queryClient]);

  const handleRenameNote = useCallback((newTitle: string) => {
    setTitle(newTitle); // Update the main title state
    setCurrentTitleInput(newTitle); // Also update the input's local state
  }, []);


  console.log('NoteEditor render. isLoading:', isLoading, 'note:', note ? note.id : 'null', 'note.user_id:', note?.user_id);
  console.log('NoteEditor render. user:', user ? user.id : 'null');
  console.log('NoteEditor render. isNoteOwner:', isNoteOwner);
  console.log('NoteEditor render. isNewNote:', isNewNote);


  if (isLoading || isLoadingPermission) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading note and permissions...</p>
      </div>
    );
  }

  // If it's a new note and we're waiting for it to be saved to cloud
  if (isNewNote && isSavingToCloud) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Creating note in cloud...</p>
      </div>
    );
  }

  // If it's an existing note and it failed to load
  if (!isNewNote && isError) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        <p>Error loading note. Please try again.</p>
      </div>
    );
  }

  // If it's an existing note and no data was returned (e.g., 404)
  if (!isNewNote && !note) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Note not found.</p>
      </div>
    );
  }

  // Mobile-optimized toolbar components
  const BasicFormattingTools = () => (
    <div className="flex flex-wrap gap-1">
      <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().toggleBold() || !canEdit}>
        <Bold className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().toggleItalic() || !canEdit}>
        <Italic className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} disabled={!editor.can().toggleUnderline() || !canEdit}>
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={!editor.can().toggleBulletList() || !canEdit}>
        <List className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} disabled={!editor.can().toggleOrderedList() || !canEdit}>
        <ListOrdered className="h-4 w-4" />
      </Button>
    </div>
  );

  const AdvancedFormattingTools = () => (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().toggleStrike() || !canEdit}>
          Strike
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
      </div>
      
      <div className="flex flex-wrap gap-1">
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBlockquote().run()} disabled={!editor.can().toggleBlockquote() || !canEdit}>
          <Quote className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().setHorizontalRule().run()} disabled={!editor.can().setHorizontalRule() || !canEdit}>
          <Minus className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo() || !canEdit}>
          <Undo className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo() || !canEdit}>
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1">
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
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={!canEdit}>
              <Palette className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#FF0000').run()} disabled={!editor.can().setColor('#FF0000') || !canEdit}>
              <span className="w-4 h-4 rounded-full bg-red-500 mr-2"></span> Red
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#0000FF').run()} disabled={!editor.can().setColor('#0000FF') || !canEdit}>
              <span className="w-4 h-4 rounded-full bg-blue-500 mr-2"></span> Blue
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#008000').run()} disabled={!editor.can().setColor('#008000') || !canEdit}>
              <span className="w-4 h-4 rounded-full bg-green-500 mr-2"></span> Green
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#800080').run()} disabled={!editor.can().setColor('#800080') || !canEdit}>
              <span className="w-4 h-4 rounded-full bg-purple-500 mr-2"></span> Purple
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#FFA500').run()} disabled={!editor.can().setColor('#FFA500') || !canEdit}>
              <span className="w-4 h-4 rounded-full bg-orange-500 mr-2"></span> Orange
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#000000').run()} disabled={!editor.can().setColor('#000000') || !canEdit}>
              <span className="w-4 h-4 rounded-full bg-black mr-2"></span> Black
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#FFFFFF').run()} disabled={!editor.can().setColor('#FFFFFF') || !canEdit}>
              <span className="w-4 h-4 rounded-full bg-white border border-gray-300 mr-2"></span> White
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().unsetColor().run()} disabled={!editor.can().unsetColor() || !canEdit}>
              Unset Color
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHighlight({ color: '#fae0e0' }).run()} disabled={!editor.can().toggleHighlight({ color: '#fae0e0' }) || !canEdit}>
          <Highlighter className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Select value={currentFontFamily} onValueChange={handleFontFamilyChange} disabled={!canEdit}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Inter">Inter</SelectItem>
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="Helvetica">Helvetica</SelectItem>
            <SelectItem value="Times New Roman">Times</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
            <SelectItem value="Courier New">Courier</SelectItem>
            <SelectItem value="Verdana">Verdana</SelectItem>
            <SelectItem value="Roboto">Roboto</SelectItem>
            <SelectItem value="Open Sans">Open Sans</SelectItem>
            <SelectItem value="Lato">Lato</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center border rounded-md">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={decreaseFontSize}
            disabled={!canEdit}
            className="h-9 px-2 rounded-r-none border-r"
          >
            <MinusIcon className="h-3 w-3" />
          </Button>
          <div className="flex items-center px-2 min-w-[40px] justify-center text-sm">
            {currentFontSize}px
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={increaseFontSize}
            disabled={!canEdit}
            className="h-9 px-2 rounded-l-none border-l"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`${isMobileView ? 'p-4' : 'p-6'} w-full max-w-4xl mx-auto overflow-y-auto h-full flex flex-col`}>
      {/* Header */}
      <div className={`flex ${isMobileView ? 'flex-col space-y-3' : 'justify-between items-center'} mb-4`}>
        <Input
          className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold border-none focus-visible:ring-0 focus-visible:ring-offset-0`}
          value={currentTitleInput}
          onChange={(e) => setCurrentTitleInput(e.target.value)}
          onBlur={() => setTitle(currentTitleInput)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setTitle(currentTitleInput);
              e.currentTarget.blur();
            }
          }}
          placeholder="Note Title"
          disabled={!canEdit}
        />
        
        {/* Action buttons */}
        <div className={`flex ${isMobileView ? 'flex-col space-y-2' : 'space-x-2'}`}>
          {platform === 'android' && user && ( // Show "Save to Cloud" only for Android
            <Button 
              onClick={() => saveNote(title, editor?.getHTML() || '')} 
              disabled={isSavingToCloud || !user || !canEdit} // Disable if already saving or no edit permission
            >
              {isSavingToCloud ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Cloud className="mr-2 h-4 w-4" />}
              {isSavingToCloud ? 'Saving...' : 'Save to Cloud'}
            </Button>
          )}

          {isMobileView ? (
            <>
              <div className="flex space-x-2">
                {noteId && note && user && !isNewNote && ( // Only show collaboration for existing cloud notes
                  <NoteCollaborationDialog 
                    noteId={noteId} 
                    isNoteOwner={isNoteOwner} 
                    isSharableLinkEnabled={note.is_sharable_link_enabled}
                    sharableLinkPermissionLevel={note.sharable_link_permission_level || 'read'}
                    onToggleShareableLink={handleToggleShareableLinkFromDialog}
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
                    {canEdit && !isNewNote && ( // Only allow rename for existing notes
                      <RenameNoteDialog currentTitle={title} onRename={handleRenameNote}>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          Rename
                        </DropdownMenuItem>
                      </RenameNoteDialog>
                    )}
                    <DropdownMenuItem onClick={() => navigate('/dashboard/your-notes')}> {/* Corrected navigation path */}
                      Close
                    </DropdownMenuItem>
                    {isNoteOwner && ( // Allow delete only for owner
                      <DropdownMenuItem onClick={handleDelete} disabled={isDeleting} className="text-destructive">
                        {isDeleting ? 'Deleting...' : 'Delete Note'}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : (
            <>
              {noteId && note && user && !isNewNote && ( // Only show collaboration for existing cloud notes
                <NoteCollaborationDialog 
                  noteId={noteId} 
                  isNoteOwner={isNoteOwner} 
                  isSharableLinkEnabled={note.is_sharable_link_enabled}
                  sharableLinkPermissionLevel={note.sharable_link_permission_level || 'read'}
                  onToggleShareableLink={handleToggleShareableLinkFromDialog}
                />
              )}
              {canEdit && !isNewNote && ( // Only allow rename for existing notes
                <RenameNoteDialog currentTitle={title} onRename={handleRenameNote}>
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
                    <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="outline" onClick={() => navigate('/dashboard/your-notes')}> {/* Corrected navigation path */}
                Close
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile-optimized toolbar */}
      <div className="mb-4 p-2 rounded-md border bg-muted">
        {isMobileView ? (
          <div className="space-y-3">
            {/* Always visible basic tools */}
            <BasicFormattingTools />
            
            {/* Quick action buttons */}
            <div className="flex flex-wrap gap-1">
              <VoiceRecorder onTranscription={handleTranscription} isIconButton={true} />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefineAI} 
                disabled={isRefiningAI || !editor?.getHTML() || editor.getHTML() === '<p></p>' || !canEdit}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
              <label htmlFor="image-upload" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer">
                <ImageIcon className="h-4 w-4" />
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploadingImage || !canEdit}
                />
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportAsPDF} disabled={!editor || editor.isEmpty}>
                    Export as PDF
                  </DropdownMenuItem>
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

            {/* Collapsible advanced tools */}
            <Collapsible open={isToolbarExpanded} onOpenChange={setIsToolbarExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <span>More Tools</span>
                  <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isToolbarExpanded ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <AdvancedFormattingTools />
              </CollapsibleContent>
            </Collapsible>
          </div>
        ) : (
          // Desktop toolbar (existing layout)
          <div className="flex flex-wrap gap-1">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={!canEdit}>
                  <Palette className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#FF0000').run()} disabled={!editor.can().setColor('#FF0000') || !canEdit}>
                  <span className="w-4 h-4 rounded-full bg-red-500 mr-2"></span> Red
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#0000FF').run()} disabled={!editor.can().setColor('#0000FF') || !canEdit}>
                  <span className="w-4 h-4 rounded-full bg-blue-500 mr-2"></span> Blue
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#008000').run()} disabled={!editor.can().setColor('#008000') || !canEdit}>
                  <span className="w-4 h-4 rounded-full bg-green-500 mr-2"></span> Green
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#800080').run()} disabled={!editor.can().setColor('#800080') || !canEdit}>
                  <span className="w-4 h-4 rounded-full bg-purple-500 mr-2"></span> Purple
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#FFA500').run()} disabled={!editor.can().setColor('#FFA500') || !canEdit}>
                  <span className="w-4 h-4 rounded-full bg-orange-500 mr-2"></span> Orange
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#000000').run()} disabled={!editor.can().setColor('#000000') || !canEdit}>
                  <span className="w-4 h-4 rounded-full bg-black mr-2"></span> Black
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#FFFFFF').run()} disabled={!editor.can().setColor('#FFFFFF') || !canEdit}>
                  <span className="w-4 h-4 rounded-full bg-white border border-gray-300 mr-2"></span> White
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => editor.chain().focus().unsetColor().run()} disabled={!editor.can().unsetColor() || !canEdit}>
                  Unset Color
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHighlight({ color: '#fae0e0' }).run()} disabled={!editor.can().toggleHighlight({ color: '#fae0e0' }) || !canEdit}>
              <Highlighter className="h-4 w-4" />
            </Button>
            
            <Select value={currentFontFamily} onValueChange={handleFontFamilyChange} disabled={!canEdit}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
                <SelectItem value="Times New Roman">Times</SelectItem>
                <SelectItem value="Georgia">Georgia</SelectItem>
                <SelectItem value="Courier New">Courier</SelectItem>
                <SelectItem value="Verdana">Verdana</SelectItem>
                <SelectItem value="Roboto">Roboto</SelectItem>
                <SelectItem value="Open Sans">Open Sans</SelectItem>
                <SelectItem value="Lato">Lato</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center border rounded-md">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={decreaseFontSize}
                disabled={!canEdit}
                className="h-9 px-2 rounded-r-none border-r"
              >
                <MinusIcon className="h-3 w-3" />
              </Button>
              <div className="flex items-center px-2 min-w-[40px] justify-center text-sm">
                {currentFontSize}px
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={increaseFontSize}
                disabled={!canEdit}
                className="h-9 px-2 rounded-l-none border-l"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

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
              disabled={isRefiningAI || !editor?.getHTML() || editor.getHTML() === '<p></p>' || !canEdit}
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
                <DropdownMenuItem onClick={handleExportAsPDF} disabled={!editor || editor.isEmpty}>
                  Export as PDF
                </DropdownMenuItem>
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
        )}
      </div>

      {/* Editor */}
      <div className="flex-grow overflow-y-auto">
        <EditorContent editor={editor} editable={canEdit} />
      </div>
    </div>
  );
};

export default NoteEditor;