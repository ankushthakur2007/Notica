import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { FileText, FileType, Copy } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Document, Paragraph, TextRun, Packer } from 'docx'; // Import docx components
import { saveAs } from 'file-saver';
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
          scale: 0.8, // Adjust scale for better fit
        },
      });
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      showError('Failed to export PDF: ' + error.message);
    }
  };

  const exportAsDocx = async () => {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: title || 'Untitled Note',
                  bold: true,
                  size: 32, // Approx 16pt font size
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: contentPlainText, // Use plain text for DOCX for simplicity
                }),
              ],
            }),
          ],
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), `${title || 'Untitled Note'}.docx`);
      showSuccess('Note exported as DOCX!');
    } catch (error: any) {
      console.error('Error exporting DOCX:', error);
      showError('Failed to export DOCX: ' + error.message);
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
        <DropdownMenuItem onClick={exportAsDocx}>
          <FileType className="h-4 w-4 mr-2" /> Export as DOCX
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyToClipboard}>
          <Copy className="h-4 w-4 mr-2" /> Copy to Clipboard
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportOptions;