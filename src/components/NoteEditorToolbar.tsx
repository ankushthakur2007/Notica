import React, { useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageIcon, Bold, Italic, Underline as UnderlineIcon, Code, List, ListOrdered, Quote, Minus, Undo, Redo, Heading1, Heading2, AlignLeft, AlignCenter, AlignRight, AlignJustify, Palette, Highlighter, Sparkles, Download, Plus, Minus as MinusIcon, ChevronDown } from 'lucide-react';
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
import jsPDF from 'jspdf';
import { showError } from '@/utils/toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Session } from '@supabase/supabase-js';

interface NoteEditorToolbarProps {
  editor: Editor | null;
  canEdit: boolean;
  isUploadingImage: boolean;
  isRefiningAI: boolean;
  session: Session | null;
  // Removed isOnline prop
  onImageUpload: (file: File) => Promise<void>;
  onRefineAI: () => Promise<void>;
  onTranscription: (text: string) => void;
  currentFontSize: string;
  currentFontFamily: string;
  onFontFamilyChange: (fontFamily: string) => void;
  onIncreaseFontSize: () => void;
  onDecreaseFontSize: () => void;
  noteTitle: string; // Added to pass to PDF export
}

const NoteEditorToolbar = ({
  editor,
  canEdit,
  isUploadingImage,
  isRefiningAI,
  session,
  // Removed isOnline prop
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
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);

  const getPlainTextContent = useCallback(() => {
    if (!editor) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editor.getHTML();
    return tempDiv.textContent || tempDiv.innerText || '';
  }, [editor]);

  const handleExportAsPDF = useCallback(() => {
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
      const titleLines = pdf.splitTextToSize(noteTitle || 'Untitled Note', maxWidth);
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

      pdf.save(`${noteTitle || 'untitled-note'}.pdf`);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      showError('Failed to generate PDF: ' + error.message);
    }
  }, [editor, getPlainTextContent, noteTitle]);

  const handleExportAsText = useCallback(() => {
    if (!editor || editor.isEmpty) {
      showError('Note is empty, nothing to export.');
      return;
    }
    const plainText = getPlainTextContent();
    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${noteTitle || 'untitled-note'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [editor, getPlainTextContent, noteTitle]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!editor || editor.isEmpty) {
      showError('Note is empty, nothing to copy.');
      return;
    }
    const plainText = getPlainTextContent();
    try {
      await navigator.clipboard.writeText(plainText);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      showError('Failed to copy content to clipboard.');
    }
  }, [editor, getPlainTextContent]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onImageUpload(event.target.files[0]);
    }
  }, [onImageUpload]);

  const BasicFormattingTools = () => (
    <div className="flex flex-wrap gap-1">
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleBold().run()} disabled={!editor?.can().toggleBold() || !canEdit}>
        <Bold className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleItalic().run()} disabled={!editor?.can().toggleItalic() || !canEdit}>
        <Italic className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleUnderline().run()} disabled={!editor?.can().toggleUnderline() || !canEdit}>
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleCode().run()} disabled={!editor?.can().toggleCode() || !canEdit}>
        <Code className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleBulletList().run()} disabled={!editor?.can().toggleBulletList() || !canEdit}>
        <List className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleOrderedList().run()} disabled={!editor?.can().toggleOrderedList() || !canEdit}>
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo() || !canEdit}>
        <Undo className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo() || !canEdit}>
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );

  const AdvancedFormattingTools = () => (
    <div className="flex flex-wrap gap-1 mt-2">
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleStrike().run()} disabled={!editor?.can().toggleStrike() || !canEdit}>
        Strike
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setParagraph().run()} disabled={!editor?.can().setParagraph() || !canEdit}>
        P
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} disabled={!editor?.can().toggleHeading({ level: 1 }) || !canEdit}>
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} disabled={!editor?.can().toggleHeading({ level: 2 }) || !canEdit}>
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleBlockquote().run()} disabled={!editor?.can().toggleBlockquote() || !canEdit}>
        <Quote className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setHorizontalRule().run()} disabled={!editor?.can().setHorizontalRule() || !canEdit}>
        <Minus className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setHardBreak().run()} disabled={!editor?.can().setHardBreak() || !canEdit}>
        BR
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setTextAlign('left').run()} disabled={!editor?.can().setTextAlign('left') || !canEdit}>
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setTextAlign('center').run()} disabled={!editor?.can().setTextAlign('center') || !canEdit}>
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setTextAlign('right').run()} disabled={!editor?.can().setTextAlign('right') || !canEdit}>
        <AlignRight className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setTextAlign('justify').run()} disabled={!editor?.can().setTextAlign('justify') || !canEdit}>
        <AlignJustify className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={!canEdit}>
            <Palette className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => editor?.chain().focus().setColor('#FF0000').run()} disabled={!editor?.can().setColor('#FF0000') || !canEdit}>
            <span className="w-4 h-4 rounded-full bg-red-500 mr-2"></span> Red
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor?.chain().focus().setColor('#0000FF').run()} disabled={!editor?.can().setColor('#0000FF') || !canEdit}>
            <span className="w-4 h-4 rounded-full bg-blue-500 mr-2"></span> Blue
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor?.chain().focus().setColor('#008000').run()} disabled={!editor?.can().setColor('#008000') || !canEdit}>
            <span className="w-4 h-4 rounded-full bg-green-500 mr-2"></span> Green
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor?.chain().focus().setColor('#800080').run()} disabled={!editor?.can().setColor('#800080') || !canEdit}>
            <span className="w-4 h-4 rounded-full bg-purple-500 mr-2"></span> Purple
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor?.chain().focus().setColor('#FFA500').run()} disabled={!editor?.can().setColor('#FFA500') || !canEdit}>
            <span className="w-4 h-4 rounded-full bg-orange-500 mr-2"></span> Orange
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor?.chain().focus().setColor('#000000').run()} disabled={!editor?.can().setColor('#000000') || !canEdit}>
            <span className="w-4 h-4 rounded-full bg-black mr-2"></span> Black
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor?.chain().focus().setColor('#FFFFFF').run()} disabled={!editor?.can().setColor('#FFFFFF') || !canEdit}>
            <span className="w-4 h-4 rounded-full bg-white border border-gray-300 mr-2"></span> White
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => editor?.chain().focus().unsetColor().run()} disabled={!editor?.can().unsetColor() || !canEdit}>
            Unset Color
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleHighlight({ color: '#fae0e0' }).run()} disabled={!editor?.can().toggleHighlight({ color: '#fae0e0' }) || !canEdit}>
        <Highlighter className="h-4 w-4" />
      </Button>
      
      <Select value={currentFontFamily} onValueChange={onFontFamilyChange} disabled={!canEdit}>
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
          onClick={onDecreaseFontSize}
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
          onClick={onIncreaseFontSize}
          disabled={!canEdit}
          className="h-9 px-2 rounded-l-none border-l"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="mb-4">
      {isMobileView ? (
        <div className="space-y-3">
          <BasicFormattingTools />
          
          <div className="flex flex-wrap gap-1">
            <VoiceRecorder onTranscription={onTranscription} isIconButton={true} />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefineAI} 
              disabled={isRefiningAI || !editor?.getHTML() || editor.getHTML() === '<p></p>' || !canEdit || !session} // Removed isOnline check
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
                disabled={isUploadingImage || !canEdit} // Removed isOnline check
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
        <div className="flex flex-wrap gap-1">
          <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleBold().run()} disabled={!editor?.can().toggleBold() || !canEdit}>
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleItalic().run()} disabled={!editor?.can().toggleItalic() || !canEdit}>
            <Italic className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleStrike().run()} disabled={!editor?.can().toggleStrike() || !canEdit}>
            Strike
          </Button>
          <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleUnderline().run()} disabled={!editor?.can().toggleUnderline() || !canEdit}>
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleCode().run()} disabled={!editor?.can().toggleCode() || !canEdit}>
            <Code className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setParagraph().run()} disabled={!editor?.can().setParagraph() || !canEdit}>
            P
          </Button>
          <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} disabled={!editor?.can().toggleHeading({ level: 1 }) || !canEdit}>
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} disabled={!editor?.can().toggleHeading({ level: 2 }) || !canEdit}>
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleBulletList().run()} disabled={!editor?.can().toggleBulletList() || !canEdit}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleOrderedList().run()} disabled={!editor?.can().toggleOrderedList() || !canEdit}>
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleBlockquote().run()} disabled={!editor?.can().toggleBlockquote() || !canEdit}>
            <Quote className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setHorizontalRule().run()} disabled={!editor?.can().setHorizontalRule() || !canEdit}>
            <Minus className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setHardBreak().run()} disabled={!editor?.can().setHardBreak() || !canEdit}>
            BR
          </Button>
          <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo() || !canEdit}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo() || !canEdit}>
            <Redo className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setTextAlign('left').run()} disabled={!editor?.can().setTextAlign('left') || !canEdit}>
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setTextAlign('center').run()} disabled={!editor?.can().setTextAlign('center') || !canEdit}>
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setTextAlign('right').run()} disabled={!editor?.can().setTextAlign('right') || !canEdit}>
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().setTextAlign('justify').run()} disabled={!editor?.can().setTextAlign('justify') || !canEdit}>
            <AlignJustify className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={!canEdit}>
                <Palette className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => editor?.chain().focus().setColor('#FF0000').run()} disabled={!editor?.can().setColor('#FF0000') || !canEdit}>
                <span className="w-4 h-4 rounded-full bg-red-500 mr-2"></span> Red
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor?.chain().focus().setColor('#0000FF').run()} disabled={!editor?.can().setColor('#0000FF') || !canEdit}>
                <span className="w-4 h-4 rounded-full bg-blue-500 mr-2"></span> Blue
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor?.chain().focus().setColor('#008000').run()} disabled={!editor?.can().setColor('#008000') || !canEdit}>
                <span className="w-4 h-4 rounded-full bg-green-500 mr-2"></span> Green
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor?.chain().focus().setColor('#800080').run()} disabled={!editor?.can().setColor('#800080') || !canEdit}>
                <span className="w-4 h-4 rounded-full bg-purple-500 mr-2"></span> Purple
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor?.chain().focus().setColor('#FFA500').run()} disabled={!editor?.can().setColor('#FFA500') || !canEdit}>
                <span className="w-4 h-4 rounded-full bg-orange-500 mr-2"></span> Orange
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor?.chain().focus().setColor('#000000').run()} disabled={!editor?.can().setColor('#000000') || !canEdit}>
                <span className="w-4 h-4 rounded-full bg-black mr-2"></span> Black
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor?.chain().focus().setColor('#FFFFFF').run()} disabled={!editor?.can().setColor('#FFFFFF') || !canEdit}>
                <span className="w-4 h-4 rounded-full bg-white border border-gray-300 mr-2"></span> White
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => editor?.chain().focus().unsetColor().run()} disabled={!editor?.can().unsetColor() || !canEdit}>
                Unset Color
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleHighlight({ color: '#fae0e0' }).run()} disabled={!editor?.can().toggleHighlight({ color: '#fae0e0' }) || !canEdit}>
            <Highlighter className="h-4 w-4" />
          </Button>
          
          <Select value={currentFontFamily} onValueChange={onFontFamilyChange} disabled={!canEdit}>
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
              onClick={onDecreaseFontSize}
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
              onClick={onIncreaseFontSize}
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
              disabled={isUploadingImage || !canEdit} // Removed isOnline check
            />
          </label>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefineAI} 
            disabled={isRefiningAI || !editor?.getHTML() || editor.getHTML() === '<p></p>' || !canEdit || !session} // Removed isOnline check
          >
            <Sparkles className="mr-2 h-4 w-4" /> 
            {isRefiningAI ? 'Refining...' : 'Refine with AI'}
          </Button>
          <VoiceRecorder onTranscription={onTranscription} isIconButton={true} />
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
  );
};

export default NoteEditorToolbar;