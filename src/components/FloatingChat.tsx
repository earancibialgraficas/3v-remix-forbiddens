import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, User, Minus, ArrowLeft, Type } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { getAvatarBorderStyle, getNameStyle } from "@/lib/profileAppearance";

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

export default function FloatingChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  // ESTADOS PARA EL ARRASTRE
  const [pos, setPos] = useState({ 
    x: 20, 
    y: typeof window !== 'undefined' ? window.innerHeight - 100 : 800 
  });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      setPos(prev => ({
        x: Math.min(prev.x, window.innerWidth - 60),
        y: Math.min(prev.y, window.innerHeight - 60)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
    hasMoved.current = false;
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    hasMoved.current = true;
    const newX = Math.max(0, Math.min(e.clientX - dragStart.current.x, window.innerWidth - 48)); 
    const newY = Math.max(0, Math.min(e.clientY - dragStart.current.y, window.innerHeight - 48));
    setPos({ x: newX, y: newY });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleBubbleClick = () => {
    if (!hasMoved.current) {
      setIsOpen(true);
      setMinimized(false);
      loadFriends();
    }
  };

  const loadFriends = async () => {
    if (!user) return;
    const { data: sent } = await supabase.from("friend_requests").select("receiver_id").eq("sender_id", user.id).eq("status", "accepted");
    const { data: recv } = await supabase.from("friend_requests").select("sender_id").eq("receiver_id", user.id).eq("status", "accepted");
    const friendIds = [
      ...(sent || []).map((r: any) => r.receiver_id),
      ...(recv || []).map((r: any) => r.sender_id),
    ];
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
        convMap[pid].unread++;
        totalUnread++;
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
        unread: c.unread,
      };
    }).sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());

    setConversations(convs);
  };

  useEffect(() => { loadFriends(); }, [user]);
  useEffect(() => { loadConversations(); }, [friends]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("floating-chat-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "private_messages" }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id === user.id || msg.receiver_id === user.id) {
          loadConversations();
          if (partnerId && (msg.sender_id === partnerId || msg.receiver_id === partnerId)) {
            loadMessages(partnerId);
          }
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, partnerId, friends]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async (pid: string) => {
    if (!user) return;
    const { data } = await supabase.from("private_messages").select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${pid}),and(sender_id.eq.${pid},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: false }).limit(50);
    if (data) setMessages((data as Message[]).reverse());
    await supabase.from("private_messages").update({ is_read: true } as any).eq("receiver_id", user.id).eq("sender_id", pid).eq("is_read", false);
    loadConversations();
  };

  const openConversation = (pid: string, name?: string) => {
    setPartnerId(pid);
    if (name) setPartnerName(name);
    loadMessages(pid);
    setMinimized(false);
    setIsOpen(true);
  };

  const handleSend = async () => {
    if (!user || !partnerId || !text.trim()) return;
    await supabase.from("private_messages").insert({
      sender_id: user.id, receiver_id: partnerId, content: text.trim(),
    } as any);
    setText("");
    loadMessages(partnerId);
  };

  const cycleFontSize = () => {
    const currentIdx = FONT_SIZES.indexOf(fontSize as any);
    const nextIdx = (currentIdx + 1) % FONT_SIZES.length;
    setFontSize(FONT_SIZES[nextIdx]);
  };

  if (!user) return null;

  if (!isOpen || minimized) {
    return (
      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={handleBubbleClick}
        style={{ left: pos.x, top: pos.y, touchAction: 'none' }}
        className="fixed z-[250] w-12 h-12 bg-neon-cyan/20 border-2 border-neon-cyan/40 rounded-full flex items-center justify-center shadow-lg hover:bg-neon-cyan/30 transition-colors animate-scale-in cursor-grab active:cursor-grabbing"
      >
        <MessageSquare className="w-5 h-5 text-neon-cyan" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full text-[9px] text-destructive-foreground flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    );
  }

  const windowX = typeof window !== 'undefined' ? Math.min(pos.x, window.innerWidth - 320 - 16) : pos.x;
  const windowY = typeof window !== 'undefined' ? Math.min(pos.y, window.innerHeight - 448 - 16) : pos.y;

  return (
    <div 
      style={{ left: windowX, top: windowY }}
      className="fixed z-[250] w-80 h-[28rem] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-scale-in"
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
            {/* 🔥 BLINDAJE: onPointerDown detiene el evento de arrastre para el botón ATRÁS */}
            <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setPartnerId(null); setMessages([]); }} className="text-muted-foreground hover:text-foreground pointer-events-auto">
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <MessageSquare className="w-3.5 h-3.5 text-neon-cyan" />
          <span className="text-xs font-body font-medium text-foreground truncate">
            {partnerId ? partnerName : "Chat de Amigos"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {partnerId && (
            {/* 🔥 BLINDAJE: onPointerDown detiene el evento de arrastre para el botón TAMAÑO TEXTO */}
            <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); cycleFontSize(); }} className="p-1 text-muted-foreground hover:text-foreground pointer-events-auto" title={`Tamaño: ${fontSize}px`}>
              <Type className="w-3 h-3" />
            </button>
          )}
          {/* 🔥 BLINDAJE: onPointerDown detiene el arrastre para el botón MINIMIZAR */}
          <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setMinimized(true); }} className="p-1 text-muted-foreground hover:text-foreground pointer-events-auto" title="Minimizar">
            <Minus className="w-3 h-3" />
          </button>
          {/* 🔥 BLINDAJE: onPointerDown detiene el arrastre para el botón CERRAR */}
          <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIsOpen(false); setPartnerId(null); setMessages([]); }} className="p-1 text-muted-foreground hover:text-foreground pointer-events-auto">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {!partnerId ? (
        <div className="flex-1 overflow-y-auto retro-scrollbar">
          {friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-[10px] text-muted-foreground font-body">No tienes amigos aún. Agrega amigos desde sus perfiles para chatear aquí.</p>
            </div>
          ) : (
            <>
              <p className="text-[9px] text-muted-foreground font-body px-3 py-1.5 border-b border-border/30">CONTACTOS ({friends.length})</p>
              {friends.map(f => {
                const conv = conversations.find(c => c.partnerId === f.user_id);
                return (
                  <button key={f.user_id} onClick={() => openConversation(f.user_id, f.display_name)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors border-b border-border/20 text-left">
                    <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0" style={getAvatarBorderStyle(f.color_avatar_border)}>
                      {f.avatar_url ? <img src={f.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground m-2" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-body font-medium text-foreground truncate" style={getNameStyle(f.color_name)}>{f.display_name}</span>
                        {conv && conv.lastDate && (
                          <span className="text-[8px] text-muted-foreground font-body shrink-0">
                            {new Date(conv.lastDate).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground font-body truncate">{conv?.lastMessage || "Sin mensajes"}</p>
                        {conv && conv.unread > 0 && (
                          <span className="w-4 h-4 bg-destructive rounded-full text-[8px] text-destructive-foreground flex items-center justify-center font-bold shrink-0 ml-1">
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
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 retro-scrollbar">
            {messages.length === 0 ? (
              <p className="text-[10px] text-muted-foreground font-body text-center py-4">Sin mensajes aún</p>
            ) : (
              messages.map(m => (
                <div key={m.id} className={cn("flex", m.sender_id === user.id ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[80%] rounded-lg px-2.5 py-1.5 font-body",
                    m.sender_id === user.id ? "bg-primary/20 text-foreground" : "bg-muted text-foreground")}
                    style={{ fontSize: `${fontSize}px` }}>
                    {m.content}
                    <p className="text-[7px] text-muted-foreground mt-0.5">
                      {new Date(m.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          <div className="flex items-center gap-1.5 p-2 border-t border-border shrink-0">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Mensaje..."
              className="flex-1 h-7 bg-muted rounded px-2 text-[11px] font-body text-foreground outline-none border border-border focus:border-neon-cyan/50"
            />
            <button onClick={handleSend} disabled={!text.trim()} className="p-1.5 rounded bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 disabled:opacity-50 transition-colors">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}