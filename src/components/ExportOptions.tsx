import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { FileText, FileType, Copy } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { showSuccess, showError } from '@/utils/toast';

interface ExportOptionsProps {
  title: string;
  contentHtml: string;
  contentPlainText: string;
}

const ExportOptions = ({ title, contentHtml, contentPlainText }: ExportOptionsProps) => {
  const exportAsPdf = () => {
    try {
      const doc = new jsPDF();
      const margin = 10; // 10mm margin on all sides
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxWidth = pageWidth - 2 * margin; // Content width within margins

      // Split the plain text into lines that fit within the page width
      const textLines = doc.splitTextToSize(contentPlainText, maxWidth);

      let y = margin; // Starting Y position for text

      textLines.forEach((line: string) => {
        // Check if the current line will exceed the page height
        // If it does, add a new page and reset Y position
        if (y + doc.getTextDimensions(line).h > pageHeight - margin) {
          doc.addPage();
          y = margin; // Reset Y for new page
        }
        doc.text(line, margin, y); // Add the line of text
        y += doc.getTextDimensions(line).h; // Move Y down for the next line
      });

      doc.save(`${title || 'Untitled Note'}.pdf`);
      showSuccess('Note exported as PDF!');
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      showError('Failed to export PDF: ' + error.message);
    }
  };

  const copyToClipboard = () => {
    try {
      navigator.clipboard.writeText(contentPlainText);
      showSuccess('Note content copied to clipboard!');
    } catch (error: any) {
      console.error('Error copying to clipboard:', error);
      showError('Failed to copy to clipboard: ' + error.message);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportAsPdf}>
          <FileType className="h-4 w-4 mr-2" /> Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyToClipboard}>
          <Copy className="h-4 w-4 mr-2" /> Copy to Clipboard
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportOptions;