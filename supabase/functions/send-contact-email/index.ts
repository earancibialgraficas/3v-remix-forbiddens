import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Try connector key first, fall back to manual secret
  const RESEND_KEY = Deno.env.get('RESEND_API_KEY_1') || Deno.env.get('RESEND_API_KEY');
  if (!RESEND_KEY) {
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

    // Sanitize inputs
    const safeName = String(name || '').slice(0, 200).replace(/[<>]/g, '');
    const safeEmail = String(email).slice(0, 255);
    const safeMessage = String(message).slice(0, 5000).replace(/[<>]/g, '');

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_KEY,
      },
      body: JSON.stringify({
        from: 'Forbiddens <onboarding@resend.dev>',
        to: [safeEmail],
        subject: `[Forbiddens] Hemos recibido tu consulta`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: auto; background: #0a0a0a; padding: 30px; border-radius: 12px; border: 1px solid #222;">
            <h2 style="color: #22d3ee; font-size: 18px; margin: 0 0 16px;">Forbiddens</h2>
            <p style="color: #e0e0e0;">Hola <strong style="color: #22d3ee;">${safeName}</strong>,</p>
            <p style="color: #aaa;">Hemos recibido tu consulta y te responderemos lo antes posible.</p>
            <hr style="border: 1px solid #333; margin: 20px 0;" />
            <p style="color: #888; font-size: 12px;">Tu mensaje:</p>
            <blockquote style="border-left: 3px solid #22d3ee; padding-left: 12px; color: #ccc; margin: 10px 0;">${safeMessage}</blockquote>
            <p style="color: #666; font-size: 11px; margin-top: 24px;">— Equipo Forbiddens</p>
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
