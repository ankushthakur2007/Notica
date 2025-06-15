import React, { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { FileText, FileType, Copy, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { useSessionContext } from '@/contexts/SessionContext';

interface ExportOptionsProps {
  title: string;
  contentHtml: string;
  contentPlainText: string;
}

const ExportOptions = ({ title, contentHtml, contentPlainText }: ExportOptionsProps) => { // Destructure contentHtml here
  const { session } = useSessionContext();
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const exportAsPdf = async () => {
    if (!session?.access_token) {
      showError('You must be logged in to export notes as PDF.');
      return;
    }

    setIsExportingPdf(true);
    try {
      const response = await fetch('https://yibrrjblxuoebnecbntp.supabase.co/functions/v1/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ htmlContent, title }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PDF.');
      }

      const pdfBlob = await response.blob();
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'Untitled Note'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showSuccess('Note exported as PDF successfully!');
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      showError('Failed to export PDF: ' + error.message);
    } finally {
      setIsExportingPdf(false);
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
        <Button variant="outline" size="sm" disabled={isExportingPdf}>
          {isExportingPdf ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <FileText className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportAsPdf} disabled={isExportingPdf}>
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