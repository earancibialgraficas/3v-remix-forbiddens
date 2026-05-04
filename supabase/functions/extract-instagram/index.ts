// Declaramos Deno globalmente para que TypeScript no arroje errores en GitHub/Vercel
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const APIFY_TOKEN = Deno.env.get('APIFY_API_TOKEN');
const ACTOR_ID = 'apify~instagram-scraper';

// Le indicamos explícitamente a TypeScript que 'req' es de tipo 'Request'
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!APIFY_TOKEN) {
      return new Response(JSON.stringify({ error: 'APIFY_API_TOKEN no está configurado en los Supabase Secrets' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const url = body.url;

    if (!url || typeof url !== 'string' || !url.includes('instagram.com')) {
      return new Response(JSON.stringify({ error: 'URL de Instagram inválida' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Iniciando extracción para: ${url}`);

    // Intentamos correr el actor sincrónicamente. Aumentamos el timeout a 55s para evitar cortes
    const apifyUrl = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=55`;
    const apifyRes = await fetch(apifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        directUrls: [url],
        resultsType: 'posts',
        resultsLimit: 1
      }),
    });

    if (!apifyRes.ok) {
      const errorText = await apifyRes.text();
      console.error('Error desde Apify:', apifyRes.status, errorText);
      return new Response(JSON.stringify({ error: `Fallo de Apify: ${apifyRes.status}`, details: errorText }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const items = await apifyRes.json();
    const first = Array.isArray(items) ? items[0] : null;
    
    // Diferentes formas en las que Apify devuelve la imagen
    const imageUrl = first?.displayUrl || first?.images?.[0] || first?.thumbnailUrl || null;

    if (imageUrl) {
      console.log('Imagen encontrada:', imageUrl);
      return new Response(JSON.stringify({ imageUrl, source: 'apify' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Si llegamos aquí, Apify ejecutó bien pero no encontró imagen en la respuesta
    console.error('Apify no devolvió una imagen útil. Respuesta cruda:', JSON.stringify(first).substring(0, 200));
    return new Response(JSON.stringify({ error: 'Apify no encontró ninguna imagen en esa URL', data: first }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Error inesperado en extract-instagram:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});