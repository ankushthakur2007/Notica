import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { showSuccess, showError } from './toast';

// Helper to convert HTML to plain text
const htmlToPlainText = (html: string): string => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
};

export const exportAsPdf = (title: string, htmlContent: string) => {
  try {
    const doc = new jsPDF();
    
    // Create a container for the HTML content to be rendered
    const container = document.createElement('div');
    // Basic styling for the PDF output
    container.innerHTML = `
      <div style="font-family: 'Helvetica', 'sans-serif'; font-size: 12px; line-height: 1.5;">
        <h1>${title}</h1>
        ${htmlContent}
      </div>
    `;
    container.style.width = '180mm'; // A4 width minus margins
    container.style.padding = '10px';
    document.body.appendChild(container);

    doc.html(container, {
      callback: function (doc) {
        doc.save(`${title}.pdf`);
        document.body.removeChild(container); // Clean up the container
        showSuccess('PDF export started!');
      },
      x: 15,
      y: 15,
      width: 180,
      windowWidth: container.scrollWidth,
    });
  } catch (error) {
    console.error('PDF Export Error:', error);
    showError('Failed to export as PDF.');
  }
};

export const exportAsPlainText = (title: string, htmlContent: string) => {
  try {
    const plainText = `${title}\n\n${htmlToPlainText(htmlContent)}`;
    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${title}.txt`);
    showSuccess('Text export started!');
  } catch (error) {
    console.error('Text Export Error:', error);
    showError('Failed to export as plain text.');
  }
};

export const copyToClipboard = (htmlContent: string) => {
  try {
    const plainText = htmlToPlainText(htmlContent);
    navigator.clipboard.writeText(plainText);
    showSuccess('Note content copied to clipboard!');
  } catch (error) {
    console.error('Clipboard Copy Error:', error);
    showError('Failed to copy to clipboard.');
  }
};