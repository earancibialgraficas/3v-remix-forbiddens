import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { name, email, message } = await req.json();
    if (!message || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Forbiddens <onboarding@resend.dev>',
        to: [email],
        subject: `[Forbiddens] Hemos recibido tu consulta`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: auto;">
            <h2 style="color: #2596be;">Forbiddens</h2>
            <p>Hola <strong>${name}</strong>,</p>
            <p>Hemos recibido tu consulta y te responderemos lo antes posible.</p>
            <hr style="border: 1px solid #333;" />
            <p style="color: #888; font-size: 12px;">Tu mensaje:</p>
            <blockquote style="border-left: 3px solid #2596be; padding-left: 12px; color: #ccc;">${message}</blockquote>
            <p style="color: #888; font-size: 11px; margin-top: 20px;">— Equipo Forbiddens</p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Send contact email error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
