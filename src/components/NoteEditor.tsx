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
import Image from '@tiptap/extension-image'; // Import Image extension
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Note } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for unique filenames
import { ImageIcon, Bold, Italic, Underline as UnderlineIcon, Code, List, ListOrdered, Quote, Minus, Undo, Redo, Heading1, Heading2, AlignLeft, AlignCenter, AlignRight, AlignJustify, Palette, Highlighter } from 'lucide-react';
import { useSessionContext } from '@/contexts/SessionContext';

interface NoteEditorProps {
  noteId: string;
  onClose: () => void;
}

const NoteEditor = ({ noteId, onClose }: NoteEditorProps) => {
  const queryClient = useQueryClient();
  const { user } = useSessionContext();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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

  const handleImageUpload = useCallback(async (file: File) => {
    if (!user) {
      showError('You must be logged in to upload images.');
      return;
    }

    setIsUploadingImage(true);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${user.id}/${uuidv4()}.${fileExtension}`; // Store images in user-specific folders
    
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
  }, [user, editor]);

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
        allowBase64: true, // Allow base64 images for drag/drop initially, but we'll convert to URL
      }),
    ],
    content: note?.content || '',
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none p-4 min-h-[300px] border rounded-md bg-background text-foreground',
      },
      handleDrop: (view, event, slice, moved) => {
        if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            handleImageUpload(file);
            return true; // Prevent default image handling
          }
        }
        return false;
      },
      handlePaste: (view, event, slice) => {
        if (event.clipboardData?.files && event.clipboardData.files[0]) {
          const file = event.clipboardData.files[0];
          if (file.type.startsWith('image/')) {
            handleImageUpload(file);
            return true; // Prevent default image handling
          }
        }
        return false;
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleImageUpload(event.target.files[0]);
    }
  };

  if (!note || !editor) {
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
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().toggleBold()}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().toggleItalic()}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().toggleStrike()}>
          Strike
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} disabled={!editor.can().toggleUnderline()}>
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleCode().run()} disabled={!editor.can().toggleCode()}>
          <Code className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().setParagraph().run()} disabled={!editor.can().setParagraph()}>
          P
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} disabled={!editor.can().toggleHeading({ level: 1 })}>
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} disabled={!editor.can().toggleHeading({ level: 2 })}>
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={!editor.can().toggleBulletList()}>
          <List className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} disabled={!editor.can().toggleOrderedList()}>
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBlockquote().run()} disabled={!editor.can().toggleBlockquote()}>
          <Quote className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().setHorizontalRule().run()} disabled={!editor.can().setHorizontalRule()}>
          <Minus className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().setHardBreak().run()} disabled={!editor.can().setHardBreak()}>
          BR
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().setTextAlign('left').run()} disabled={!editor.can().setTextAlign('left')}>
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().setTextAlign('center').run()} disabled={!editor.can().setTextAlign('center')}>
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().setTextAlign('right').run()} disabled={!editor.can().setTextAlign('right')}>
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().setTextAlign('justify').run()} disabled={!editor.can().setTextAlign('justify')}>
          <AlignJustify className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().setColor('#958DF1').run()} disabled={!editor.can().setColor('#958DF1')}>
          <Palette className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHighlight({ color: '#fae0e0' }).run()} disabled={!editor.can().toggleHighlight({ color: '#fae0e0' })}>
          <Highlighter className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => editor.chain().focus().unsetColor().run()} disabled={!editor.can().unsetColor()}>
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
            disabled={isUploadingImage}
          />
        </label>
      </div>
      <div className="flex-grow overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default NoteEditor;