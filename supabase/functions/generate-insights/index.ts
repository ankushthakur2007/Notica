import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { summarizeTextWithGemini } from '../_shared/summarizer.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { meetingId } = await req.json()

  if (!meetingId) {
    return new Response(JSON.stringify({ error: 'meetingId is required' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  try {
    // 1. Fetch the meeting data
    const { data: meeting, error: fetchError } = await supabaseAdmin
      .from('meetings')
      .select('transcript')
      .eq('id', meetingId)
      .single()

    if (fetchError || !meeting) {
      throw new Error(`Meeting not found: ${fetchError?.message}`)
    }

    // 2. Extract plain text from the Deepgram JSON response
    const transcriptJson = meeting.transcript as any
    const transcriptText = transcriptJson?.results?.channels[0]?.alternatives[0]?.transcript || ''

    // 3. Use the shared summarizer
    const finalInsights = await summarizeTextWithGemini(transcriptText);

    // 4. Save the final insights to the database
    await supabaseAdmin
      .from('meetings')
      .update({
        summary: finalInsights.summary,
        action_items: finalInsights.action_items,
        key_decisions: finalInsights.key_decisions,
        status: 'completed',
      })
      .eq('id', meetingId)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error(`Error in generate-insights for meetingId ${meetingId}:`, error)
    await supabaseAdmin
      .from('meetings')
      .update({ status: 'failed' })
      .eq('id', meetingId)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})