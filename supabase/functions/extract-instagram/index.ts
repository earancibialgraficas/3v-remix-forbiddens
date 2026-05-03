// Edge function: extracts Instagram post/reel image using Apify's instagram-scraper actor.
// Called from PhotoWallPage when a user pastes an instagram.com URL.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const APIFY_TOKEN = Deno.env.get('APIFY_API_TOKEN');
// apify/instagram-scraper — sync run, single URL → returns array with displayUrl
const ACTOR_ID = 'apify~instagram-scraper';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!APIFY_TOKEN) {
      return new Response(JSON.stringify({ error: 'APIFY_API_TOKEN not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { url } = await req.json();
    if (!url || typeof url !== 'string' || !url.includes('instagram.com')) {
      return new Response(JSON.stringify({ error: 'Invalid Instagram URL' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Primary path: Apify synchronous run. It usually returns the real display image.
    const apifyUrl = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=45`;
    const apifyRes = await fetch(apifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        directUrls: [url],
        resultsType: 'posts',
        resultsLimit: 1,
        addParentData: false,
      }),
    });

    if (!apifyRes.ok) {
      const txt = await apifyRes.text();
      console.error('Apify error', apifyRes.status, txt);
    } else {
      const items = await apifyRes.json();
      const first = Array.isArray(items) ? items[0] : null;
      const imageUrl = first?.displayUrl || first?.images?.[0] || first?.thumbnailUrl || null;

      if (imageUrl) {
        return new Response(JSON.stringify({ imageUrl, source: 'apify' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Last fallback: extract the Instagram oEmbed thumbnail.
    try {
      const oembed = await fetch(`https://www.instagram.com/oembed/?url=${encodeURIComponent(url)}`);
      if (oembed.ok) {
        const data = await oembed.json();
        if (data?.thumbnail_url) {
          return new Response(JSON.stringify({ imageUrl: data.thumbnail_url, source: 'oembed-thumbnail' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    } catch (_) { /* final error below */ }

    return new Response(JSON.stringify({ error: 'No image found for Instagram URL' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('extract-instagram unexpected', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
