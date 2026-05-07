import { handleMembershipError } from "@/components/UpgradeModal";
import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, User, Minus, ArrowLeft, Type } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import { getAvatarBorderStyle, getNameStyle } from "@/lib/profileAppearance";
import { useIsMobile } from "@/hooks/use-mobile";
import { MEMBERSHIP_LIMITS, MembershipTier } from "@/lib/membershipLimits";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface FriendInfo {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  color_avatar_border?: string | null;
  color_name?: string | null;
}

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  partnerColorAvatarBorder?: string | null;
  partnerColorName?: string | null;
  lastMessage: string;
  lastDate: string;
  unread: number;
}

const FONT_SIZES = [10, 11, 12, 13, 14] as const;

// SOLUCIÓN DE ZONA HORARIA
const getSafeDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  let safeStr = dateStr;
  if (safeStr.includes(' ') && !safeStr.includes('T')) safeStr = safeStr.replace(' ', 'T');
  if (safeStr.includes('T') && !safeStr.endsWith('Z') && !safeStr.includes('+') && !safeStr.includes('-0')) safeStr += 'Z';
  return new Date(safeStr);
};

export default function FloatingChat() {
  const { user, profile, roles, isAdmin, isMasterWeb } = useAuth() as any;
  const isStaff = isMasterWeb || isAdmin || (roles || []).includes("moderator");
  const tier = (profile?.membership_tier?.toLowerCase() || 'novato') as MembershipTier;
  const dmLimit = (isStaff ? MEMBERSHIP_LIMITS.staff : MEMBERSHIP_LIMITS[tier])?.maxDmChars ?? 200;
  
  const location = useLocation();
  const isMobile = useIsMobile();
  
  const [isOpen, setIsOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [text, setText] = useState("");
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [fontSize, setFontSize] = useState(11);
  const endRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(0);

  // Escudo de chat activo
  const activePartnerRef = useRef<string | null>(null);
  
  // LA SOLUCIÓN MAESTRA: Caché de lectura optimista
  const pendingReadCache = useRef<Set<string>>(new Set());

  // Posicionamiento de la burbuja
  const [pos, setPos] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('floatingBubblePos');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const minY = isMobile ? 130 : 0; 
          return {
            x: Math.max(0, Math.min(parsed.x, window.innerWidth - 60)),
            y: Math.max(minY, Math.min(parsed.y, window.innerHeight - 60))
          };
        } catch (e) {}
      }
      return { x: 20, y: window.innerHeight - 100 };
    }
    return { x: 20, y: 800 };
  });

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const clickStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const lastFetch = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      setPos(prev => {
        const minY = isMobile ? 130 : 0;
        return {
          x: Math.min(prev.x, window.innerWidth - 60),
          y: Math.max(minY, Math.min(prev.y, window.innerHeight - 60))
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
    hasMoved.current = false;
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    clickStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = Math.abs(e.clientX - clickStartPos.current.x);
    const dy = Math.abs(e.clientY - clickStartPos.current.y);
    if (dx > 5 || dy > 5) hasMoved.current = true;
    if (!hasMoved.current) return;
    const newX = Math.max(0, Math.min(e.clientX - dragStart.current.x, window.innerWidth - 48)); 
    const minY = isMobile ? 130 : 0; 
    const newY = Math.max(minY, Math.min(e.clientY - dragStart.current.y, window.innerHeight - 48));
    setPos({ x: newX, y: newY });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (typeof window !== 'undefined') localStorage.setItem('floatingBubblePos', JSON.stringify(pos));
  };

  const handleBubbleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasMoved.current) {
      setIsOpen(true);
      setMinimized(false);
      
      if (partnerId) {
        activePartnerRef.current = partnerId;
        markAsReadOptimistic(partnerId);
        loadMessages(partnerId, true);
      }
      
      loadFriends();
      loadConversations();
    }
  };

  const markAsReadOptimistic = (pid: string) => {
    if (!user) return;
    
    pendingReadCache.current.add(pid);
    
    setUnreadCount(prev => {
      const conv = conversations.find(c => c.partnerId === pid);
      return Math.max(0, prev - (conv?.unread || 0));
    });
    setConversations(prev => prev.map(c => c.partnerId === pid ? { ...c, unread: 0 } : c));

    supabase.from("private_messages").update({ is_read: true } as any)
      .eq("receiver_id", user.id).eq("sender_id", pid).eq("is_read", false)
      .then(() => {
        setTimeout(() => {
          pendingReadCache.current.delete(pid);
        }, 3000);
      });
  };

  const loadFriends = async () => {
    if (!user) return;
    const { data: sent } = await supabase.from("friend_requests").select("receiver_id").eq("sender_id", user.id).eq("status", "accepted");
    const { data: recv } = await supabase.from("friend_requests").select("sender_id").eq("receiver_id", user.id).eq("status", "accepted");
    const friendIds = [...(sent || []).map((r: any) => r.receiver_id), ...(recv || []).map((r: any) => r.sender_id)];
    if (friendIds.length === 0) { setFriends([]); return; }
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, color_avatar_border, color_name").in("user_id", friendIds);
    setFriends((profiles || []) as FriendInfo[]);
  };

  const loadConversations = async () => {
    if (!user || friends.length === 0) {
      setConversations([]);
      setUnreadCount(0);
      return;
    }
    const friendIds = friends.map(f => f.user_id);
    const { data: allMsgs } = await supabase.from("private_messages").select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false }).limit(200);
    if (!allMsgs) return;

    const friendSet = new Set(friendIds);
    let totalUnread = 0;
    const convMap: Record<string, { msgs: any[]; unread: number }> = {};

    (allMsgs as any[]).forEach(m => {
      const pid = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!friendSet.has(pid)) return;
      if (!convMap[pid]) convMap[pid] = { msgs: [], unread: 0 };
      convMap[pid].msgs.push(m);
      
      if (m.receiver_id === user.id && !m.is_read) {
        if (activePartnerRef.current !== pid && !pendingReadCache.current.has(pid)) {
          convMap[pid].unread++;
          totalUnread++;
        }
      }
    });

    setUnreadCount(totalUnread);

    const convs: Conversation[] = Object.keys(convMap).map(pid => {
      const c = convMap[pid];
      const last = c.msgs[0];
      const friend = friends.find(f => f.user_id === pid);
      return {
        partnerId: pid,
        partnerName: friend?.display_name || "Usuario",
        partnerAvatar: friend?.avatar_url || null,
        partnerColorAvatarBorder: friend?.color_avatar_border || null,
        partnerColorName: friend?.color_name || null,
        lastMessage: last?.content || "",
        lastDate: last?.created_at || "",
        unread: pendingReadCache.current.has(pid) ? 0 : c.unread,
      };
    }).sort((a, b) => getSafeDate(b.lastDate).getTime() - getSafeDate(a.lastDate).getTime());

    setConversations(convs);
  };

  useEffect(() => { loadFriends(); }, [user]);
  useEffect(() => { loadConversations(); }, [friends]);

  useEffect(() => {
    const passiveRefresh = () => {
      const now = Date.now();
      if (now - lastFetch.current > 4000) {
        lastFetch.current = now;
        loadConversations();
        if (activePartnerRef.current) loadMessages(activePartnerRef.current, true);
      }
    };
    window.addEventListener("click", passiveRefresh);
    window.addEventListener("focus", passiveRefresh);
    passiveRefresh();
    return () => {
      window.removeEventListener("click", passiveRefresh);
      window.removeEventListener("focus", passiveRefresh);
    }
  }, [user, friends, location.pathname]);

  // Polling cada 3s para mensajes en vivo
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isOpen && !minimized && activePartnerRef.current) {
      interval = setInterval(() => {
        loadMessages(activePartnerRef.current!, true);
        loadConversations();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isOpen, minimized, partnerId]);

  // 🔥 1. Scroll automático SOLO cuando entran mensajes nuevos 🔥
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessagesLength.current = messages.length;
  }, [messages]);

  // 🔥 2. NUEVO: Scroll automático al abrir la burbuja o des-minimizar 🔥
  useEffect(() => {
    if (isOpen && !minimized && partnerId) {
      setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, [isOpen, minimized, partnerId]);

  const loadMessages = async (pid: string, isSilent = false) => {
    if (!user) return;

    if (!isSilent) markAsReadOptimistic(pid);

    const { data } = await supabase.from("private_messages").select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${pid}),and(sender_id.eq.${pid},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: false }).limit(50);
    
    if (data) {
      const chronological = [...data].sort((a, b) => getSafeDate(a.created_at).getTime() - getSafeDate(b.created_at).getTime());
      setMessages(chronological as Message[]);
    }
    
    if (activePartnerRef.current === pid) {
      markAsReadOptimistic(pid);
    }
    
    if (!isSilent) loadConversations();
  };

  const openConversation = (pid: string, name?: string) => {
    activePartnerRef.current = pid;
    setPartnerId(pid);
    if (name) setPartnerName(name);
    
    markAsReadOptimistic(pid);

    setMinimized(false);
    setIsOpen(true);
    
    loadMessages(pid);
  };

  const closeConversation = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    const pid = partnerId;
    
    setPartnerId(null); 
    setMessages([]);

    if (pid && user) {
      markAsReadOptimistic(pid);
    }

    activePartnerRef.current = null; 
    loadConversations();
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMinimized(true);
    const pid = partnerId;

    if (pid && user) {
      markAsReadOptimistic(pid);
    }

    activePartnerRef.current = null; 
    loadConversations();
  };

  const closeChatBubble = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    setIsOpen(false); 
    const pid = partnerId;

    setPartnerId(null); 
    setMessages([]);

    if (pid && user) {
      markAsReadOptimistic(pid);
    }

    activePartnerRef.current = null; 
    loadConversations();
  };

  const handleSend = async () => {
    if (!user || !partnerId || !text.trim()) return;
    const content = text.trim();
    if (content.length > dmLimit) {
      toast.error(`Límite: ${dmLimit} caracteres.`);
      return;
    }
    setText("");
    
    const optimisticMsg = {
      id: crypto.randomUUID(),
      sender_id: user.id,
      receiver_id: partnerId,
      content,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, optimisticMsg]);

    const { error } = await supabase.from("private_messages").insert({
      id: optimisticMsg.id,
      sender_id: user.id,
      receiver_id: partnerId,
      content,
      is_read: false, // Prevención extra de NULLs
      created_at: optimisticMsg.created_at, // Prevención extra de NULLs
    } as any);

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setText(content);
      if (!handleMembershipError(error)) toast.error(`Error: ${error.message}`);
    }
  };

  const cycleFontSize = () => {
    const currentIdx = FONT_SIZES.indexOf(fontSize as any);
    const nextIdx = (currentIdx + 1) % FONT_SIZES.length;
    setFontSize(FONT_SIZES[nextIdx]);
  };

  if (!user) return null;

  if (!isOpen || minimized) {
    return (
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={handleBubbleClick}
        style={{ left: pos.x, top: pos.y, touchAction: 'none' }}
        className="fixed z-[250] w-12 h-12 flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <button className="relative w-12 h-12 bg-card border border-border rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all pointer-events-none hover:bg-muted">
          <div className="absolute inset-0 bg-neon-cyan/10 rounded-full pointer-events-none" />
          <MessageSquare className="w-5 h-5 text-neon-cyan pointer-events-none" />
          
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 bg-destructive border border-card rounded-full text-[9px] text-white flex items-center justify-center font-bold px-1 shadow-sm">
               {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  const windowX = typeof window !== 'undefined' ? Math.min(pos.x, window.innerWidth - 320 - 16) : pos.x;
  const windowY = typeof window !== 'undefined' ? Math.min(pos.y, window.innerHeight - 448 - 16) : pos.y;

  return (
    <div 
      style={{ left: windowX, top: windowY }}
      className="fixed z-[250] w-80 h-[28rem] bg-card border border-border rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-scale-in"
    >
      <div 
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ touchAction: 'none' }}
        className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border shrink-0 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2 pointer-events-none">
          {partnerId && (
            <button onPointerDown={(e) => e.stopPropagation()} onClick={closeConversation} className="text-muted-foreground hover:text-foreground pointer-events-auto">
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <MessageSquare className="w-3.5 h-3.5 text-neon-cyan" />
          <span className="text-xs font-body font-medium text-foreground truncate">
            {partnerId ? partnerName : "Chat Privado"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {partnerId && (
            <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); cycleFontSize(); }} className="p-1 text-muted-foreground hover:text-foreground pointer-events-auto" title="Tamaño de letra">
              <Type className="w-3 h-3" />
            </button>
          )}
          <button onPointerDown={(e) => e.stopPropagation()} onClick={handleMinimize} className="p-1 text-muted-foreground hover:text-foreground pointer-events-auto" title="Minimizar">
            <Minus className="w-3 h-3" />
          </button>
          <button onPointerDown={(e) => e.stopPropagation()} onClick={closeChatBubble} className="p-1 text-muted-foreground hover:text-foreground pointer-events-auto" title="Cerrar">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {!partnerId ? (
        <div className="flex-1 overflow-y-auto retro-scrollbar bg-black/20">
          {friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-[10px] text-muted-foreground font-body">Agrega amigos para chatear en privado.</p>
            </div>
          ) : (
            <>
              <p className="text-[9px] text-muted-foreground font-body px-3 py-1.5 border-b border-border/30 bg-card/80 sticky top-0 z-10 backdrop-blur-sm">CONTACTOS ({friends.length})</p>
              {friends.map(f => {
                const conv = conversations.find(c => c.partnerId === f.user_id);
                return (
                  <button key={f.user_id} onClick={() => openConversation(f.user_id, f.display_name)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/20 text-left">
                    <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0 border border-white/10" style={getAvatarBorderStyle(f.color_avatar_border)}>
                      {f.avatar_url ? <img src={f.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground m-2" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-body font-medium text-foreground truncate" style={getNameStyle(f.color_name)}>{f.display_name}</span>
                        {conv && conv.lastDate && (
                          <span className="text-[8px] text-muted-foreground font-body shrink-0">
                            {getSafeDate(conv.lastDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className={cn("text-[10px] font-body truncate", conv && conv.unread > 0 ? "text-foreground font-bold" : "text-muted-foreground")}>
                          {conv?.lastMessage || "Escribir..."}
                        </p>
                        {conv && conv.unread > 0 && (
                          <span className="w-4 h-4 bg-neon-cyan/20 border border-neon-cyan/50 rounded-full text-[8px] text-neon-cyan flex items-center justify-center font-bold shrink-0 ml-1">
                            {conv.unread > 9 ? "9+" : conv.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 retro-scrollbar bg-black/40">
            {messages.length === 0 ? (
              <p className="text-[10px] text-muted-foreground font-body text-center py-4">Sin mensajes previos</p>
            ) : (
              messages.map(m => (
                <div key={m.id} className={cn("flex", m.sender_id === user.id ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[80%] rounded-lg px-2.5 py-1.5 font-body shadow-sm border",
                    m.sender_id === user.id ? "bg-primary/20 text-foreground border-primary/30" : "bg-card text-foreground border-white/5")}
                    style={{ fontSize: `${fontSize}px` }}>
                    <p className="break-words leading-relaxed">{m.content}</p>
                    <p className="text-[7px] text-muted-foreground mt-0.5 text-right opacity-70">
                      {getSafeDate(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          <div className="flex flex-col gap-1 p-2 border-t border-border bg-card shrink-0">
            <div className="flex items-center gap-1.5">
              <input
                value={text}
                onChange={e => setText(e.target.value.slice(0, dmLimit))}
                maxLength={dmLimit}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Escribe aquí..."
                className="flex-1 h-8 bg-muted/50 rounded-md px-2 text-[11px] font-body text-foreground outline-none border border-border focus:border-neon-cyan/50 transition-colors"
              />
              <button onClick={handleSend} disabled={!text.trim()} className="p-2 rounded-md bg-neon-cyan/20 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/30 disabled:opacity-50 transition-colors">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className={cn("text-[8px] text-right font-pixel pr-1", text.length >= dmLimit ? "text-destructive" : "text-muted-foreground")}>{text.length}/{dmLimit}</span>
          </div>
        </>
      )}
    </div>
  );
}