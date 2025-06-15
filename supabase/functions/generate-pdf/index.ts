import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const pdfApiKey = Deno.env.get('PDF_API_KEY'); 
    if (!pdfApiKey) {
      console.error('PDF_API_KEY is not set in environment variables.');
      return new Response(JSON.stringify({ error: 'PDF API key not configured.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const { htmlContent, title } = await req.json();

    if (!htmlContent) {
      return new Response(JSON.stringify({ error: 'No HTML content provided for PDF generation.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`Received request to generate PDF for title: ${title || 'Untitled'}`);

    // Actual PDF.co API call
    const pdfCoResponse = await fetch('https://api.pdf.co/v1/pdf/convert/from/html', {
      method: 'POST',
      headers: {
        'x-api-key': pdfApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html: htmlContent,
        name: `${title || 'note'}.pdf`, // Suggested filename for PDF.co
        // You can add more PDF.co options here, e.g., paperSize, margins, etc.
        // See PDF.co documentation for available parameters.
      }),
    });

    if (!pdfCoResponse.ok) {
      const errorText = await pdfCoResponse.text();
      console.error('PDF.co API error:', pdfCoResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'Failed to generate PDF via PDF.co.', details: errorText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: pdfCoResponse.status,
      });
    }

    const pdfCoData = await pdfCoResponse.json();
    if (!pdfCoData.url) {
      throw new Error('PDF.co did not return a URL for the generated PDF.');
    }

    // Fetch the generated PDF from the URL provided by PDF.co
    const pdfFileResponse = await fetch(pdfCoData.url);

    if (!pdfFileResponse.ok) {
      throw new Error(`Failed to fetch PDF from PDF.co URL: ${pdfCoData.url}`);
    }

    const pdfBlob = await pdfFileResponse.blob();

    // Return the PDF blob directly to the client
    return new Response(pdfBlob, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${title || 'note'}.pdf"`,
      },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in generate-pdf Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});