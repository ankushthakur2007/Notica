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
    const authHeader = req.headers.get('Authorization');
    console.log('Incoming Authorization header:', authHeader ? 'Present' : 'Missing');
    if (authHeader) {
      console.log('Auth header starts with:', authHeader.substring(0, 20) + '...'); // Log first 20 chars to avoid exposing full token
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error in generate-pdf:', authError?.message || 'User not authenticated');
      if (authError) {
        console.error('Full auth error object:', JSON.stringify(authError, null, 2));
      }
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

    const pdfFileResponse = await fetch(pdfCoData.url);

    if (!pdfFileResponse.ok) {
      throw new Error(`Failed to fetch PDF from PDF.co URL: ${pdfCoData.url}`);
    }

    const pdfBlob = await pdfFileResponse.blob();

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