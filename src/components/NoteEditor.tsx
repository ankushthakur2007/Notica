import React, { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Note } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { useAppStore } from '@/stores/appStore';
import { useNavigate, useParams } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import NoteEditorToolbar from './NoteEditorToolbar';
import NoteHeader from './NoteHeader';
import { Extension, ChainedCommands, RawCommands } from '@tiptap/core';
import ResizableImage from './editor/ResizableImageNode';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    }
  }
}

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] } },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
          renderHTML: attributes => {
            if (!attributes.fontSize) return {};
            return { style: `font-size: ${attributes.fontSize}` };
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }) => {
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
});

const NoteEditor = () => {
  const queryClient = useQueryClient();
  const { user, session, updateNote, deleteNote: deleteNoteFromStore } = useAppStore();
  const navigate = useNavigate();
  const { noteId } = useParams<{ noteId: string }>();
  const isMobileView = useIsMobile();

  const [title, setTitle] = useState('');
  const [currentTitleInput, setCurrentTitleInput] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefiningAI, setIsRefiningAI] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState('16');
  const [currentFontFamily, setCurrentFontFamily] = useState('Inter');
  const [lastSavedTitle, setLastSavedTitle] = useState('');
  const [lastSavedContent, setLastSavedContent] = useState('');

  const { data: note, isLoading, isError } = useQuery<Note, Error>({
    queryKey: ['note', noteId],
    queryFn: async () => {
      if (!noteId) throw new Error('Note ID is missing.');
      const { data, error } = await supabase.from('notes').select('*').eq('id', noteId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!noteId,
  });

  const { data: permissionData, isLoading: isLoadingPermission } = useQuery<{ permission_level: 'read' | 'write' } | null, Error>({
    queryKey: ['notePermission', noteId, user?.id],
    queryFn: async () => {
      if (!user || !noteId || (note && note.user_id === user.id)) return { permission_level: 'write' };
      const { data, error } = await supabase.from('collaborators').select('permission_level').eq('note_id', noteId).eq('user_id', user.id).single();
      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!noteId && !!note,
  });

  const isNoteOwner = React.useMemo(() => !!user && !!note && user.id === note.user_id, [user, note]);

  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false, autolink: true }), Placeholder.configure({ placeholder: 'Start typing...' }), TextAlign.configure({ types: ['heading', 'paragraph'] }), Underline, TextStyle, FontSize, Color, Highlight.configure({ multicolor: true }), ResizableImage.configure({ inline: true, allowBase64: true }), FontFamily.configure({ types: ['textStyle'] })],
    content: '',
    editorProps: {
      attributes: { class: `prose dark:prose-invert max-w-none focus:outline-none text-foreground ${isMobileView ? 'text-base' : ''}` },
      handleDrop: (view, event) => {
        if (!canEdit || !event.dataTransfer?.files[0]) return false;
        if (event.dataTransfer.files[0].type.startsWith('image/')) {
          handleImageUpload(event.dataTransfer.files[0]);
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        if (!canEdit || !event.clipboardData?.files[0]) return false;
        if (event.clipboardData.files[0].type.startsWith('image/')) {
          handleImageUpload(event.clipboardData.files[0]);
          return true;
        }
        return false;
      },
    },
    onSelectionUpdate: ({ editor }) => {
      const attrs = editor.getAttributes('textStyle');
      setCurrentFontSize(attrs.fontSize?.replace('px', '') || '16');
      setCurrentFontFamily(attrs.fontFamily || 'Inter');
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(canEdit);
    }
  }, [editor, canEdit]);

  useEffect(() => {
    if (!editor || !note) return;
    // Do not update content if the user is currently focused on the editor
    if (editor.isFocused) return;

    setTitle(note.title);
    setCurrentTitleInput(note.title);
    setLastSavedTitle(note.title);
    setLastSavedContent(note.content || '');
    editor.commands.setContent(note.content || '');
  }, [editor, note]);

  useEffect(() => {
    if (!note || isLoadingPermission) { setCanEdit(false); return; }
    const hasWritePermission = isNoteOwner || (user && permissionData?.permission_level === 'write');
    setCanEdit(!user && note.is_sharable_link_enabled && note.sharable_link_permission_level === 'write' ? true : hasWritePermission);
  }, [note, user, permissionData, isLoadingPermission, isNoteOwner]);

  const saveNote = useCallback(async (currentTitle: string, currentContent: string) => {
    if (!noteId || !user || !canEdit || !note || (currentTitle === lastSavedTitle && currentContent === lastSavedContent)) return;
    
    try {
      const { data, error } = await supabase.from('notes').update({ title: currentTitle, content: currentContent, updated_at: new Date().toISOString() }).eq('id', noteId).select().single();
      if (error) throw error;
      showSuccess('Note saved!');
      setLastSavedTitle(currentTitle);
      setLastSavedContent(currentContent);
      updateNote(data); // Update store
      queryClient.setQueryData(['note', noteId], data);
    } catch (error: any) {
      showError('Failed to save note: ' + error.message);
    }
  }, [noteId, user, canEdit, note, queryClient, lastSavedTitle, lastSavedContent, updateNote]);

  useEffect(() => {
    const handleSaveOnUnload = () => {
      if (editor && note) {
        const currentContent = editor.getHTML();
        if (title !== lastSavedTitle || currentContent !== lastSavedContent) {
          saveNote(title, currentContent);
        }
      }
    };
    window.addEventListener('beforeunload', handleSaveOnUnload);
    return () => {
      window.removeEventListener('beforeunload', handleSaveOnUnload);
      handleSaveOnUnload();
    };
  }, [editor, note, title, saveNote, lastSavedTitle, lastSavedContent]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!user || !canEdit) { showError('You do not have permission to upload images.'); return; }
    setIsUploadingImage(true);
    const fileName = `${user.id}/${uuidv4()}.${file.name.split('.').pop()}`;
    try {
      const { error } = await supabase.storage.from('note-images').upload(fileName, file, { upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('note-images').getPublicUrl(fileName);
      if (publicUrl) {
        editor?.chain().focus().insertContent({ type: 'resizableImage', attrs: { src: publicUrl } }).run();
      }
    } catch (error: any) {
      showError('Failed to upload image: ' + error.message);
    } finally {
      setIsUploadingImage(false);
    }
  }, [user, editor, canEdit]);

  const handleDelete = async () => {
    if (!note || !isNoteOwner) { showError('You do not have permission to delete this note.'); return; }
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('notes').delete().eq('id', note.id);
      if (error) throw error;
      showSuccess('Note deleted!');
      deleteNoteFromStore(note.id); // Update store
      navigate('/dashboard/your-notes');
    } catch (error: any) {
      showError('Failed to delete note: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRefineAI = async () => {
    if (!editor || !canEdit || !session?.access_token) { showError('Cannot refine note.'); return; }
    const currentContent = editor.getHTML();
    if (!currentContent || currentContent === '<p></p>') { showError('Please add content before refining.'); return; }
    setIsRefiningAI(true);
    try {
      const response = await fetch('https://yibrrjblxuoebnecbntp.supabase.co/functions/v1/generate-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ text: currentContent }),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error); }
      const data = await response.json();
      editor.commands.setContent(data.generatedContent);
    } catch (error: any) {
      showError('Failed to refine note with AI: ' + error.message);
    } finally {
      setIsRefiningAI(false);
    }
  };

  const handleToggleShareableLinkFromDialog = useCallback(async (checked: boolean, permissionLevel: 'read' | 'write') => {
    if (!note) return;
    try {
      const { error } = await supabase.from('notes').update({ is_sharable_link_enabled: checked, sharable_link_permission_level: permissionLevel }).eq('id', note.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
    } catch (error: any) {
      console.error('Error updating shareable link:', error.message);
      throw error;
    }
  }, [note, noteId, queryClient]);

  if (isLoading || isLoadingPermission) return <div className="flex items-center justify-center h-full"><p>Loading note...</p></div>;
  if (isError || !note) return <div className="flex items-center justify-center h-full text-destructive"><p>Error loading note.</p></div>;

  return (
    <div className={`${isMobileView ? 'p-4' : 'p-6'} w-full overflow-y-auto h-screen flex flex-col`}>
      <NoteHeader
        noteId={noteId} note={note} user={user} isNewNote={false} isNoteOwner={isNoteOwner} canEdit={canEdit}
        title={title} currentTitleInput={currentTitleInput} setCurrentTitleInput={setCurrentTitleInput}
        onSaveNote={() => saveNote(currentTitleInput, editor?.getHTML() || '')}
        onDeleteNote={handleDelete} isDeleting={isDeleting} onRenameNote={setTitle}
        onToggleShareableLink={handleToggleShareableLinkFromDialog}
        editorContent={editor?.getHTML() || ''} onNavigateToYourNotes={() => navigate('/dashboard/your-notes')}
      />
      <NoteEditorToolbar
        editor={editor} canEdit={canEdit} isUploadingImage={isUploadingImage} isRefiningAI={isRefiningAI} session={session}
        onImageUpload={handleImageUpload} onRefineAI={handleRefineAI} onTranscription={(text) => editor?.chain().focus().insertContent(text + ' ').run()}
        currentFontSize={currentFontSize} currentFontFamily={currentFontFamily}
        onFontFamilyChange={(font) => editor?.chain().focus().setFontFamily(font).run()}
        onIncreaseFontSize={() => { const newSize = Math.min(parseInt(currentFontSize) + 2, 32); editor?.chain().focus().setFontSize(`${newSize}px`).run(); }}
        onDecreaseFontSize={() => { const newSize = Math.max(parseInt(currentFontSize) - 2, 10); editor?.chain().focus().setFontSize(`${newSize}px`).run(); }}
        noteTitle={title}
      />
      <div className="flex-grow overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default NoteEditor;