import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, User, Minimize2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export default function FloatingChat() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  // Open chat when navigating to /mensajes?to=xxx
  useEffect(() => {
    const to = searchParams.get("to");
    if (to && user && window.location.pathname === "/mensajes") {
      setPartnerId(to);
      setIsOpen(true);
      setMinimized(false);
      loadPartnerInfo(to);
      loadMessages(to);
    }
  }, [searchParams, user]);

  // Realtime new messages
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("floating-chat-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "private_messages" }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id === user.id || msg.receiver_id === user.id) {
          if (partnerId && (msg.sender_id === partnerId || msg.receiver_id === partnerId)) {
            loadMessages(partnerId);
          }
          if (msg.receiver_id === user.id && msg.sender_id !== partnerId) {
            setUnreadCount(c => c + 1);
          }
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, partnerId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadPartnerInfo = async (pid: string) => {
    const { data } = await supabase.from("profiles").select("display_name").eq("user_id", pid).maybeSingle();
    setPartnerName((data as any)?.display_name || "Usuario");
  };

  const loadMessages = async (pid: string) => {
    if (!user) return;
    const { data } = await supabase.from("private_messages").select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${pid}),and(sender_id.eq.${pid},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true }).limit(50);
    if (data) setMessages(data as Message[]);
    // Mark as read
    await supabase.from("private_messages").update({ is_read: true } as any).eq("receiver_id", user.id).eq("sender_id", pid).eq("is_read", false);
  };

  const handleSend = async () => {
    if (!user || !partnerId || !text.trim()) return;
    await supabase.from("private_messages").insert({
      sender_id: user.id, receiver_id: partnerId, content: text.trim(),
    } as any);
    setText("");
    loadMessages(partnerId);
  };

  if (!user) return null;

  // Show bubble when minimized or has unread
  if (!isOpen || minimized) {
    if (!partnerId && unreadCount === 0) return null;
    return (
      <button
        onClick={() => { setIsOpen(true); setMinimized(false); if (partnerId) loadMessages(partnerId); setUnreadCount(0); }}
        className="fixed bottom-4 right-4 z-[250] w-12 h-12 bg-neon-cyan/20 border-2 border-neon-cyan/40 rounded-full flex items-center justify-center shadow-lg hover:bg-neon-cyan/30 transition-colors animate-scale-in"
      >
        <MessageSquare className="w-5 h-5 text-neon-cyan" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full text-[9px] text-destructive-foreground flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    );
  }

  // Open chat window
  return (
    <div className="fixed bottom-4 right-4 z-[250] w-80 h-96 bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          {partnerId && (
            <button onClick={() => { setPartnerId(null); setMessages([]); }} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <MessageSquare className="w-3.5 h-3.5 text-neon-cyan" />
          <span className="text-xs font-body font-medium text-foreground truncate">
            {partnerId ? partnerName : "Chat"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(true)} className="p-1 text-muted-foreground hover:text-foreground">
            <Minimize2 className="w-3 h-3" />
          </button>
          <button onClick={() => { setIsOpen(false); setPartnerId(null); setMessages([]); }} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 retro-scrollbar">
        {!partnerId ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-[10px] text-muted-foreground font-body">Abre una conversación desde el perfil de un usuario</p>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-[10px] text-muted-foreground font-body text-center py-4">Sin mensajes aún</p>
        ) : (
          messages.map(m => (
            <div key={m.id} className={cn("flex", m.sender_id === user.id ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-lg px-2.5 py-1.5 text-[11px] font-body",
                m.sender_id === user.id ? "bg-primary/20 text-foreground" : "bg-muted text-foreground")}>
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

      {/* Input */}
      {partnerId && (
        <div className="flex items-center gap-1.5 p-2 border-t border-border">
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
      )}
    </div>
  );
}
