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
      doc.html(contentHtml, {
        callback: function (doc) {
          doc.save(`${title || 'Untitled Note'}.pdf`);
          showSuccess('Note exported as PDF!');
        },
        x: 10,
        y: 10,
        html2canvas: {
          scale: 1.0, // Increased scale for better resolution
          // You can also try other options like:
          // logging: true, // For debugging html2canvas
          // useCORS: true, // If images are from different origins
        },
        margin: [10, 10, 10, 10], // Add margin around the content (top, right, bottom, left)
        autoPaging: 'text', // Enable auto-paging for long content
      });
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