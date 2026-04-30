import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, Clock, Calendar } from "lucide-react";
import { getCategoryRoute } from "@/lib/categoryRoutes";

// 🔥 UTILIDADES PARA MINIATURAS (Igual que en PublicProfilePage) 🔥
const getSeedFromId = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
};

const getProxyUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('wsrv.nl') || url.includes('supabase.co') || url.includes('pollinations.ai')) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
};

const getPostThumbnail = (post: any) => {
  const content = post.content || '';
  
  // Buscar primera imagen en markdown ![alt](url)
  const imgMatch = content.match(/!\[.*?\]\((.*?)\)/);
  if (imgMatch && imgMatch[1]) return imgMatch[1];
  
  // Buscar primer link de imagen directo
  const rawImgMatch = content.match(/https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)/i);
  if (rawImgMatch && rawImgMatch[0]) return rawImgMatch[0];

  // 🔥 Fallback IA Pollinations (AHORA SÍ ESTANDARIZADO A 40 CARACTERES) 🔥
  const idSeed = getSeedFromId(post.id);
  const title = (post.title || 'Foro').replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Gaming Forum';
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(title.substring(0, 40) + " digital art neon")}?width=400&height=400&nologo=true&seed=${idSeed}`;
};

// 🔥 UTILIDADES PARA FECHA/TIEMPO 🔥
const getTimeAgo = (dateString: string) => {
  if (!dateString) return "Recientemente";
  const safeDateStr = dateString.includes('T') && !dateString.endsWith('Z') && !dateString.includes('+') ? dateString + 'Z' : dateString;
  const date = new Date(safeDateStr);
  
  if (date.getFullYear() <= 1970) return "Recientemente";

  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "hace un momento";
  
  let interval = seconds / 31536000;
  if (interval >= 1) return `hace ${Math.floor(interval)} ${Math.floor(interval) === 1 ? "año" : "años"}`;
  
  interval = seconds / 2592000;
  if (interval >= 1) return `hace ${Math.floor(interval)} ${Math.floor(interval) === 1 ? "mes" : "meses"}`;
  
  interval = seconds / 86400;
  if (interval >= 1) {
      if (Math.floor(interval) === 1) return "ayer";
      return `hace ${Math.floor(interval)} días`;
  }
  
  interval = seconds / 3600;
  if (interval >= 1) return `hace ${Math.floor(interval)} ${Math.floor(interval) === 1 ? "hr" : "hrs"}`;
  
  interval = seconds / 60;
  if (interval >= 1) return `hace ${Math.floor(interval)} min`;
  
  return "hace un momento";
};

const getSafePostDate = (dateStr: string) => {
  if (!dateStr) return "Recientemente";
  const safeDateStr = dateStr.includes('T') && !dateStr.endsWith('Z') && !dateStr.includes('+') ? dateStr + 'Z' : dateStr;
  const date = new Date(safeDateStr);
  if (date.getFullYear() <= 1970) return "Recientemente";
  return date.toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export default function PostsTab({ userPosts }: { userPosts: any[] }) {
  // Motor para actualizar el "hace x minutos" en tiempo real
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-card border border-border rounded p-4 animate-in fade-in">
      <h3 className="font-pixel text-[10px] text-neon-cyan mb-3 flex items-center justify-center md:justify-start gap-2 uppercase">
        <MessageSquare className="w-4 h-4" /> Mis Posts
      </h3>
      
      {userPosts.length === 0 ? (
         <p className="text-[10px] text-muted-foreground font-body text-center py-4 italic">Aún no has publicado nada en el foro.</p>
      ) : (
         <div className="space-y-2 max-h-[250px] md:max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
           {userPosts.map((post) => {
             const thumb = getPostThumbnail(post);
             return (
               <div key={post.id} className="p-2 border border-border/50 rounded flex gap-3 font-body hover:bg-muted/30 transition-all group relative overflow-hidden">
                 {/* 🔥 MINIATURA A LA IZQUIERDA 🔥 */}
                 <div className="w-16 h-16 shrink-0 rounded overflow-hidden border border-neon-cyan/30 bg-black relative shadow-sm">
                    <img 
                       src={getProxyUrl(thumb)} 
                       alt="" 
                       className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                       loading="lazy"
                    />
                 </div>

                 <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                   <Link to={getCategoryRoute(post.category || "gaming-anime-foro", post.id)} className="text-[11px] font-bold text-foreground hover:text-neon-cyan hover:underline line-clamp-2 leading-snug">
                     {post.title}
                   </Link>
                   
                   <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[9px] text-muted-foreground">
                     <span className="flex items-center gap-1" title={getSafePostDate(post.created_at)}>
                       <Clock className="w-3 h-3" /> {getTimeAgo(post.created_at)}
                     </span>
                     <span className="text-neon-green font-bold">▲ {post.upvotes || 0}</span>
                     <span className="uppercase text-[8px] bg-muted/50 px-1 rounded border border-white/5">
                       {post.category?.replace(/-/g, ' ') || "Foro"}
                     </span>
                   </div>
                 </div>
               </div>
             );
           })}
         </div>
      )}
    </div>
  );
}