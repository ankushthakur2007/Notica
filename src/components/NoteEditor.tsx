import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent, Editor, BubbleMenu } from '@tiptap/react';
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
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { useAppStore } from '@/stores/appStore';
import { useNavigate, useParams } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import NoteEditorToolbar from './NoteEditorToolbar';
import NoteHeader from './NoteHeader';
import { Extension } from '@tiptap/core';
import ResizableImage from './editor/ResizableImageNode';
import { usePresence } from '@/hooks/use-presence';
import { useDebounce } from '@/hooks/use-debounce';
import { MessageSquarePlus, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from './ui/textarea';

interface NoteEditorProps {
  note: Note;
}

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

const NoteEditor = ({ note }: NoteEditorProps) => {
  const queryClient = useQueryClient();
  const { user, session, updateNote, deleteNote: deleteNoteFromStore } = useAppStore();
  const navigate = useNavigate();
  const { noteId } = useParams<{ noteId: string }>();
  const isMobileView = useIsMobile();
  const { presentUsers, channel } = usePresence(noteId);

  const [title, setTitle] = useState(note.title);
  const [currentTitleInput, setCurrentTitleInput] = useState(note.title);
  const debouncedTitle = useDebounce(currentTitleInput, 500);
  
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefiningAI, setIsRefiningAI] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState('16');
  const [currentFontFamily, setCurrentFontFamily] = useState('Inter');
  const [lastSavedTitle, setLastSavedTitle] = useState(note.title);
  const [lastSavedContent, setLastSavedContent] = useState(note.content || '');
  const isBroadcastingRef = useRef(false);

  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [highlightedTextForComment, setHighlightedTextForComment] = useState<string | null>(null);

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
    content: note.content || '',
    editorProps: {
      attributes: { 
        class: `prose dark:prose-invert max-w-none focus:outline-none text-foreground ${isMobileView ? 'text-base' : ''}`,
        'data-editor': 'true',
      },
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
    onUpdate: ({ editor }) => {
      if (isBroadcastingRef.current) return;
      const content = editor.getHTML();
      channel?.send({
        type: 'broadcast',
        event: 'content-update',
        payload: { content, senderId: user?.id },
      });
    },
    onSelectionUpdate: ({ editor }) => {
      const attrs = editor.getAttributes('textStyle');
      setCurrentFontSize(attrs.fontSize?.replace('px', '') || '16');
      setCurrentFontFamily(attrs.fontFamily || 'Inter');
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ content, highlighted_text }: { content: string; highlighted_text: string | null }) => {
      if (!user || !noteId) throw new Error('User or Note ID is missing.');
      const { error } = await supabase.from('comments').insert({
        note_id: noteId,
        user_id: user.id,
        content,
        highlighted_text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Comment added!');
      queryClient.invalidateQueries({ queryKey: ['comments', noteId] });
      setIsCommentDialogOpen(false);
      setCommentText('');
      setHighlightedTextForComment(null);
    },
    onError: (error: any) => {
      showError(`Failed to add comment: ${error.message}`);
    },
  });

  const handleOpenCommentDialog = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    if (!text.trim()) return;
    
    setHighlightedTextForComment(text);
    setIsCommentDialogOpen(true);
  }, [editor]);

  const handleCommentSubmit = () => {
    if (!commentText.trim()) {
      showError("Comment cannot be empty.");
      return;
    }
    addCommentMutation.mutate({ content: commentText, highlighted_text: highlightedTextForComment });
  };

  useEffect(() => {
    if (debouncedTitle && debouncedTitle !== title) {
      channel?.send({
        type: 'broadcast',
        event: 'title-update',
        payload: { title: debouncedTitle, senderId: user?.id },
      });
    }
  }, [debouncedTitle, title, channel, user?.id]);

  useEffect(() => {
    if (!channel || !editor) return;
    const contentUpdateHandler = (payload: any) => {
      if (payload.payload.senderId !== user?.id) {
        isBroadcastingRef.current = true;
        const { from, to } = editor.state.selection;
        editor.commands.setContent(payload.payload.content, false);
        editor.commands.setTextSelection({ from, to });
        isBroadcastingRef.current = false;
      }
    };
    const titleUpdateHandler = (payload: any) => {
      if (payload.payload.senderId !== user?.id) {
        setCurrentTitleInput(payload.payload.title);
        setTitle(payload.payload.title);
      }
    };
    channel.on('broadcast', { event: 'content-update' }, contentUpdateHandler);
    channel.on('broadcast', { event: 'title-update' }, titleUpdateHandler);
  }, [channel, editor, user?.id]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(canEdit);
    }
  }, [editor, canEdit]);

  useEffect(() => {
    if (!editor || !note) return;
    if (editor.isFocused) return;

    setTitle(note.title);
    setCurrentTitleInput(note.title);
    setLastSavedTitle(note.title);
    setLastSavedContent(note.content || '');
    if (editor.getHTML() !== note.content) {
      editor.commands.setContent(note.content || '');
    }
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
      updateNote(data);
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
      deleteNoteFromStore(note.id);
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

  const handleIncreaseFontSize = useCallback(() => {
    if (!editor || !canEdit) return;
    const { fontSize } = editor.getAttributes('textStyle');
    const currentSize = parseInt(fontSize || '16', 10);
    const newSize = Math.min(currentSize + 2, 32);
    editor.chain().focus().setFontSize(`${newSize}px`).run();
  }, [editor, canEdit]);

  const handleDecreaseFontSize = useCallback(() => {
    if (!editor || !canEdit) return;
    const { fontSize } = editor.getAttributes('textStyle');
    const currentSize = parseInt(fontSize || '16', 10);
    const newSize = Math.max(currentSize - 2, 10);
    editor.chain().focus().setFontSize(`${newSize}px`).run();
  }, [editor, canEdit]);

  const commonProps = {
    noteId, note, user, isNewNote: false, isNoteOwner, canEdit, title,
    onDeleteNote: handleDelete, isDeleting, onRenameNote: setTitle,
    onToggleShareableLink: handleToggleShareableLinkFromDialog,
    onNavigateToYourNotes: () => navigate('/dashboard/your-notes'),
    editor, isUploadingImage, isRefiningAI, session,
    onImageUpload: handleImageUpload, onRefineAI: handleRefineAI,
    onTranscription: (text: string) => editor?.chain().focus().insertContent(text + ' ').run(),
    currentFontSize, currentFontFamily,
    onFontFamilyChange: (font: string) => editor?.chain().focus().setFontFamily(font).run(),
    onIncreaseFontSize: handleIncreaseFontSize,
    onDecreaseFontSize: handleDecreaseFontSize,
    noteTitle: title,
  };

  return (
    <div className="p-6 w-full overflow-y-auto h-screen flex flex-col">
      <div className="max-w-4xl w-full mx-auto">
        <NoteHeader
          {...commonProps}
          currentTitleInput={currentTitleInput}
          setCurrentTitleInput={setCurrentTitleInput}
          onSaveNote={() => saveNote(currentTitleInput, editor?.getHTML() || '')}
          editorContent={editor?.getHTML() || ''}
          presentUsers={presentUsers}
        />
        <NoteEditorToolbar {...commonProps} />
        <div className="mt-2 flex-grow overflow-y-auto bg-card/50 dark:bg-gray-900/50 border border-border/50 backdrop-blur-md rounded-lg p-4 relative">
          {editor && (
            <BubbleMenu editor={editor} tippyOptions={{ 
              duration: 100,
              zIndex: 99,
              placement: 'bottom-start',
              shouldShow: ({ editor, view, state, from, to }) => {
                return from !== to
              }
            }}>
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenCommentDialog}
              >
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Comment
              </Button>
            </BubbleMenu>
          )}
          <EditorContent editor={editor} />
        </div>
      </div>
      <Dialog open={isCommentDialogOpen} onOpenChange={setIsCommentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a comment</DialogTitle>
            {highlightedTextForComment && (
              <DialogDescription className="mt-2">
                Replying to: <span className="italic">"{highlightedTextForComment}"</span>
              </DialogDescription>
            )}
          </DialogHeader>
          <Textarea 
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="What are your thoughts?"
            className="mt-4"
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsCommentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCommentSubmit} disabled={addCommentMutation.isPending}>
              {addCommentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Comment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NoteEditor;