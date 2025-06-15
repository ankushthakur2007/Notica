import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client within the Edge Function to verify the user's session
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from the session to ensure authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error in generate-pdf:', authError?.message || 'User not authenticated');
      return new Response(JSON.stringify({ error: 'Unauthorized: User not authenticated.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    console.log('User authenticated in generate-pdf function:', user.id);

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

    console.log(`Received request to generate PDF for title: ${title || 'Untitled'} by user: ${user.id}`);

    // Actual PDF.co API call
    const pdfCoResponse = await fetch('https://api.pdf.co/v1/pdf/convert/from/html', {
      method: 'POST',
      headers: {
        'x-api-key': pdfApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html: htmlContent,
        name: `${title || 'note'}.pdf`,
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