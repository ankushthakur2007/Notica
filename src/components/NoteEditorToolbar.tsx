import React from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageIcon, Bold, Italic, Underline as UnderlineIcon, Code, List, ListOrdered, Quote, Minus, Undo, Redo, Heading1, Heading2, AlignLeft, AlignCenter, AlignRight, AlignJustify, Palette, Highlighter, Sparkles, Download, Plus, Minus as MinusIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import VoiceRecorder from '@/components/VoiceRecorder';
import jsPDF from 'jspdf';
import { showError } from '@/utils/toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Session } from '@supabase/supabase-js';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';

interface NoteEditorToolbarProps {
  editor: Editor | null;
  canEdit: boolean;
  isUploadingImage: boolean;
  isRefiningAI: boolean;
  session: Session | null;
  onImageUpload: (file: File) => Promise<void>;
  onRefineAI: () => Promise<void>;
  onTranscription: (text: string) => void;
  currentFontSize: string;
  currentFontFamily: string;
  onFontFamilyChange: (fontFamily: string) => void;
  onIncreaseFontSize: () => void;
  onDecreaseFontSize: () => void;
  noteTitle: string;
}

const NoteEditorToolbar = ({
  editor,
  canEdit,
  isUploadingImage,
  isRefiningAI,
  session,
  onImageUpload,
  onRefineAI,
  onTranscription,
  currentFontSize,
  currentFontFamily,
  onFontFamilyChange,
  onIncreaseFontSize,
  onDecreaseFontSize,
  noteTitle,
}: NoteEditorToolbarProps) => {
  const isMobileView = useIsMobile();
  const [voiceLanguage, setVoiceLanguage] = React.useState('en');

  const getPlainTextContent = React.useCallback(() => {
    if (!editor) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editor.getHTML();
    return tempDiv.textContent || tempDiv.innerText || '';
  }, [editor]);

  const handleExportAsPDF = React.useCallback(() => {
    if (!editor || editor.isEmpty) {
      showError('Note is empty, nothing to export.');
      return;
    }
    const pdf = new jsPDF();
    pdf.text(getPlainTextContent(), 10, 10);
    pdf.save(`${noteTitle || 'untitled-note'}.pdf`);
  }, [editor, getPlainTextContent, noteTitle]);

  const handleFileSelect = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onImageUpload(event.target.files[0]);
    }
  }, [onImageUpload]);

  const AdvancedFormattingTools = () => (
    <div className="flex flex-wrap gap-2 justify-center">
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleStrike().run()} disabled={!editor?.can().toggleStrike() || !canEdit}>Strike</Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setParagraph().run()} disabled={!editor?.can().setParagraph() || !canEdit}>P</Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} disabled={!editor?.can().toggleHeading({ level: 1 }) || !canEdit}><Heading1 className="h-4 w-4" /></Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} disabled={!editor?.can().toggleHeading({ level: 2 }) || !canEdit}><Heading2 className="h-4 w-4" /></Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleBlockquote().run()} disabled={!editor?.can().toggleBlockquote() || !canEdit}><Quote className="h-4 w-4" /></Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setHorizontalRule().run()} disabled={!editor?.can().setHorizontalRule() || !canEdit}><Minus className="h-4 w-4" /></Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setTextAlign('left').run()} disabled={!editor?.can().setTextAlign('left') || !canEdit}><AlignLeft className="h-4 w-4" /></Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setTextAlign('center').run()} disabled={!editor?.can().setTextAlign('center') || !canEdit}><AlignCenter className="h-4 w-4" /></Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setTextAlign('right').run()} disabled={!editor?.can().setTextAlign('right') || !canEdit}><AlignRight className="h-4 w-4" /></Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleHighlight({ color: '#fae0e0' }).run()} disabled={!editor?.can().toggleHighlight({ color: '#fae0e0' }) || !canEdit}><Highlighter className="h-4 w-4" /></Button>
      <label htmlFor="image-upload-mobile" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer"><ImageIcon className="h-4 w-4" /></label>
      <input id="image-upload-mobile" type="file" accept="image/*" onChange={handleFileSelect} className="hidden" disabled={isUploadingImage || !canEdit} />
    </div>
  );

  if (isMobileView) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t border-border/50 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="flex justify-around items-center w-full max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().toggleBold().run()} disabled={!editor?.can().toggleBold() || !canEdit}><Bold className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().toggleItalic().run()} disabled={!editor?.can().toggleItalic() || !canEdit}><Italic className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().toggleBulletList().run()} disabled={!editor?.can().toggleBulletList() || !canEdit}><List className="h-5 w-5" /></Button>
          <VoiceRecorder onTranscription={onTranscription} language={voiceLanguage} isIconButton={true} />
          <Button variant="ghost" size="icon" onClick={onRefineAI} disabled={isRefiningAI || !editor?.getHTML() || editor.getHTML() === '<p></p>' || !canEdit || !session}><Sparkles className="h-5 w-5" /></Button>
          <Drawer>
            <DrawerTrigger asChild><Button variant="ghost" size="icon"><Plus className="h-5 w-5" /></Button></DrawerTrigger>
            <DrawerContent><div className="p-4 mx-auto w-full max-w-md"><h2 className="text-lg font-semibold text-center mb-4">More Tools</h2><AdvancedFormattingTools /></div></DrawerContent>
          </Drawer>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 border-b sticky top-0 bg-background/80 backdrop-blur-sm z-10">
      <div className="flex flex-wrap gap-1">
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleBold().run()} disabled={!editor?.can().toggleBold() || !canEdit}><Bold className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleItalic().run()} disabled={!editor?.can().toggleItalic() || !canEdit}><Italic className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleUnderline().run()} disabled={!editor?.can().toggleUnderline() || !canEdit}><UnderlineIcon className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleCode().run()} disabled={!editor?.can().toggleCode() || !canEdit}><Code className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleBulletList().run()} disabled={!editor?.can().toggleBulletList() || !canEdit}><List className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleOrderedList().run()} disabled={!editor?.can().toggleOrderedList() || !canEdit}><ListOrdered className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo() || !canEdit}><Undo className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo() || !canEdit}><Redo className="h-4 w-4" /></Button>
        <Select value={currentFontFamily} onValueChange={onFontFamilyChange} disabled={!canEdit}>
          <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Inter">Inter</SelectItem>
            <SelectItem value="Roboto">Roboto</SelectItem>
            <SelectItem value="Open Sans">Open Sans</SelectItem>
            <SelectItem value="Lato">Lato</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center border rounded-md">
          <Button variant="ghost" size="sm" onClick={onDecreaseFontSize} disabled={!canEdit} className="h-9 px-2 rounded-r-none border-r"><MinusIcon className="h-3 w-3" /></Button>
          <div className="flex items-center px-2 min-w-[40px] justify-center text-sm">{currentFontSize}px</div>
          <Button variant="ghost" size="sm" onClick={onIncreaseFontSize} disabled={!canEdit} className="h-9 px-2 rounded-l-none border-l"><Plus className="h-3 w-3" /></Button>
        </div>
        <label htmlFor="image-upload-desktop" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer"><ImageIcon className="h-4 w-4 mr-2" />{isUploadingImage ? 'Uploading...' : 'Upload Image'}</label>
        <input id="image-upload-desktop" type="file" accept="image/*" onChange={handleFileSelect} className="hidden" disabled={isUploadingImage || !canEdit} />
        <Button variant="outline" size="sm" onClick={onRefineAI} disabled={isRefiningAI || !editor?.getHTML() || editor.getHTML() === '<p></p>' || !canEdit || !session}><Sparkles className="mr-2 h-4 w-4" />{isRefiningAI ? 'Refining...' : 'Refine with AI'}</Button>
        
        <div className="flex items-center gap-1">
          <Select value={voiceLanguage} onValueChange={setVoiceLanguage} disabled={!canEdit}>
            <SelectTrigger className="w-[110px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map(lang => (
                <SelectItem key={lang.value} value={lang.value} className="text-xs">{lang.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <VoiceRecorder onTranscription={onTranscription} language={voiceLanguage} isIconButton={true} />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Download className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportAsPDF} disabled={!editor || editor.isEmpty}>Export as PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default NoteEditorToolbar;