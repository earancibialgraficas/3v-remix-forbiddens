import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, User, Minimize2, ArrowLeft, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  lastMessage: string;
  lastDate: string;
  unread: number;
}

export default function FloatingChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [text, setText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchUser, setSearchUser] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  // Load conversations
  const loadConversations = async () => {
    if (!user) return;
    const { data: allMsgs } = await supabase.from("private_messages").select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false }).limit(200);
    if (!allMsgs) return;

    const convMap: Record<string, { msgs: any[]; unread: number }> = {};
    (allMsgs as any[]).forEach(m => {
      const pid = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!convMap[pid]) convMap[pid] = { msgs: [], unread: 0 };
      convMap[pid].msgs.push(m);
      if (m.receiver_id === user.id && !m.is_read) convMap[pid].unread++;
    });

    const partnerIds = Object.keys(convMap);
    if (partnerIds.length === 0) { setConversations([]); setUnreadCount(0); return; }

    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", partnerIds);
    const pMap: Record<string, any> = {};
    profiles?.forEach(p => pMap[p.user_id] = p);

    let totalUnread = 0;
    const convs: Conversation[] = partnerIds.map(pid => {
      const c = convMap[pid];
      totalUnread += c.unread;
      const last = c.msgs[0];
      return {
        partnerId: pid,
        partnerName: pMap[pid]?.display_name || "Usuario",
        partnerAvatar: pMap[pid]?.avatar_url || null,
        lastMessage: last?.content || "",
        lastDate: last?.created_at || "",
        unread: c.unread,
      };
    }).sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());

    setConversations(convs);
    setUnreadCount(totalUnread);
  };

  useEffect(() => { loadConversations(); }, [user]);

  // Realtime
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
    await supabase.from("private_messages").update({ is_read: true } as any).eq("receiver_id", user.id).eq("sender_id", pid).eq("is_read", false);
    loadConversations();
  };

  const openConversation = (pid: string, name?: string) => {
    setPartnerId(pid);
    if (name) setPartnerName(name);
    else loadPartnerInfo(pid);
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

  const handleSearch = async () => {
    if (!searchUser.trim() || !user) return;
    const { data } = await supabase.from("profiles").select("user_id, display_name, avatar_url")
      .ilike("display_name", `%${searchUser}%`).neq("user_id", user.id).limit(5);
    setSearchResults(data || []);
  };

  if (!user) return null;

  // Minimized icon — bottom LEFT
  if (!isOpen || minimized) {
    return (
      <button
        onClick={() => { setIsOpen(true); setMinimized(false); loadConversations(); }}
        className="fixed bottom-4 left-4 z-[250] w-12 h-12 bg-neon-cyan/20 border-2 border-neon-cyan/40 rounded-full flex items-center justify-center shadow-lg hover:bg-neon-cyan/30 transition-colors animate-scale-in"
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

  // Open chat window — bottom LEFT
  return (
    <div className="fixed bottom-4 left-4 z-[250] w-80 h-[28rem] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          {partnerId && (
            <button onClick={() => { setPartnerId(null); setMessages([]); }} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <MessageSquare className="w-3.5 h-3.5 text-neon-cyan" />
          <span className="text-xs font-body font-medium text-foreground truncate">
            {partnerId ? partnerName : "Mensajes"}
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

      {!partnerId ? (
        /* Conversation list */
        <div className="flex-1 overflow-y-auto retro-scrollbar">
          {/* Search */}
          <div className="p-2 border-b border-border/50">
            <div className="flex gap-1">
              <input
                value={searchUser}
                onChange={e => setSearchUser(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
                placeholder="Buscar usuario..."
                className="flex-1 h-6 bg-muted rounded px-2 text-[10px] font-body text-foreground outline-none border border-border focus:border-neon-cyan/50"
              />
              <button onClick={handleSearch} className="p-1 text-muted-foreground hover:text-foreground">
                <Search className="w-3 h-3" />
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {searchResults.map(r => (
                  <button key={r.user_id} onClick={() => { openConversation(r.user_id, r.display_name); setSearchResults([]); setSearchUser(""); }}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50 text-[10px] font-body text-foreground">
                    <div className="w-5 h-5 rounded-full bg-muted overflow-hidden shrink-0">
                      {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-3 h-3 text-muted-foreground m-1" />}
                    </div>
                    {r.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-[10px] text-muted-foreground font-body">Sin conversaciones aún. Busca un usuario para empezar.</p>
            </div>
          ) : (
            conversations.map(c => (
              <button key={c.partnerId} onClick={() => openConversation(c.partnerId, c.partnerName)}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors border-b border-border/20 text-left">
                <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0">
                  {c.partnerAvatar ? <img src={c.partnerAvatar} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground m-2" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-body font-medium text-foreground truncate">{c.partnerName}</span>
                    <span className="text-[8px] text-muted-foreground font-body shrink-0">
                      {new Date(c.lastDate).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground font-body truncate">{c.lastMessage}</p>
                    {c.unread > 0 && (
                      <span className="w-4 h-4 bg-destructive rounded-full text-[8px] text-destructive-foreground flex items-center justify-center font-bold shrink-0 ml-1">
                        {c.unread > 9 ? "9+" : c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        /* Messages view */
        <>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 retro-scrollbar">
            {messages.length === 0 ? (
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
