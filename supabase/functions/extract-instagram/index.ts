// Declaramos Deno globalmente para evitar errores en TypeScript en GitHub/Vercel
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Usamos Deno.serve nativo (ya no hay que importar el link https://deno.land...)
// Y le indicamos a TypeScript que req es de tipo Request
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Attempting to process Instagram URL:', url);

    // Verificamos si es una URL válida de IG
    if (!url.includes('instagram.com')) {
       throw new Error('Invalid Instagram URL');
    }

    // Devolvemos la URL tal cual para que el frontend use el proxy (wsrv.nl)
    return new Response(
      JSON.stringify({ 
        imageUrl: url,
        success: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) { // Mantenemos el error: any para que TS no moleste
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});