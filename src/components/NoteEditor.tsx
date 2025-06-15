import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Note } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

interface NoteEditorProps {
  noteId: string;
  onClose: () => void;
}

const NoteEditor = ({ noteId, onClose }: NoteEditorProps) => {
  const queryClient = useQueryClient();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchNote = async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (error) {
        showError('Failed to load note: ' + error.message);
        onClose();
        return;
      }
      setNote(data);
      setTitle(data.title);
      editor?.commands.setContent(data.content || '');
    };

    fetchNote();
  }, [noteId]);

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
    ],
    content: note?.content || '',
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none p-4 min-h-[300px] border rounded-md bg-background text-foreground',
      },
    },
  });

  const handleSave = async () => {
    if (!note || !editor) return;

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
      queryClient.invalidateQueries({ queryKey: ['notes'] }); // Invalidate notes query to refetch list
    } catch (error: any) {
      console.error('Error saving note:', error);
      showError('Failed to save note: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading note...</p>
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
        />
        <div className="flex space-x-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Note'}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleBold().run()} disabled={!editor || !editor.can().toggleBold()}>
          Bold
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleItalic().run()} disabled={!editor || !editor.can().toggleItalic()}>
          Italic
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleStrike().run()} disabled={!editor || !editor.can().toggleStrike()}>
          Strike
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleUnderline().run()} disabled={!editor || !editor.can().toggleUnderline()}>
          Underline
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleCode().run()} disabled={!editor || !editor.can().toggleCode()}>
          Code
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setParagraph().run()} disabled={!editor || !editor.can().setParagraph()}>
          Paragraph
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} disabled={!editor || !editor.can().toggleHeading({ level: 1 })}>
          H1
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} disabled={!editor || !editor.can().toggleHeading({ level: 2 })}>
          H2
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleBulletList().run()} disabled={!editor || !editor.can().toggleBulletList()}>
          Bullet List
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleOrderedList().run()} disabled={!editor || !editor.can().toggleOrderedList()}>
          Ordered List
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleBlockquote().run()} disabled={!editor || !editor.can().toggleBlockquote()}>
          Blockquote
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setHorizontalRule().run()} disabled={!editor || !editor.can().setHorizontalRule()}>
          HR
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setHardBreak().run()} disabled={!editor || !editor.can().setHardBreak()}>
          Break
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor || !editor.can().undo()}>
          Undo
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor || !editor.can().redo()}>
          Redo
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setColor('#958DF1').run()} disabled={!editor || !editor.can().setColor('#958DF1')}>
          Purple
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleHighlight({ color: '#fae0e0' }).run()} disabled={!editor || !editor.can().toggleHighlight({ color: '#fae0e0' })}>
          Highlight
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().unsetColor().run()} disabled={!editor || !editor.can().unsetColor()}>
          Unset Color
        </Button>
      </div>
      <div className="flex-grow overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default NoteEditor;