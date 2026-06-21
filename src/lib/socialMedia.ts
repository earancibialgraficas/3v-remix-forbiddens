const DIRECT_VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|m4v|mov)$/i;

export function isDirectVideoUrl(rawUrl?: string | null) {
  if (!rawUrl) return false;

  try {
    return DIRECT_VIDEO_EXTENSIONS.test(new URL(rawUrl, window.location.origin).pathname);
  } catch {
    return DIRECT_VIDEO_EXTENSIONS.test(rawUrl.split(/[?#]/, 1)[0]);
  }
}

export function getSocialEmbedUrl(rawUrl: string, platform?: string | null) {
  if (!rawUrl) return null;

  const normalizedPlatform = (platform || "").toLowerCase();

  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();

    if (hostname === "youtu.be" || hostname.endsWith("youtube.com")) {
      let videoId = "";
      if (hostname === "youtu.be") videoId = url.pathname.split("/").filter(Boolean)[0] || "";
      else if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/").filter(Boolean)[1] || "";
      } else {
        videoId = url.searchParams.get("v") || "";
      }

      if (videoId) {
        const embed = new URL(`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`);
        embed.searchParams.set("autoplay", "1");
        embed.searchParams.set("enablejsapi", "1");
        embed.searchParams.set("playsinline", "1");
        embed.searchParams.set("rel", "0");
        return embed.toString();
      }
    }

    if (hostname.endsWith("tiktok.com")) {
      const match = url.pathname.match(/\/video\/(\d+)/);
      if (match?.[1]) return `https://www.tiktok.com/embed/v2/${match[1]}?autoplay=1`;
    }

    if (hostname.endsWith("instagram.com")) {
      const match = url.pathname.match(/\/(?:p|reel)\/([^/]+)/);
      if (match?.[1]) return `https://www.instagram.com/p/${match[1]}/embed/?hidecaption=true&autoplay=1`;
    }

    if (hostname.endsWith("facebook.com") || hostname === "fb.watch") {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(rawUrl)}&show_text=0&width=560&autoplay=1`;
    }
  } catch {
    // Keep the original URL as a last-resort embed for legacy records.
  }

  if (["youtube", "tiktok", "instagram", "facebook"].includes(normalizedPlatform)) {
    return rawUrl;
  }

  return rawUrl;
}
