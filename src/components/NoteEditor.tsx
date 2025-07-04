import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
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
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Note } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { useSessionContext } from '@/contexts/SessionContext';
import { useNavigate, useParams } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePlatform } from '@/hooks/use-platform';
// Removed useOnlineStatus import
// Removed offlineDb imports

// Import new modular components
import NoteEditorToolbar from './NoteEditorToolbar';
import NoteHeader from './NoteHeader';

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

const NoteEditor = ({}: NoteEditorProps) => {
  const queryClient = useQueryClient();
  const { user, session } = useSessionContext();
  const navigate = useNavigate();
  const { noteId } = useParams<{ noteId: string }>();
  const isMobileView = useIsMobile();
  const platform = usePlatform();
  // Removed isOnline state

  const [title, setTitle] = useState('');
  const [currentTitleInput, setCurrentTitleInput] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefiningAI, setIsRefiningAI] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState('16');
  const [currentFontFamily, setCurrentFontFamily] = useState('Inter');
  const [isNewNote, setIsNewNote] = useState(false);

  const [lastSavedTitle, setLastSavedTitle] = useState('');
  const [lastSavedContent, setLastSavedContent] = useState('');

  const { data: note, isLoading, isError, error, refetch } = useQuery<Note, Error>({
    queryKey: ['note', noteId],
    queryFn: async () => {
      console.log('🔍 Starting note fetch...');
      if (!noteId) {
        console.error('Note ID is missing.');
        throw new Error('Note ID is missing.');
      }

      try {
        console.log('📡 Fetching note from Supabase...');
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('id', noteId)
          .single();

        if (error) {
          console.error('❌ Supabase fetch error:', error);
          throw error;
        }
        console.log('✅ Note fetched successfully from Supabase. Raw data:', JSON.stringify(data, null, 2));
        
        if (data) {
          setIsNewNote(false); // A fetched note is never 'new' in the offline sense
        }
        return data;
      } catch (fetchError: any) {
        console.error('❌ Failed to load note from Supabase:', fetchError);
        showError('Failed to load note: ' + fetchError.message);
        throw fetchError; // Re-throw to let react-query handle retry/error state
      }
    },
    enabled: !!noteId,
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

  const { data: permissionData, isLoading: isLoadingPermission } = useQuery<{ permission_level: 'read' | 'write' } | null, Error>({
    queryKey: ['notePermission', noteId, user?.id],
    queryFn: async () => {
      if (!user || !noteId) return null;

      if (note && note.user_id === user.id) {
        return { permission_level: 'write' };
      }

      // Always check Supabase for permissions now
      const { data, error } = await supabase
        .from('collaborators')
        .select('permission_level')
        .eq('note_id', noteId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        return null;
      } else if (error) {
        console.error('Error fetching collaboration permission:', error.message);
        throw error;
      }
      return data;
    },
    enabled: !!user && !!noteId && !!note,
    staleTime: 5 * 60 * 1000,
  });

  const isNoteOwner = React.useMemo(() => {
    const calculatedOwner = !!user && !!note && user.id === note.user_id;
    console.log('Inside useMemo for isNoteOwner: Current user ID:', user?.id, 'Note user_id:', note?.user_id, 'Result:', calculatedOwner);
    return calculatedOwner;
  }, [user, note]);

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

  useEffect(() => {
    if (!editor || !note) return;

    console.log('🔄 Initializing editor with fetched note data.');
    setTitle(note.title);
    setCurrentTitleInput(note.title);
    setEditorContent(note.content || ''); 
    setLastSavedTitle(note.title); 
    setLastSavedContent(note.content || ''); 
    editor.commands.setContent(note.content || '');
    // Removed setIsNewNote(note.sync_status === 'pending_create');
  }, [editor, note]);

  useEffect(() => {
    if (!note || isLoadingPermission) {
      setCanEdit(false);
      return;
    }

    // Removed note.sync_status === 'pending_create' check

    const hasWritePermission = isNoteOwner || (user && permissionData?.permission_level === 'write');
    if (!user && note.is_sharable_link_enabled && note.sharable_link_permission_level === 'write') {
      setCanEdit(true);
    } else {
      setCanEdit(hasWritePermission);
    }
    console.log('useEffect for canEdit: isNoteOwner:', isNoteOwner, 'permissionData:', permissionData, 'canEdit:', hasWritePermission);
  }, [note, user, permissionData, isLoadingPermission, isNoteOwner]);


  const saveNote = useCallback(async (currentTitle: string, currentContent: string) => {
    if (!noteId || !user || !canEdit || !note) {
      console.log('Save skipped: Missing noteId, user, edit permission, or note object.');
      return;
    }

    if (currentTitle === lastSavedTitle && currentContent === lastSavedContent) {
      console.log('Save skipped: No changes detected since last successful save.');
      return;
    }

    console.log('Attempting to save note...'); 
    console.log('Saving Title:', currentTitle);
    console.log('Saving Content (first 100 chars):', currentContent.substring(0, 100));

    const now = new Date().toISOString();
    
    try {
      console.log('Attempting to save to Supabase...');
      const { error } = await supabase
        .from('notes')
        .update({
          title: currentTitle,
          content: currentContent,
          updated_at: now,
        })
        .eq('id', noteId);

      if (error) {
        console.error('Supabase update error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      console.log('Save successful to Supabase!');
      showSuccess('Note saved successfully!');
      setLastSavedTitle(currentTitle);
      setLastSavedContent(currentContent);

      queryClient.setQueryData(['note', noteId], (oldNote: Note | undefined) => {
        if (!oldNote) return oldNote;
        return {
          ...oldNote,
          title: currentTitle,
          content: currentContent,
          updated_at: now,
        };
      });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    } catch (error: any) {
      console.error('Error during save:', error);
      showError('Failed to save note: ' + error.message);
    }
  }, [noteId, user, canEdit, note, queryClient, lastSavedTitle, lastSavedContent]);


  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (editor && note) {
        const currentContent = editor.getHTML();
        if (title !== lastSavedTitle || currentContent !== lastSavedContent) {
          console.log('BeforeUnload event detected with unsaved changes. Attempting to save...');
          event.preventDefault();
          event.returnValue = '';
          saveNote(title, currentContent);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (editor && note) {
        const currentContent = editor.getHTML();
        if (title !== lastSavedTitle || currentContent !== lastSavedContent) {
          console.log('NoteEditor unmounting with unsaved changes. Attempting to save...');
          saveNote(title, currentContent);
        }
      }
    };
  }, [editor, note, title, saveNote, lastSavedTitle, lastSavedContent]);


  const handleImageUpload = useCallback(async (file: File) => {
    // Removed isOnline check
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
      } else {
        throw new Error('Failed to get public URL for image.');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      showError('Failed to upload image: ' + error.message);
    } finally {
      setIsUploadingImage(false);
    }
  }, [user, editor, canEdit]); // Removed isOnline from dependencies

  const handleDelete = async () => {
    if (!note) return;
    if (!isNoteOwner) {
      showError('You do not have permission to delete this note.');
      return;
    }

    setIsDeleting(true);
    try {
      console.log('Attempting to delete from Supabase...');
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', note.id);

      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }
      console.log('Note deleted from Supabase!');
      showSuccess('Note deleted successfully!');
      
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      navigate('/dashboard/your-notes');
    } catch (error: any) {
      console.error('Error deleting note:', error);
      showError('Failed to delete note: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRefineAI = async () => {
    if (!editor) return;
    // Removed isOnline check
    if (!canEdit) {
      showError('You do not have permission to refine this note with AI.');
      return;
    }

    const currentContent = editor.getHTML();
    if (!currentContent || currentContent === '<p></p>') {
      showError('Please add some content to the note before refining with AI.');
      return;
    }

    if (!session?.access_token) {
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
    } catch (error: any) {
      console.error('Error refining note with AI:', error);
      showError('Failed to refine note with AI: ' + error.message);
    } finally {
      setIsRefiningAI(false);
    }
  };

  const handleTranscription = (text: string) => {
    // Removed isOnline check
    if (!canEdit) {
      showError('You do not have permission to add voice transcription to this note.');
      return;
    }
    if (editor) {
      editor.chain().focus().insertContent(text + ' ').run();
    }
  };

  const handleFontFamilyChange = useCallback((fontFamily: string) => {
    if (!editor || !canEdit) return;
    
    editor.chain().focus().setFontFamily(fontFamily).run();
    setCurrentFontFamily(fontFamily);
  }, [editor, canEdit]);

  const increaseFontSize = useCallback(() => {
    if (!editor || !canEdit) return;
    
    const currentSize = parseInt(currentFontSize) || 16;
    const newSize = Math.min(currentSize + 2, 32);
    
    editor.chain().focus().setFontSize(`${newSize}px`).run();
    
    setCurrentFontSize(newSize.toString());
  }, [editor, canEdit, currentFontSize]);

  const decreaseFontSize = useCallback(() => {
    if (!editor || !canEdit) return;
    
    const currentSize = parseInt(currentFontSize) || 16;
    const newSize = Math.max(currentSize - 2, 10);
    
    editor.chain().focus().setFontSize(`${newSize}px`).run();
    
    setCurrentFontSize(newSize.toString());
  }, [editor, canEdit, currentFontSize]);

  const handleToggleShareableLinkFromDialog = useCallback(async (checked: boolean, permissionLevel: 'read' | 'write') => {
    if (!note) { // Removed isOnline check
      showError('Cannot update shareable link status.');
      return;
    }
    try {
      const { error } = await supabase
        .from('notes')
        .update({ 
          is_sharable_link_enabled: checked,
          sharable_link_permission_level: permissionLevel
        })
        .eq('id', note.id);

      if (error) {
        throw error;
      }
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    } catch (error: any) {
      console.error('Error updating shareable link status from dialog:', error.message);
      throw error;
    }
  }, [note, noteId, queryClient]); // Removed isOnline from dependencies

  const handleRenameNote = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setCurrentTitleInput(newTitle);
  }, []);

  const handleNavigateToYourNotes = useCallback(() => {
    navigate('/dashboard/your-notes');
  }, [navigate]);

  console.log('NoteEditor render. isLoading:', isLoading, 'note:', note ? note.id : 'null', 'note.user_id:', note?.user_id);
  console.log('NoteEditor render. user:', user ? user.id : 'null');
  console.log('NoteEditor render. isNoteOwner:', isNoteOwner);
  console.log('NoteEditor render. isNewNote (from state):', isNewNote);
  // Removed isOnline log


  if (isLoading || isLoadingPermission) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading note and permissions...</p>
      </div>
    );
  }

  if (!note && !isNewNote) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        <p>Error loading note. Please try again.</p>
      </div>
    );
  }

  return (
    <div className={`${isMobileView ? 'p-4' : 'p-6'} w-full max-w-4xl mx-auto overflow-y-auto h-full flex flex-col animate-in fade-in-0 slide-in-from-bottom-4 duration-500`}>
      <NoteHeader
        noteId={noteId}
        note={note}
        user={user}
        isNewNote={isNewNote}
        isNoteOwner={isNoteOwner}
        canEdit={canEdit}
        title={title}
        currentTitleInput={currentTitleInput}
        setCurrentTitleInput={setCurrentTitleInput}
        onSaveNote={saveNote}
        onDeleteNote={handleDelete}
        isDeleting={isDeleting}
        onRenameNote={handleRenameNote}
        onToggleShareableLink={handleToggleShareableLinkFromDialog}
        editorContent={editorContent}
        onNavigateToYourNotes={handleNavigateToYourNotes}
      />

      <NoteEditorToolbar
        editor={editor}
        canEdit={canEdit}
        isUploadingImage={isUploadingImage}
        isRefiningAI={isRefiningAI}
        session={session}
        // Removed isOnline prop
        onImageUpload={handleImageUpload}
        onRefineAI={handleRefineAI}
        onTranscription={handleTranscription}
        currentFontSize={currentFontSize}
        currentFontFamily={currentFontFamily}
        onFontFamilyChange={handleFontFamilyChange}
        onIncreaseFontSize={increaseFontSize}
        onDecreaseFontSize={decreaseFontSize}
        noteTitle={title}
      />

      <div className="flex-grow overflow-y-auto">
        <EditorContent editor={editor} editable={canEdit} />
      </div>
    </div>
  );
};

export default NoteEditor;