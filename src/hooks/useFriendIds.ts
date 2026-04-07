import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useFriendIds(userId: string | undefined) {
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) { setFriendIds([]); return; }
    setLoading(true);
    const fetch = async () => {
      const { data } = await supabase
        .from("friend_requests")
        .select("sender_id, receiver_id")
        .eq("status", "accepted")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      
      const ids = (data || []).map(r => r.sender_id === userId ? r.receiver_id : r.sender_id);
      setFriendIds(ids);
      setLoading(false);
    };
    fetch();
  }, [userId]);

  return { friendIds, loading };
}
