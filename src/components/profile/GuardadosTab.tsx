import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, ExternalLink, Loader2, Bookmark, PlayCircle, X, Maximize2, ChevronLeft, ChevronRight, Image as ImageIcon, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getCategoryRoute } from "@/lib/categoryRoutes";
import { cn } from "@/lib/utils";

const NEON_COLORS = ['#39ff14', '#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#00ff00', '#ff00aa', '#ff5500'];

const cleanUrl = (url: string, itemType: string) => {
  if (!url) return "/";
  if (url === "/feed") return "/social/feed";
  if (url === "/reels") return "/social/reels";
  if (url === "/muro" || url === "/fotos") return "/social/fotos";
  if (itemType === "post" && url.startsWith("/") && !url.includes("/social/")) {
     const parts = url.split("?post=");
     const categoryRaw = parts[0]?.replace("/", "");
     const postId = parts[1];
     if (postId && categoryRaw) return getCategoryRoute(categoryRaw, postId);
  }
  return url;
};

const getProxyUrl = (url: string) => {
  if (!url) return '';
  if (url.toLowerCase().includes('.gif')) return url;
  if (url.includes('wsrv.nl') || url.includes('supabase.co') || url.includes('pollinations.ai') || url.includes('img.youtube.com')) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
};

const getNeonStyle = (item: any) => {
  const isNeon = item.item_type === 'social_content' || item.item_type === 'photo';
  if (!isNeon) return {}; 
  const idToUse = item.original_id || item.id || "";
  const sum = String(idToUse).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = NEON_COLORS[sum % NEON_COLORS.length];
  return { borderColor: color, boxShadow: `0 0 15px ${color}50, inset 0 0 10px ${color}20`, borderWidth: '2px' };
};

const getSeedFromId = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
};

export default function GuardadosTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // 🔥 NUEVO: cache de miniaturas TikTok
  const [tiktokThumbs, setTiktokThumbs] = useState<Record<string,string>>({});

  const fetchSavedItems = async () => {
    if (!user) return;
    const { data: savedData, error } = await supabase.from("saved_items" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error || !savedData) { setLoading(false); return; }

    const photoIds = savedData.filter((d: any) => d.item_type === 'photo').map((d: any) => d.original_id);
    const socialIds = savedData.filter((d: any) => d.item_type === 'social_content').map((d: any) => d.original_id);
    const postIds = savedData.filter((d: any) => d.item_type === 'post').map((d: any) => d.original_id);

    const [photosRes, socialRes, postsRes] = await Promise.all([
      photoIds.length ? supabase.from('photos').select('*').in('id', photoIds) : Promise.resolve({ data: [] }),
      socialIds.length ? supabase.from('social_content').select('*').in('id', socialIds) : Promise.resolve({ data: [] }),
      postIds.length ? supabase.from('posts').select('*').in('id', postIds) : Promise.resolve({ data: [] })
    ]);

    const photosMap = new Map((photosRes.data || []).map(p => [p.id, p]));
    const socialMap = new Map((socialRes.data || []).map(s => [s.id, s]));
    const postsMap = new Map((postsRes.data || []).map(p => [p.id, p]));

    const authorIds = new Set<string>();
    photosRes.data?.forEach(p => authorIds.add(p.user_id));
    socialRes.data?.forEach(s => authorIds.add(s.user_id));
    postsRes.data?.forEach(p => authorIds.add(p.user_id));

    const { data: profilesRes } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', Array.from(authorIds));
    const profilesMap = new Map((profilesRes || []).map(p => [p.user_id, p]));

    const enrichedData = savedData.map((item: any) => {
        let originalData = null;
        if (item.item_type === 'photo') originalData = photosMap.get(item.original_id);
        else if (item.item_type === 'social_content') originalData = socialMap.get(item.original_id);
        else if (item.item_type === 'post') originalData = postsMap.get(item.original_id);
        if (originalData && originalData.user_id) originalData.profile = profilesMap.get(originalData.user_id);
        return { ...item, originalData };
    });

    setItems(enrichedData);
    setLoading(false);
  };

  useEffect(() => { fetchSavedItems(); }, [user]);

  useEffect(() => {
    if (selectedIndex !== null) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [selectedIndex]);

  // 🔥 NUEVO: obtener thumbnails TikTok vía oEmbed
  useEffect(() => {
    const fetchTikTokThumbs = async () => {
      const newThumbs: Record<string,string> = {};
      for (const item of items) {
        const url = item.originalData?.content_url || item.redirect_url || '';
        if (url.includes("tiktok.com") && !tiktokThumbs[url]) {
          try {
            const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
            const data = await res.json();
            if (data.thumbnail_url) newThumbs[url] = data.thumbnail_url;
          } catch {}
        }
      }
      if (Object.keys(newThumbs).length > 0) {
        setTiktokThumbs(prev => ({ ...prev, ...newThumbs }));
      }
    };
    fetchTikTokThumbs();
  }, [items]);

  const isVideoItem = (item: any) => {
    const url = item.originalData?.content_url || item.redirect_url || '';
    return url.match(/\.(mp4|webm|ogg)/i) || url.includes("youtube.com") || url.includes("youtu.be") || url.includes("tiktok.com") || url.includes("instagram.com");
  };

  const getThumbnailUrl = (item: any) => {
    let origContentUrl = item.originalData?.content_url || item.redirect_url || '';
    const idSeed = getSeedFromId(item.original_id || item.id);

    const ytMatch = origContentUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/i);
    if (ytMatch && ytMatch[1]) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;

    // 🔥 FIX TikTok
    if (origContentUrl.includes('tiktok.com')) {
       if (tiktokThumbs[origContentUrl]) return tiktokThumbs[origContentUrl];
    }

    if (origContentUrl.includes('instagram.com')) {
       const igMatch = origContentUrl.match(/instagram\.com\/(?:p|reel|reels)\/([\w-]+)/);
       if (igMatch) return getProxyUrl(`https://www.instagram.com/p/${igMatch[1]}/media/?size=l`);
    }

    let origImg = item.originalData?.image_url || item.originalData?.thumbnail_url;
    if (origImg) return getProxyUrl(origImg);

    const title = (item.title || 'Content').replace(/[^a-zA-Z0-9 ]/g, '');
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(title)}?seed=${idSeed}`;
  };

  const nextSlide = () => setSelectedIndex(prev => prev !== null ? (prev === items.length - 1 ? 0 : prev + 1) : null);
  const prevSlide = () => setSelectedIndex(prev => prev !== null ? (prev === 0 ? items.length - 1 : prev - 1) : null);

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="p-4">
      {items.map((item, idx) => (
        <div key={item.id} onClick={() => setSelectedIndex(idx)} className="cursor-pointer">
          <img src={getThumbnailUrl(item)} />
        </div>
      ))}

      {selectedIndex !== null && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md">
          
          {/* 🔥 CENTRADO PERFECTO */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[75vh] p-4">
            
            <div className="w-full h-full bg-black rounded flex flex-col">

              <div className="flex justify-between p-3 border-b border-white/10">
                <Button onClick={()=>navigate("/")}>
                  <ExternalLink className="w-4 h-4"/>
                </Button>
                <button onClick={()=>setSelectedIndex(null)}>
                  <X className="w-5 h-5"/>
                </button>
              </div>

              <div className="flex-1 flex items-center justify-center relative">
                <button onClick={prevSlide} className="absolute left-2"><ChevronLeft/></button>
                <img src={getThumbnailUrl(items[selectedIndex])} className="max-h-full object-contain"/>
                <button onClick={nextSlide} className="absolute right-2"><ChevronRight/></button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}