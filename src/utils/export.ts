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
    
    // Set explicit styling to ensure proper colors regardless of dark/light mode
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '180mm';
    container.style.padding = '10px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#000000';
    
    // Create styled content with explicit colors for PDF
    container.innerHTML = `
      <style>
        * {
          color: #000000 !important;
          background-color: transparent !important;
        }
        h1, h2, h3, h4, h5, h6 {
          color: #111111 !important;
          margin-bottom: 12px;
          font-weight: bold;
        }
        h1 { font-size: 24px; border-bottom: 2px solid #333333; padding-bottom: 8px; margin-bottom: 16px; }
        h2 { font-size: 20px; }
        h3 { font-size: 18px; }
        h4 { font-size: 16px; }
        p { margin-bottom: 10px; line-height: 1.6; }
        ul, ol { margin-left: 20px; margin-bottom: 10px; }
        li { margin-bottom: 4px; }
        blockquote { 
          border-left: 3px solid #666666; 
          padding-left: 12px; 
          margin: 10px 0; 
          color: #444444 !important;
          font-style: italic;
        }
        code {
          background-color: #f4f4f4 !important;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 11px;
        }
        pre {
          background-color: #f4f4f4 !important;
          padding: 12px;
          border-radius: 6px;
          overflow-x: auto;
          margin: 10px 0;
        }
        pre code {
          background-color: transparent !important;
          padding: 0;
        }
        a { color: #0066cc !important; text-decoration: underline; }
        strong, b { font-weight: bold; }
        em, i { font-style: italic; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        th, td { border: 1px solid #cccccc; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0 !important; font-weight: bold; }
        img { max-width: 100%; height: auto; }
        hr { border: none; border-top: 1px solid #cccccc; margin: 16px 0; }
      </style>
      <div style="font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; line-height: 1.6; color: #000000; background-color: #ffffff;">
        <h1 style="color: #000000; font-size: 24px; font-weight: bold; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #333333;">${title}</h1>
        <div style="color: #000000;">${htmlContent}</div>
      </div>
    `;
    
    document.body.appendChild(container);

    doc.html(container, {
      callback: function (doc) {
        doc.save(`${title}.pdf`);
        document.body.removeChild(container);
        showSuccess('PDF exported successfully!');
      },
      x: 15,
      y: 15,
      width: 180,
      windowWidth: 650,
      html2canvas: {
        scale: 0.265,
        useCORS: true,
        backgroundColor: '#ffffff',
      },
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