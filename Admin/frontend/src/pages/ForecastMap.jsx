import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiGet } from "../lib/api";
import { AS } from "../styles/adminStyles";

function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }

    if (!document.querySelector("link[data-leaflet='true']")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.setAttribute("data-leaflet", "true");
      document.head.appendChild(link);
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Leaflet failed to load"));
    document.head.appendChild(script);
  });
}

function formatPlan(plan) {
  if (!plan) return "-";
  const normalized = String(plan).toLowerCase();
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}Shield`;
}

export default function ForecastMap({ token }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(null);
  const leafletRef = useRef(null);
  const hasFittedBoundsRef = useRef(false);

  const [cities, setCities] = useState([]);
  const [selectedZone, setSelectedZone] = useState("");
  const [modelVersion, setModelVersion] = useState("seasonal_heuristic_v1");
  const [generatedAt, setGeneratedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const riskColors = {
    low: "#4ade80",
    medium: "#f59e0b",
    high: "#f97316",
    critical: "#ef4444",
  };

  const selectedForecast = useMemo(
    () => cities.find((city) => city.zone === selectedZone),
    [cities, selectedZone]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    apiGet("/admin/ml/forecast/tier1", token, { days: 7 })
      .then((response) => {
        if (!active) return;

        const loadedCities = Array.isArray(response?.cities) ? response.cities : [];
        setCities(loadedCities);
        setModelVersion(response?.modelVersion || "seasonal_heuristic_v1");
        setGeneratedAt(response?.generatedAt || "");

        if (loadedCities.length > 0) {
          setSelectedZone((previous) => {
            if (previous && loadedCities.some((entry) => entry.zone === previous)) {
              return previous;
            }
            return loadedCities[0].zone;
          });
        }
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load Tier-1 forecast data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    let disposed = false;

    loadLeaflet()
      .then((L) => {
        if (disposed || !mapRef.current || mapInstanceRef.current) return;

        leafletRef.current = L;
        const map = L.map(mapRef.current, { zoomControl: false }).setView([22.5, 78.9], 5);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
          maxZoom: 13,
        }).addTo(map);
        markersRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
      })
      .catch(() => {
        if (!disposed) setError("Map library could not be loaded.");
      });

    return () => {
      disposed = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = null;
      leafletRef.current = null;
      hasFittedBoundsRef.current = false;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    const markers = markersRef.current;

    if (!L || !map || !markers) return;

    markers.clearLayers();
    const bounds = [];

    cities.forEach((city) => {
      if (typeof city?.lat !== "number" || typeof city?.lng !== "number") return;

      const level = city.riskLevel || "medium";
      const color = riskColors[level] || riskColors.medium;
      const radius = 45000 + Math.round((Number(city.riskScore || 0.4) || 0.4) * 55000);
      const isActive = city.zone === selectedZone;

      const marker = L.circle([city.lat, city.lng], {
        color,
        fillColor: color,
        fillOpacity: isActive ? 0.36 : 0.24,
        weight: isActive ? 3 : 2,
        radius,
      });

      marker.bindPopup(
        `<b>${city.city}</b><br/>Zone ${city.zone}<br/>Risk ${String(level).toUpperCase()} (${Math.round((city.riskScore || 0) * 100)}%)`
      );
      marker.on("click", () => setSelectedZone(city.zone));
      marker.addTo(markers);
      bounds.push([city.lat, city.lng]);
    });

    if (!hasFittedBoundsRef.current && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 6 });
      hasFittedBoundsRef.current = true;
    }
  }, [cities, selectedZone]);

  const panelSubtitle = generatedAt
    ? `Updated ${new Date(generatedAt).toLocaleString("en-IN")}`
    : "Model refresh pending";

  return (
    <div>
      <div style={AS.topBar}>
        <div>
          <h1 style={AS.h1}>Tier-1 Disruption Forecast</h1>
          <p style={AS.muted}>Region-specific 7-day forecast with ML-backed risk scoring</p>
        </div>
        <div style={{ display: "grid", gap: "8px", minWidth: "min(240px, 100%)" }}>
          <label style={AS.label}>Region</label>
          <select
            style={AS.input}
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            disabled={loading || cities.length === 0}
          >
            {cities.map((city) => (
              <option key={city.zone} value={city.zone}>
                {city.city} ({city.zone})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          ...AS.card,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          gap: "12px",
        }}
      >
        <p style={{ ...AS.body, margin: 0 }}>{panelSubtitle}</p>
        <div style={{ ...AS.badge("#60a5fa") }}>Model: {modelVersion}</div>
      </div>

      {error && (
        <div style={{ ...AS.card, border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.08)" }}>
          <p style={{ ...AS.body, color: "#fca5a5", margin: 0 }}>{error}</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
        <div style={{ ...AS.card, padding: 0, overflow: "hidden", height: "530px" }}>
          <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
        </div>

        <div>
          <div style={{ ...AS.card, marginBottom: "12px" }}>
            <p style={{ ...AS.label, marginBottom: "10px" }}>LEGEND</p>
            {Object.entries(riskColors).map(([level, color]) => (
              <div key={level} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: color }} />
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", textTransform: "capitalize" }}>{level} Risk</span>
              </div>
            ))}
          </div>

          {loading && (
            <div style={AS.card}>
              <p style={{ ...AS.body, margin: 0 }}>Loading next-week forecast for Tier-1 cities...</p>
            </div>
          )}

          {!loading && selectedForecast && (
            <div style={AS.card}>
              <p style={{ ...AS.h3, marginBottom: "6px" }}>
                {selectedForecast.city} ({selectedForecast.zone})
              </p>
              <p style={{ ...AS.muted, marginBottom: "6px" }}>
                Peak Day: {selectedForecast.peakRiskDay} · Recommended: {formatPlan(selectedForecast.recommendedPlan)}
              </p>
              <p style={{ ...AS.muted, marginBottom: "12px" }}>
                Confidence: {Math.round((selectedForecast.confidence || 0) * 100)}%
              </p>

              {selectedForecast.forecastDays?.map((day) => (
                <div key={day.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                    {new Date(day.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "60px", height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px" }}>
                      <div
                        style={{
                          width: `${(day.riskScore || 0) * 100}%`,
                          height: "100%",
                          background: riskColors[day.riskLevel] || riskColors.medium,
                          borderRadius: "2px",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "11px", color: riskColors[day.riskLevel] || riskColors.medium }}>
                      {day.riskLevel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
