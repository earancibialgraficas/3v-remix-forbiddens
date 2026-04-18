import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, User, Search, ArrowLeft, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link, useSearchParams } from "react-router-dom";
import { getAvatarBorderStyle, getNameStyle } from "@/lib/profileAppearance";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  message_type?: string;
  channel?: string;
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

export default function MessagesPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  // Handle partner from URL param
  useEffect(() => {
    const partnerFromUrl = searchParams.get("partner") || searchParams.get("to");
    if (partnerFromUrl && user && !selectedPartner) {
      loadMessages(partnerFromUrl);
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (!user) return;
    const forceResetUnread = async () => {
      await supabase
        .from("inbox_messages")
        .update({ is_read: true } as any)
        .eq("receiver_id", user.id)
        .eq("is_read", false);
    };
    forceResetUnread();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadConversations();
    const channel = supabase.channel("inbox-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "inbox_messages" }, () => {
        loadConversations();
        if (selectedPartner) loadMessages(selectedPartner);
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
    
    const convMap: Record<string, { msgs: Message[] }> = {};
    (data as Message[]).forEach(m => {
      const pid = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!convMap[pid]) convMap[pid] = { msgs: [] };
      convMap[pid].msgs.push(m);
    });

    const partnerIds = Object.keys(convMap);
    if (partnerIds.length === 0) { setConversations([]); setLoading(false); return; }

    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, color_name, color_avatar_border").in("user_id", partnerIds);
    const profileMap: Record<string, any> = {};
    profiles?.forEach(p => profileMap[p.user_id] = p);

    const convs: Conversation[] = partnerIds.map(pid => {
      const msgs = convMap[pid].msgs;
      const last = msgs[0];
      const unread = msgs.filter(m => m.receiver_id === user.id && !m.is_read).length;
      return {
        partnerId: pid,
        partnerName: profileMap[pid]?.display_name || "Usuario",
        partnerAvatar: profileMap[pid]?.avatar_url,
        lastMessage: last.content,
        lastDate: last.created_at,
        unread,
        partnerColorName: profileMap[pid]?.color_name || null,
        partnerColorAvatarBorder: profileMap[pid]?.color_avatar_border || null,
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
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
    await supabase.from("inbox_messages").update({ is_read: true } as any)
      .eq("receiver_id", user.id).eq("sender_id", partnerId).eq("is_read", false);
  };
  const handleSend = async () => {
    if (!user || !selectedPartner || !newMessage.trim()) return;
    const { error } = await supabase.from("inbox_messages").insert({
      sender_id: user.id, receiver_id: selectedPartner, content: newMessage.trim(), message_type: 'general', channel: 'public',
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setNewMessage(""); loadMessages(selectedPartner); }
  };

  const handleSearch = async () => {
    if (!searchUser.trim()) return;
    const { data } = await supabase.from("profiles").select("user_id, display_name, avatar_url, color_name, color_avatar_border")
      .ilike("display_name", `%${searchUser}%`).limit(10);
    setSearchResults(data?.filter(p => p.user_id !== user?.id) || []);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 animate-fade-in">
        <MessageSquare className="w-12 h-12 text-muted-foreground" />
        <p className="text-sm font-body text-muted-foreground">Inicia sesión para ver tus mensajes</p>
        <Button asChild><Link to="/login">Iniciar Sesión</Link></Button>
      </div>
    );
  }

  return (
    // 🔥 min-w-0 y w-full añadidos para prevenir desbordes a nivel general
    <div className="space-y-3 animate-fade-in w-full min-w-0" style={{ height: 'calc(100dvh - 80px)' }}>
      <div className="bg-card border border-neon-cyan/30 rounded p-3">
        <h1 className="font-pixel text-xs text-neon-cyan flex items-center gap-2"><Mail className="w-4 h-4" /> BANDEJA PÚBLICA</h1>
        <p className="text-[10px] text-muted-foreground font-body mt-0.5">Mensajes públicos, reportes y sugerencias de cualquier usuario</p>
      </div>

      {/* 🔥 min-w-0 para proteger la estructura de columnas */}
      <div className="flex gap-3 min-w-0 w-full" style={{ height: 'calc(100% - 70px)' }}>
        
        {/* Conversation list */}
        <div className={cn("bg-card border border-border rounded flex flex-col min-w-0 overflow-hidden", selectedPartner ? "hidden md:flex w-64 shrink-0" : "flex-1")}>
          <div className="p-2 border-b border-border">
            <div className="flex gap-1">
              <Input placeholder="Buscar usuario..." value={searchUser} onChange={e => setSearchUser(e.target.value)} className="h-7 bg-muted text-xs font-body flex-1" onKeyDown={e => e.key === "Enter" && handleSearch()} />
              <Button size="sm" variant="ghost" onClick={handleSearch} className="h-7 w-7 p-0"><Search className="w-3 h-3" /></Button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                {searchResults.map(r => (
                   <button key={r.user_id} onClick={() => { loadMessages(r.user_id); setSearchResults([]); setSearchUser(""); }}
                    className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 text-left transition-colors overflow-hidden">
                    <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0" style={getAvatarBorderStyle(r.color_avatar_border)}>
                      {r.avatar_url ? <img src={r.avatar_url} className="w-full h-full object-cover" /> : <User className="w-3 h-3 text-muted-foreground" />}
                    </div>
                    <span className="text-xs font-body text-foreground truncate block flex-1" style={getNameStyle(r.color_name)}>{r.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto retro-scrollbar">
            {loading ? <p className="p-3 text-xs text-muted-foreground font-body">Cargando...</p> :
              conversations.length === 0 ? <p className="p-3 text-xs text-muted-foreground font-body">Sin conversaciones. Busca un usuario para empezar.</p> :
              conversations.map(c => (
                <button key={c.partnerId} onClick={() => loadMessages(c.partnerId)}
                  // 🔥 overflow-hidden añadido al botón
                  className={cn("w-full flex items-center gap-2 p-2.5 border-b border-border/30 hover:bg-muted/30 transition-colors text-left overflow-hidden",
                    selectedPartner === c.partnerId && "bg-muted/50")}>
                  <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0" style={getAvatarBorderStyle(c.partnerColorAvatarBorder)}>
                    {c.partnerAvatar ? <img src={c.partnerAvatar} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  {/* 🔥 min-w-0 y overflow-hidden para obligar al corte de texto */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-body font-medium text-foreground truncate block" style={getNameStyle(c.partnerColorName)}>{c.partnerName}</span>
                      {c.unread > 0 && <span className="w-4 h-4 bg-primary rounded-full text-[8px] text-primary-foreground flex items-center justify-center shrink-0 ml-1">{c.unread}</span>}
                    </div>
                    {/* 🔥 truncate, block y w-full forzados */}
                    <p className="text-[10px] text-muted-foreground font-body truncate block w-full">{c.lastMessage}</p>
                  </div>
                </button>
              ))
            }
          </div>
        </div>

        {/* Chat area */}
        {selectedPartner && (
          <div className="flex-1 bg-card border border-border rounded flex flex-col min-w-0">
            <div className="p-2 border-b border-border flex items-center gap-2">
              <button onClick={() => setSelectedPartner(null)} className="md:hidden text-muted-foreground hover:text-foreground shrink-0"><ArrowLeft className="w-4 h-4" /></button>
              <span className="text-xs font-body font-medium text-foreground truncate" style={getNameStyle(conversations.find(c => c.partnerId === selectedPartner)?.partnerColorName)}>{conversations.find(c => c.partnerId === selectedPartner)?.partnerName || "Chat"}</span>
            </div>
            <div className="flex-1 overflow-y-auto retro-scrollbar p-3 space-y-2">
              {messages.map(m => (
                <div key={m.id} className={cn("flex", m.sender_id === user.id ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[75%] rounded-lg px-3 py-2 text-xs font-body whitespace-pre-wrap break-words overflow-hidden",
                    m.sender_id === user.id ? "bg-primary/20 text-foreground" : "bg-muted text-foreground")}>
                    {m.content}
                    <p className="text-[8px] text-muted-foreground mt-0.5 text-right">{new Date(m.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="p-2 border-t border-border flex gap-2">
              <Textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Escribe un mensaje..."
                className="bg-muted text-xs font-body min-h-[40px] max-h-[80px] resize-none flex-1"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
              <Button size="sm" onClick={handleSend} disabled={!newMessage.trim()} className="h-auto px-3 shrink-0"><Send className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}