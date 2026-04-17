import { useEffect, useState } from "react";
import { callFunction, supabase } from "../lib/supabase";

export function useSupportChat(userId, session) {
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!ticket?.id) return;

    const channel = supabase
      .channel(`support-ticket-${ticket.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${ticket.id}` },
        (payload) => {
          const newMessage = payload.new;
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "support_tickets", filter: `id=eq.${ticket.id}` },
        (payload) => {
          setTicket((prev) => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket?.id]);

  async function openOrCreateTicket(subject = "General Support") {
    const { data: existing } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "OPEN")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      setTicket(existing);
      await loadMessages(existing.id);
      return existing;
    }

    const ref = `GS-${Math.floor(10000 + Math.random() * 90000)}`;
    const { data: newTicket } = await supabase
      .from("support_tickets")
      .insert({ user_id: userId, subject, ticket_ref: ref })
      .select()
      .single();

    setTicket(newTicket);

    await supabase.from("support_messages").insert({
      ticket_id: newTicket.id,
      role: "ai",
      text: "Hi! I'm Sentinel, your GigShield support assistant. I can help with payout delays, policy questions, or coverage issues. What's on your mind?"
    });

    await loadMessages(newTicket.id);
    return newTicket;
  }

  async function loadMessages(ticketId) {
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    setMessages(data || []);
  }

  async function sendMessage(text) {
    if (!ticket || !text.trim() || sending) return;

    const tempId = `temp-${Date.now()}`;
    setSending(true);
    setMessages((prev) => [...prev, { id: tempId, role: "user", text }]);

    try {
      await callFunction("support-chat", { ticketId: ticket.id, message: text }, session);
      await loadMessages(ticket.id);
    } catch (_e) {
      setMessages((prev) => [
        ...prev.filter((msg) => msg.id !== tempId),
        { role: "user", text },
        { role: "ai", text: "Sorry, I'm having trouble right now. Please try again." }
      ]);
    }

    setSending(false);
  }

  return { ticket, messages, sending, openOrCreateTicket, sendMessage };
}
