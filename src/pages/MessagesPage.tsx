import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, User, Search, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { getAvatarBorderStyle, getNameStyle } from "@/lib/profileAppearance";
import { MEMBERSHIP_LIMITS, MembershipTier } from "@/lib/membershipLimits";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  lastMessage: string;
  lastDate: string;
  unread: number;
  partnerColorName?: string | null;
  partnerColorAvatarBorder?: string | null;
}

const renderFormattedText = (content: string, navigate: ReturnType<typeof useNavigate>) => {
  const parts = content.split(/(\[COLOR:[^\]]+\]|\[\/COLOR\]|\[LINK:[^\]]+\]|\[\/LINK\]|\n)/g);
  let currentColor = "";
  let currentLink = "";
  
  return parts.map((part, i) => {
    if (part === "\n") return <br key={i} />;
    if (part.startsWith("[COLOR:")) { 
      currentColor = part.match(/\[COLOR:([^\]]+)\]/)?.[1] || ""; 
      return null; 
    }
    if (part === "[/COLOR]") { currentColor = ""; return null; }
    if (part.startsWith("[LINK:")) { 
      currentLink = part.match(/\[LINK:([^\]]+)\]/)?.[1] || ""; 
      return null; 
    }
    if (part === "[/LINK]") { currentLink = ""; return null; }
    
    if (!part) return null;
    
    if (currentLink) {
      const linkRaw = currentLink;
      
      return (
        <a 
          key={i} 
          href={linkRaw} 
          className="text-[#3b82f6] hover:underline hover:brightness-125 transition-all cursor-pointer font-bold inline-flex items-center gap-1"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            try {
              const url = new URL(linkRaw, window.location.origin);
              const targetPath = url.pathname + url.search;
              const focusId = url.searchParams.get('focus');

              if (window.location.pathname !== url.pathname || window.location.search !== url.search) {
                navigate(targetPath);
              } 
              
              if (focusId) {
                setTimeout(() => {
                  const el = document.getElementById(focusId);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('ring-2', 'ring-destructive', 'animate-pulse');
                    setTimeout(() => el.classList.remove('ring-2', 'ring-destructive', 'animate-pulse'), 2000);
                  }
                }, 150);
              }
            } catch (err) {
              navigate(linkRaw);
            }
          }}
        >
          <span style={currentColor ? { color: currentColor } : {}}>{part}</span>
        </a>
      );
    }
    
    if (currentColor) {
      return <span key={i} style={{ color: currentColor }}>{part}</span>;
    }
    
    return <span key={i}>{part}</span>;
  });
};

export default function MessagesPage() {
  const { user, profile, roles, isAdmin, isMasterWeb } = useAuth() as any;
  const isStaff = isMasterWeb || isAdmin || (roles || []).includes("moderator");
  const tier = (profile?.membership_tier?.toLowerCase() || 'novato') as MembershipTier;
  const dmLimit = (isStaff ? MEMBERSHIP_LIMITS.staff : MEMBERSHIP_LIMITS[tier])?.maxDmChars ?? 200;
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  // 🔥 Ref estable para el partner seleccionado (evita bugs en realtime)
  const selectedPartnerRef = useRef<string | null>(null);
  useEffect(() => { selectedPartnerRef.current = selectedPartner; }, [selectedPartner]);

  // 🔥 FUNCIÓN DE ORDENAMIENTO CRONOLÓGICO MEJORADA (Antiguo arriba -> Nuevo abajo)
  const sortMsgs = (arr: Message[]) =>
    [...arr].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id); // Estabilidad si coinciden milisegundos
    });

  useEffect(() => {
    const p = searchParams.get("partner") || searchParams.get("to");
    if (p && user && !selectedPartner) loadMessages(p);
  }, [searchParams, user]);

  useEffect(() => {
    if (!user) return;
    loadConversations();
    
    // 🔥 CONFIGURACIÓN TIEMPO REAL OPTIMIZADA
    const channel = supabase.channel(`messages-sync-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "inbox_messages" }, (payload) => {
        const newMsg = payload.new as Message;
        if (!newMsg) return;
        
        // Si el mensaje pertenece al usuario actual o al partner activo
        if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
          loadConversations(); // Actualiza la lista de la izquierda
          
          const activePartner = selectedPartnerRef.current;
          if (activePartner && (newMsg.sender_id === activePartner || newMsg.receiver_id === activePartner)) {
             // En lugar de re-fetch total, añadimos y ordenamos localmente para evitar saltos
             setMessages(prev => {
                // Evitar duplicados (si el mensaje ya se añadió optimísticamente)
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return sortMsgs([...prev, newMsg]);
             });
          }
        }
      }).subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    if (!user) return;
    const { data } = await supabase.from("inbox_messages").select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    
    if (!data) { setLoading(false); return; }
    
    const convMap: Record<string, { msgs: any[] }> = {};
    data.forEach((m: any) => {
      const pid = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!convMap[pid]) convMap[pid] = { msgs: [] };
      convMap[pid].msgs.push(m);
    });

    const partnerIds = Object.keys(convMap);
    if (partnerIds.length === 0) { setConversations([]); setLoading(false); return; }

    const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", partnerIds);
    const profileMap: Record<string, any> = {};
    profiles?.forEach(p => profileMap[p.user_id] = p);

    const convs: Conversation[] = partnerIds.map(pid => {
      const msgs = convMap[pid].msgs;
      const last = msgs[0];
      const unread = msgs.filter(m => m.receiver_id === user.id && m.is_read === false).length;
      return {
        partnerId: pid,
        partnerName: profileMap[pid]?.display_name || "Usuario",
        partnerAvatar: profileMap[pid]?.avatar_url,
        lastMessage: last.content,
        lastDate: last.created_at,
        unread,
        partnerColorName: profileMap[pid]?.color_name,
        partnerColorAvatarBorder: profileMap[pid]?.color_avatar_border,
      };
    });
    setConversations(convs.sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime()));
    setLoading(false);
  };

  const loadMessages = async (partnerId: string) => {
    if (!user) return;
    setSelectedPartner(partnerId);
    
    const { data } = await supabase.from("inbox_messages").select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true }); // Base de datos ya trae orden ascendente
    
    if (data) setMessages(sortMsgs(data as Message[]));

    await supabase.from("inbox_messages").update({ is_read: true })
      .eq("receiver_id", user.id).eq("sender_id", partnerId).eq("is_read", false);
    
    setConversations(prev => prev.map(c => c.partnerId === partnerId ? { ...c, unread: 0 } : c));
    window.dispatchEvent(new Event("updateBadges"));
  };

  const handleSend = async () => {
    if (!user || !selectedPartner || !newMessage.trim()) return;
    let content = newMessage.trim();
    if (content.length > dmLimit) {
      toast({ title: "Límite alcanzado", description: `Tu membresía permite ${dmLimit} caracteres por mensaje.`, variant: "destructive" });
      return;
    }
    setNewMessage("");

    // 🔥 UI OPTIMISTA CON FECHA ESTABLE
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId, 
      sender_id: user.id, 
      receiver_id: selectedPartner,
      content, 
      is_read: false, 
      created_at: new Date().toISOString(),
    };

    setMessages(prev => sortMsgs([...prev, optimisticMsg]));

    const { error, data } = await supabase.from("inbox_messages").insert({
      sender_id: user.id, receiver_id: selectedPartner, content, is_read: false
    }).select().single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(content);
    } else if (data) {
      // Reemplazamos el optimista por el real para sincronizar la fecha exacta del servidor
      setMessages(prev => sortMsgs(prev.map(m => m.id === tempId ? data : m)));
    }
  };

  const handleSearch = async () => {
    if (!searchUser.trim()) return;
    const { data } = await supabase.from("profiles").select("*")
      .ilike("display_name", `%${searchUser}%`).limit(10);
    setSearchResults(data?.filter(p => p.user_id !== user?.id) || []);
  };

  return (
    <div className="space-y-3 animate-fade-in w-full min-w-0" style={{ height: 'calc(100dvh - 80px)' }}>
      <div className="bg-card border border-neon-cyan/30 rounded p-3">
        <h1 className="font-pixel text-xs text-neon-cyan flex items-center gap-2"><Mail className="w-4 h-4" /> BANDEJA PÚBLICA</h1>
      </div>

      <div className="flex gap-3 min-w-0 w-full" style={{ height: 'calc(100% - 70px)' }}>
        <div className={cn("bg-card border border-border rounded flex flex-col min-w-0 overflow-hidden", selectedPartner ? "hidden md:flex w-64 shrink-0" : "flex-1")}>
          <div className="p-2 border-b border-border">
            <div className="flex gap-1">
              <Input placeholder="Buscar..." value={searchUser} onChange={e => setSearchUser(e.target.value)} className="h-7 text-xs" onKeyDown={e => e.key === "Enter" && handleSearch()} />
              <Button size="sm" variant="ghost" onClick={handleSearch} className="h-7 w-7 p-0"><Search className="w-3 h-3" /></Button>
            </div>
            {searchResults.map(r => (
              <button key={r.user_id} onClick={() => { loadMessages(r.user_id); setSearchResults([]); setSearchUser(""); }} className="w-full flex items-center gap-2 p-1.5 hover:bg-muted/50 text-left mt-1 rounded">
                <div className="w-6 h-6 rounded-full bg-muted shrink-0 overflow-hidden" style={getAvatarBorderStyle(r.color_avatar_border)}>
                   {r.avatar_url && <img src={r.avatar_url} className="w-full h-full object-cover" />}
                </div>
                <span className="text-xs truncate" style={getNameStyle(r.color_name)}>{r.display_name}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto retro-scrollbar">
            {conversations.map(c => (
              <button key={c.partnerId} onClick={() => loadMessages(c.partnerId)} className={cn("w-full flex items-center gap-2 p-2.5 border-b border-border/30 hover:bg-muted/30 text-left overflow-hidden", selectedPartner === c.partnerId && "bg-muted/50")}>
                <div className="w-8 h-8 rounded-full bg-muted shrink-0 overflow-hidden" style={getAvatarBorderStyle(c.partnerColorAvatarBorder)}>
                  {c.partnerAvatar && <img src={c.partnerAvatar} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate block" style={getNameStyle(c.partnerColorName)}>{c.partnerName}</span>
                    {c.unread > 0 && <span className="w-4 h-4 bg-primary rounded-full text-[8px] text-primary-foreground flex items-center justify-center shrink-0 ml-1">{c.unread}</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate block w-full">
                    {c.lastMessage.replace(/\[COLOR:[^\]]+\]|\[\/COLOR\]|\[LINK:[^\]]+\]|\[\/LINK\]/g, '')}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedPartner && (
          <div className="flex-1 bg-card border border-border rounded flex flex-col min-w-0">
            <div className="p-2 border-b border-border flex items-center gap-2">
              <button onClick={() => setSelectedPartner(null)} className="md:hidden text-muted-foreground"><ArrowLeft className="w-4 h-4" /></button>
              <span className="text-xs font-medium truncate" style={getNameStyle(conversations.find(c => c.partnerId === selectedPartner)?.partnerColorName)}>{conversations.find(c => c.partnerId === selectedPartner)?.partnerName || "Chat"}</span>
            </div>
            <div className="flex-1 overflow-y-auto retro-scrollbar p-3 space-y-2">
              {messages.map(m => (
                <div key={m.id} className={cn("flex", m.sender_id === user?.id ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[75%] rounded-lg px-3 py-2 text-xs break-words whitespace-pre-wrap", m.sender_id === user?.id ? "bg-primary/20 text-foreground" : "bg-muted text-foreground")}>
                    {renderFormattedText(m.content, navigate)}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="p-2 border-t border-border flex flex-col gap-1">
              <div className="flex gap-2">
                <Textarea value={newMessage} onChange={e => setNewMessage(e.target.value.slice(0, dmLimit))} placeholder="Mensaje..." maxLength={dmLimit} className="bg-muted text-xs min-h-[40px] max-h-[80px] flex-1" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
                <Button size="sm" onClick={handleSend} className="h-auto px-3"><Send className="w-3.5 h-3.5" /></Button>
              </div>
              <span className={cn("text-[9px] text-right font-pixel", newMessage.length >= dmLimit ? "text-destructive" : "text-muted-foreground")}>{newMessage.length}/{dmLimit}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}