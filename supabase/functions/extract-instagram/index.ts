// Declaramos Deno globalmente para evitar errores en TypeScript en GitHub/Vercel
declare const Deno: any;

const APIFY_TOKEN = Deno.env.get('APIFY_API_TOKEN');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Manejo de pre-vuelo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!APIFY_TOKEN) {
      console.error("TOKEN FALTANTE: APIFY_API_TOKEN no está configurado.");
      return new Response(
        JSON.stringify({ error: 'Configuración incompleta: Falta el token de Apify' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const url = body.url;

    if (!url || typeof url !== 'string' || !url.includes('instagram.com')) {
      return new Response(
        JSON.stringify({ error: 'URL de Instagram no válida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Procesando URL: ${url}`);

    // Llamada al Actor de Apify (Instagram Scraper)
    const response = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=55`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          "directUrls": [url],
          "resultsLimit": 1,
          "resultsType": "posts"
        }),
      }
    );

    if (!response.ok) {
      const errorMsg = await response.text();
      console.error("Error de Apify:", errorMsg);
      throw new Error(`Apify respondió con error ${response.status}`);
    }

    const items = await response.json();
    const result = Array.isArray(items) ? items[0] : null;

    // Buscamos la URL de la imagen en los campos que suele usar Apify
    const imageUrl = result?.displayUrl || result?.display_url || result?.thumbnailUrl || (result?.images && result.images[0]);

    if (!imageUrl) {
      console.error("No se encontró imagen en el resultado:", JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: 'No se pudo extraer la imagen de este post' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ imageUrl, caption: result?.caption || "" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) { // <-- AQUÍ CORREGIMOS EL TIPO A ANY
    console.error("Error en la función:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});