// Declaramos Deno globalmente para evitar errores en TypeScript en GitHub/Vercel
declare const Deno: any;

const APIFY_TOKEN = Deno.env.get('APIFY_API_TOKEN');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!APIFY_TOKEN) {
      throw new Error('Falta el token de Apify en los secretos de Supabase');
    }

    const { url } = await req.json();

    if (!url || typeof url !== 'string' || !url.includes('instagram.com')) {
       throw new Error('URL de Instagram inválida');
    }

    // Llamamos a Apify para que extraiga el link directo de la imagen (.jpg)
    const response = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=55`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directUrls: [url],
          resultsLimit: 1,
          resultsType: 'posts'
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Apify falló con estado ${response.status}`);
    }

    const items = await response.json();
    const result = Array.isArray(items) ? items[0] : null;

    // Extraemos la URL de la imagen real (.jpg o .webp)
    const imageUrl = result?.displayUrl || result?.display_url || result?.thumbnailUrl || (result?.images && result.images[0]);

    if (!imageUrl) {
       throw new Error('Apify no encontró la imagen en ese post');
    }

    // Devolvemos la imagen directa para que el proxy (wsrv.nl) la cargue al instante
    return new Response(
      JSON.stringify({ imageUrl, caption: result?.caption || "" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) { // Con 'any' evitamos el error de unknown en Vercel
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});