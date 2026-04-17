import React, { useEffect, useState, useRef } from "react";
import { apiGet, apiPost } from "../lib/api";
import { useRealtimeTriggers } from "../hooks/useRealtime";
import TriggerBadge from "../components/TriggerBadge";
import { AS, TRIGGER_COLORS } from "../styles/adminStyles";

const ZONES = [
  { pincode: "400070", city: "Mumbai", lat: 19.076, lng: 72.877, base_risk: 0.85 },
  { pincode: "400001", city: "Mumbai South", lat: 18.938, lng: 72.835, base_risk: 0.8 },
  { pincode: "110001", city: "Delhi", lat: 28.704, lng: 77.102, base_risk: 0.72 },
  { pincode: "380015", city: "Ahmedabad", lat: 23.022, lng: 72.571, base_risk: 0.6 },
  { pincode: "560001", city: "Bangalore", lat: 12.971, lng: 77.594, base_risk: 0.55 },
  { pincode: "600001", city: "Chennai", lat: 13.082, lng: 80.27, base_risk: 0.65 },
  { pincode: "411001", city: "Pune", lat: 18.52, lng: 73.856, base_risk: 0.5 },
  { pincode: "700001", city: "Kolkata", lat: 22.572, lng: 88.363, base_risk: 0.58 },
  { pincode: "500001", city: "Hyderabad", lat: 17.385, lng: 78.486, base_risk: 0.52 },
];

const ZONE_STORAGE_KEY = "admin.trigger.zone";

function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) { resolve(window.L); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve(window.L);
    document.head.appendChild(script);
  });
}

export default function TriggerMap({ token }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [zoneForecast, setZoneForecast] = useState([]);
  const [selectedZoneKey, setSelectedZoneKey] = useState(() => localStorage.getItem(ZONE_STORAGE_KEY) || "400070");
  const [fireTriggerForm, setFireTriggerForm] = useState({ pincode: "400070", city: "Mumbai", forceType: "T-01" });
  const [firing, setFiring] = useState(false);
  const [toast, setToast] = useState("");
  const { triggers } = useRealtimeTriggers();

  useEffect(() => {
    const selected = ZONES.find((z) => z.pincode === selectedZoneKey) || ZONES[0];
    setFireTriggerForm((prev) => ({ ...prev, pincode: selected.pincode, city: selected.city }));
    localStorage.setItem(ZONE_STORAGE_KEY, selected.pincode);
  }, [selectedZoneKey]);

  useEffect(() => {
    apiGet("/admin/ml/zones", token).then(setZoneForecast).catch(() => {});
  }, [token]);

  useEffect(() => {
    loadLeaflet().then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const map = L.map(mapRef.current).setView([20, 78], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap", maxZoom: 13,
      }).addTo(map);
      mapInstanceRef.current = map;

      const mapZones = zoneForecast.length > 0
        ? zoneForecast
        : ZONES.map((z) => ({ pincode: z.pincode, city: z.city, lat: z.lat, lng: z.lng, riskLevel: "medium", riskScore: z.base_risk }));

      mapZones.forEach((zone) => {
        const color = zone.riskLevel === "critical" ? "#ef4444" : zone.riskLevel === "high" ? "#f97316" : zone.riskLevel === "medium" ? "#f59e0b" : "#4ade80";
        L.circle([zone.lat, zone.lng], {
          color, fillColor: color, fillOpacity: 0.2, radius: zone.riskScore * 60000,
        }).addTo(map).bindPopup(`<b>${zone.city}</b><br/>Risk: ${zone.riskLevel} (${(zone.riskScore * 100).toFixed(0)}%)`);
      });
    });
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, [zoneForecast]);

  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstanceRef.current) return;
    const zoneLookup = new Map([
      ...ZONES.map((z) => [z.pincode, z]),
      ...zoneForecast.map((z) => [z.pincode, z]),
    ]);

    triggers.slice(0, 20).forEach((t) => {
      const zone = zoneLookup.get(t.zone_pincode);
      if (!zone) return;
      const color = TRIGGER_COLORS[t.type] || "#888";
      L.circleMarker([zone.lat, zone.lng], { color, fillColor: color, fillOpacity: 0.8, radius: 10 })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>${t.type} — ${t.severity_label}</b><br/>${t.zone_city}<br/>${new Date(t.triggered_at).toLocaleString("en-IN")}`);
    });
  }, [triggers, zoneForecast]);

  const handleFireTrigger = async () => {
    setFiring(true);
    try {
      await apiPost("/admin/triggers/fire", { pincode: fireTriggerForm.pincode, city: fireTriggerForm.city, force_type: fireTriggerForm.forceType }, token);
      setToast(`${fireTriggerForm.forceType} fired in ${fireTriggerForm.city}!`);
      setTimeout(() => setToast(""), 3000);
    } catch (e) { setToast(e.message); setTimeout(() => setToast(""), 4000); }
    setFiring(false);
  };

  return (
    <div>
      {toast && <div style={{ position: "fixed", top: "16px", right: "16px", background: "#1a2e1a", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "10px", padding: "10px 16px", fontSize: "13px", color: "#4ade80", zIndex: 999 }}>{toast}</div>}
      <div style={AS.topBar}>
        <div><h1 style={AS.h1}>Trigger Map</h1><p style={AS.muted}>Live zone disruptions & risk forecast</p></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "16px" }}>
        <div style={{ ...AS.card, padding: 0, overflow: "hidden", height: "520px" }}>
          <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
        </div>

        <div>
          <div style={{ ...AS.card, marginBottom: "16px" }}>
            <p style={{ ...AS.label, marginBottom: "12px" }}>FIRE TEST TRIGGER</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <select style={AS.input} value={fireTriggerForm.forceType} onChange={e => setFireTriggerForm((f) => ({ ...f, forceType: e.target.value }))}>
                {["T-01", "T-02", "T-03", "T-04", "T-05", "T-06", "T-07"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                style={AS.input}
                value={selectedZoneKey}
                onChange={(e) => setSelectedZoneKey(e.target.value)}
              >
                {ZONES.map((z) => (
                  <option key={z.pincode} value={z.pincode}>{z.city} ({z.pincode})</option>
                ))}
              </select>
              <input style={AS.input} value={fireTriggerForm.pincode} readOnly />
              <input style={AS.input} value={fireTriggerForm.city} readOnly />
              <button style={{ ...AS.btn("primary"), width: "100%" }} disabled={firing} onClick={handleFireTrigger}>
                {firing ? "Firing..." : "🔥 Fire Trigger"}
              </button>
            </div>
          </div>

          <div style={AS.card}>
            <p style={{ ...AS.label, marginBottom: "12px" }}>RECENT TRIGGERS</p>
            {triggers.slice(0, 8).map((t) => (
              <div key={t.id} style={{ marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <TriggerBadge code={t.type} />
                  <span style={AS.muted}>{new Date(t.triggered_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p style={{ ...AS.muted, marginTop: "2px" }}>{t.zone_city} · {t.claims_generated || 0} claims</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
