import React, { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import { supabase } from "../lib/supabase";
import { AS } from "../styles/adminStyles";

export default function SupportQueue({ token }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = sessionStorage.getItem("admin.support.cache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setTickets(parsed || []);
        setLoading(false);
      } catch (_) {}
    }

    const refresh = () => {
      apiGet("/admin/support/tickets", token)
        .then((data) => {
          setTickets(data || []);
          sessionStorage.setItem("admin.support.cache", JSON.stringify(data || []));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };

    refresh();

    const channel = supabase
      .channel("admin:support-tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [token]);

  return (
    <div>
      <div style={AS.topBar}><div><h1 style={AS.h1}>Support Queue</h1><p style={AS.muted}>{tickets.length} open tickets</p></div></div>
      <div style={AS.card}>
        {loading && tickets.length === 0 ? <p style={AS.muted}>Loading support queue...</p> : null}
        <table style={AS.table}>
          <thead><tr>{["Ticket Ref", "Worker", "Subject", "Messages", "Status", "Created"].map((h) => <th key={h} style={AS.th}>{h}</th>)}</tr></thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td style={AS.td}><span style={{ color: "#4ade80", fontWeight: "700" }}>{t.ticket_ref}</span></td>
                <td style={AS.td}>{t.users?.name || t.users?.phone || "—"}</td>
                <td style={{ ...AS.td, maxWidth: "200px" }}>{t.subject}</td>
                <td style={AS.td}>{t.support_message_count ?? t.support_messages?.length ?? 0}</td>
                <td style={AS.td}><span style={AS.badge(t.status === "OPEN" ? "#f59e0b" : "#4ade80")}>{t.status}</span></td>
                <td style={AS.td}>{new Date(t.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
              </tr>
            ))}
            {tickets.length === 0 && <tr><td colSpan={6} style={{ ...AS.td, textAlign: "center" }}>No open tickets</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
