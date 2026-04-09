import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';
const ADMIN_EMAIL = 'forbiddens.crew@gmail.com';

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

    const safeName = String(name || '').slice(0, 200).replace(/[<>]/g, '');
    const safeEmail = String(email).slice(0, 255);
    const safeMessage = String(message).slice(0, 5000).replace(/[<>]/g, '');

    // Send notification to admin (using onboarding@resend.dev which can only send to the account owner email)
    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_KEY,
      },
      body: JSON.stringify({
        from: 'Forbiddens <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject: `[Forbiddens] Nueva consulta de ${safeName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: auto; background: #0a0a0a; padding: 30px; border-radius: 12px; border: 1px solid #222;">
            <h2 style="color: #22d3ee; font-size: 18px; margin: 0 0 16px;">Forbiddens — Nueva Consulta</h2>
            <p style="color: #e0e0e0;"><strong style="color: #22d3ee;">De:</strong> ${safeName} (${safeEmail})</p>
            <hr style="border: 1px solid #333; margin: 20px 0;" />
            <p style="color: #888; font-size: 12px;">Mensaje:</p>
            <blockquote style="border-left: 3px solid #22d3ee; padding-left: 12px; color: #ccc; margin: 10px 0;">${safeMessage}</blockquote>
            <p style="color: #666; font-size: 11px; margin-top: 24px;">Puedes responder directamente a ${safeEmail}</p>
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
