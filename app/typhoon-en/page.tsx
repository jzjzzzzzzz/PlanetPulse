"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { TyphoonData, TyphoonApiResponse } from "@/lib/typhoon/types";
import { CATEGORY_INFO, knotsToKmh } from "@/lib/typhoon/types";
import { AlertTriangle, RefreshCw, Clock, Wind, Gauge, Compass, MoveRight, Circle, TrendingDown, Shield, ExternalLink } from "lucide-react";

const TyphoonMap = dynamic(() => import("@/components/typhoon/TyphoonMap"), { ssr: false });

const REFRESH_INTERVAL = 30 * 60; // 30 minutes

// ====================================================================
// Helper: metric card
// ====================================================================
function MetricCard({
  icon,
  label,
  value,
  sub,
  accent = "#3BD5FF",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ color: accent, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 10, color: "#6B7B95", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-jetbrains-mono), monospace", color: "#e0e6f0", lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "#6B7B95", marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

// ====================================================================
// Official Sources (English)
// ====================================================================
const OFFICIAL_SOURCES = [
  { name: "China MEM", url: "https://www.mem.gov.cn/", desc: "Ministry of Emergency Management" },
  { name: "National Early Warning Center", url: "https://www.12379.cn/", desc: "Official warning platform" },
  { name: "CMA Typhoon Network", url: "http://typhoon.nmc.cn/", desc: "China Meteorological Administration" },
  { name: "JMA Typhoon Info", url: "https://www.jma.go.jp/bosai/typhoon/", desc: "Japan Meteorological Agency — data source" },
];

const SAFETY_TIPS = [
  "Follow official warnings from local emergency management authorities",
  "Secure outdoor objects and close windows before the typhoon arrives",
  "Avoid coastal areas, riverbanks, and other dangerous zones",
  "Prepare emergency supplies: water, food, flashlight, medicine",
  "Keep communication channels open and monitor official channels",
];

// ====================================================================
// Trend Timeline (inline, English)
// ====================================================================
function TrendTimelineEn({
  data, onPointSelect, selectedPoint,
}: {
  data: TyphoonData | null;
  onPointSelect: (pt: { lat: number; lng: number; time: string; pressure: number | null; windSpeed: number | null; isForecast: boolean; hoursAhead: number }) => void;
  selectedPoint: { hoursAhead: number; isForecast: boolean } | null;
}) {
  if (!data) return <div style={{ textAlign: "center", color: "#6B7B95", padding: 16 }}>No data available</div>;

  const timeline = [
    { label: "Now", hoursAhead: 0, lat: data.current.lat, lng: data.current.lng, pressure: data.current.pressure, windSpeed: data.current.windSpeed, time: data.current.validTime, isForecast: false, category: data.current.category },
    ...data.forecast.map((fp) => ({ label: `+${fp.hoursAhead}h`, hoursAhead: fp.hoursAhead, lat: fp.lat, lng: fp.lng, pressure: fp.pressure, windSpeed: fp.windSpeed, time: fp.validTime, isForecast: true, category: fp.category })),
  ];

  const pressures = timeline.map((t) => t.pressure).filter(Boolean) as number[];
  const minP = Math.min(...pressures), maxP = Math.max(...pressures), range = maxP - minP || 1;
  const maxW = Math.max(...timeline.map((t) => t.windSpeed));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <TrendingDown size={14} style={{ color: "#3BD5FF" }} />
        <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8D9AAF" }}>Intensity Trend</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {timeline.map((t, i) => {
          const sel = selectedPoint?.hoursAhead === t.hoursAhead && selectedPoint?.isForecast === t.isForecast;
          const catInfo = CATEGORY_INFO[t.category];
          return (
            <button key={i} onClick={() => onPointSelect({ lat: t.lat, lng: t.lng, time: t.time, pressure: t.pressure, windSpeed: t.windSpeed, isForecast: t.isForecast, hoursAhead: t.hoursAhead })}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, border: sel ? `1px solid ${catInfo.color}40` : "1px solid transparent", background: sel ? `${catInfo.color}10` : "transparent", cursor: "pointer", width: "100%", textAlign: "left", fontFamily: "inherit", color: "#e0e6f0", transition: "background 0.15s" }}>
              <div style={{ width: 42, fontSize: 10, fontWeight: 600, color: t.isForecast ? "#F5D547" : catInfo.color, flexShrink: 0 }}>{t.label}</div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 9, color: "#6B7B95", width: 40, flexShrink: 0 }}>{t.pressure} hPa</span>
                  <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${((t.pressure - minP) / range) * 100}%`, background: t.pressure < 980 ? "#E53E3E" : t.pressure < 1000 ? "#F08C3E" : "#3BD5FF", borderRadius: 3, transition: "width 0.3s" }} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 9, color: "#6B7B95", width: 40, flexShrink: 0 }}>{t.windSpeed} kt</span>
                  <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(t.windSpeed / Math.max(maxW, 1)) * 100}%`, background: catInfo.color, borderRadius: 2, transition: "width 0.3s" }} />
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 9, color: "#6B7B95", flexShrink: 0, width: 55, textAlign: "right" }}>{new Date(t.time).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit" })}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ====================================================================
// Main Page
// ====================================================================
export default function TyphoonEnPage() {
  const [data, setData] = useState<TyphoonData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshIn, setRefreshIn] = useState(REFRESH_INTERVAL);
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number; time: string; pressure: number | null; windSpeed: number | null; isForecast: boolean; hoursAhead: number } | null>(null);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setLoading(true);
    try {
      const res = await fetch("/api/typhoon");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: TyphoonApiResponse = await res.json();
      if (json.data) { setData(json.data); setError(json.error); setStale(json.stale); }
      else setError(json.error ?? "Unknown error");
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); if (isManual) setRefreshIn(REFRESH_INTERVAL); }
  }, []);

  // Fix body overflow — root layout sets overflow-hidden, undo for this page
  useEffect(() => {
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    return () => {
      document.body.style.overflow = "";
      document.body.style.height = "";
    };
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const t = setInterval(() => setRefreshIn((p) => { if (p <= 1) { fetchData(); return REFRESH_INTERVAL; } return p - 1; }), 1000);
    return () => clearInterval(t);
  }, [fetchData]);

  const countdown = useMemo(() => `${Math.floor(refreshIn / 60)}:${String(refreshIn % 60).padStart(2, "0")}`, [refreshIn]);

  if (loading && !data) {
    return (
      <div style={{ minHeight: "100dvh", background: "linear-gradient(180deg, #0a0e1a 0%, #0d1525 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 48, height: 48, border: "3px solid rgba(59, 213, 255, 0.2)", borderTopColor: "#3BD5FF", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p style={{ color: "#8D9AAF", fontSize: 14 }}>Fetching typhoon data...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const storm = data?.storm;
  const current = data?.current;
  const catInfo = current ? CATEGORY_INFO[current.category] : null;

  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(180deg, #0a0e1a 0%, #0d1525 50%, #0f1a2e 100%)", color: "#e0e6f0", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* HEADER */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(10, 14, 26, 0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(59, 213, 255, 0.15)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={18} style={{ color: catInfo?.color ?? "#E53E3E" }} />
          <span style={{ fontSize: 11, letterSpacing: "0.1em", color: "#8D9AAF" }}>TYPHOON MONITOR</span>
          <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.02em", margin: 0 }}>
            {storm?.nameEn ?? "BAVI"}
            <span style={{ fontSize: 12, fontWeight: 400, color: catInfo?.color ?? "#F5D547", marginLeft: 8, padding: "2px 8px", background: `${catInfo?.color ?? "#F5D547"}18`, borderRadius: 4, border: `1px solid ${catInfo?.color ?? "#F5D547"}40` }}>
              {catInfo?.label ?? "Tropical Storm"}
            </span>
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
          {stale && <span style={{ color: "#F08C3E", background: "rgba(240, 140, 62, 0.1)", padding: "3px 8px", borderRadius: 4, display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={12} /> Data may be outdated</span>}
          {error && <span style={{ color: "#E53E3E", background: "rgba(229, 62, 62, 0.08)", padding: "3px 8px", borderRadius: 4, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={error}>{error.length > 30 ? error.slice(0, 30) + "..." : error}</span>}
          <span style={{ color: "#6B7B95" }}><Clock size={11} style={{ display: "inline", marginRight: 3 }} />{storm?.issueTime ? new Date(storm.issueTime).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "---"}</span>
          <button onClick={() => fetchData(true)} disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(59, 213, 255, 0.3)", background: "rgba(59, 213, 255, 0.08)", color: "#3BD5FF", cursor: "pointer", fontSize: 11, fontWeight: 600, opacity: loading ? 0.5 : 1 }}
            aria-label="Manual refresh">
            <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : undefined }} />{countdown}
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main style={{ display: "flex", flexDirection: "column" }}>
        {/* MAP */}
        <div style={{ height: "50vh", minHeight: 350, position: "relative" }}>
          <TyphoonMap data={data} selectedPoint={selectedPoint} onPointSelect={setSelectedPoint} lang="en" />
          <div style={{ position: "absolute", bottom: 4, right: 4, zIndex: 1000, fontSize: 9, color: "rgba(255,255,255,0.5)", background: "rgba(0,0,0,0.6)", padding: "2px 6px", borderRadius: 3, pointerEvents: "none" }}>
            &copy; JMA | &copy; OpenStreetMap | CartoDB dark_all
          </div>
        </div>

        {/* PANELS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "12px 16px", maxWidth: 1200, margin: "0 auto", width: "100%", boxSizing: "border-box" }} className="typhoon-en-panels">
          {/* Status Card */}
          <div className="panel-card" style={{ gridColumn: "1 / -1" }}>
            {data ? (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#e0e6f0" }}>
                    {selectedPoint ? (selectedPoint.isForecast ? `+${selectedPoint.hoursAhead}h Forecast` : "Current Position") : "Real-Time Status"}
                  </h2>
                  <span style={{ fontSize: 11, color: "#6B7B95" }}>
                    {(() => {
                      const t = selectedPoint?.time ?? data.current.validTime;
                      return new Date(t).toLocaleString("en", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
                    })()}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
                  <MetricCard icon={<Gauge size={16} />} label="Pressure" value={`${selectedPoint?.pressure ?? data.current.pressure}`} sub="hPa" accent="#3BD5FF" />
                  <MetricCard icon={<Wind size={16} />} label="Wind Speed" value={`${selectedPoint?.windSpeed ?? data.current.windSpeed}`} sub={`kt | ${knotsToKmh(selectedPoint?.windSpeed ?? data.current.windSpeed)} km/h`} accent="#F5D547" />
                  <MetricCard icon={<Wind size={16} />} label="Gust" value={`${data.current.gustSpeed ?? "---"}`} sub="kt" accent="#F08C3E" />
                  {!selectedPoint && data.current.direction != null && (
                    <>
                      <MetricCard icon={<Compass size={16} />} label="Direction" value={`${data.current.direction}°`} sub={data.current.direction < 90 ? "NE" : data.current.direction < 180 ? "SE" : data.current.direction < 270 ? "SW" : "NW"} accent="#6B9BD2" />
                      <MetricCard icon={<MoveRight size={16} />} label="Speed" value={`${data.current.speed ?? "---"}`} sub="km/h" accent="#8D9AAF" />
                    </>
                  )}
                  {!selectedPoint && data.windRadii.stormRadius && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 8px", background: "rgba(229, 62, 62, 0.05)", borderRadius: 8, border: "1px solid rgba(229, 62, 62, 0.15)" }}>
                      <Circle size={16} style={{ color: "#E53E3E", marginBottom: 4 }} />
                      <span style={{ fontSize: 10, color: "#6B7B95", marginBottom: 2 }}>Storm Radius</span>
                      <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-jetbrains-mono), monospace", color: "#E53E3E", lineHeight: 1.2 }}>{data.windRadii.stormRadius}</span>
                      <span style={{ fontSize: 10, color: "#6B7B95", marginTop: 1 }}>km</span>
                    </div>
                  )}
                  {!selectedPoint && data.windRadii.galeRadius && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 8px", background: "rgba(240, 140, 62, 0.05)", borderRadius: 8, border: "1px solid rgba(240, 140, 62, 0.15)" }}>
                      <Circle size={16} style={{ color: "#F08C3E", marginBottom: 4 }} />
                      <span style={{ fontSize: 10, color: "#6B7B95", marginBottom: 2 }}>Gale Radius</span>
                      <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-jetbrains-mono), monospace", color: "#F08C3E", lineHeight: 1.2 }}>{data.windRadii.galeRadius}</span>
                      <span style={{ fontSize: 10, color: "#6B7B95", marginTop: 1 }}>km</span>
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize: 10, color: "#6B7B95", marginBottom: 4 }}>Position</span>
                    <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-jetbrains-mono), monospace", color: "#e0e6f0" }}>{(selectedPoint?.lat ?? data.current.lat).toFixed(1)}&deg;N</span>
                    <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-jetbrains-mono), monospace", color: "#e0e6f0" }}>{(selectedPoint?.lng ?? data.current.lng).toFixed(1)}&deg;E</span>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", color: "#6B7B95", padding: 16 }}>No data available</div>
            )}
          </div>

          {/* Trend Timeline */}
          <div className="panel-card">
            <TrendTimelineEn data={data} onPointSelect={setSelectedPoint} selectedPoint={selectedPoint} />
          </div>

          {/* Official Info */}
          <div className="panel-card">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <Shield size={14} style={{ color: "#3BD5FF" }} />
              <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8D9AAF" }}>Official Info &amp; Safety</span>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#6B7B95", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Official Warning Portals</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {OFFICIAL_SOURCES.map((src) => (
                  <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 6, background: "rgba(59, 213, 255, 0.04)", border: "1px solid rgba(59, 213, 255, 0.1)", textDecoration: "none", color: "#e0e6f0", transition: "background 0.15s" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{src.name}</div>
                      <div style={{ fontSize: 10, color: "#6B7B95", marginTop: 1 }}>{src.desc}</div>
                    </div>
                    <ExternalLink size={12} style={{ color: "#6B7B95", flexShrink: 0 }} />
                  </a>
                ))}
              </div>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#F08C3E", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <AlertTriangle size={10} />Safety Tips
              </div>
              <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 11, color: "#8D9AAF", lineHeight: 1.8 }}>
                {SAFETY_TIPS.map((tip, i) => <li key={i}>{tip}</li>)}
              </ul>
            </div>
            <div style={{ marginTop: 14, padding: "8px 10px", borderRadius: 6, background: "rgba(240, 140, 62, 0.06)", border: "1px solid rgba(240, 140, 62, 0.12)", fontSize: 10, color: "#F08C3E", lineHeight: 1.6 }}>
              <strong>Disclaimer:</strong> Typhoon information on this page is for informational reference only. It does not constitute any form of official warning or evacuation guidance. Please refer to official warnings issued by the China Meteorological Administration, Ministry of Emergency Management, and local authorities. China risk information only cites official announcements and warning portals — no disaster or landfall conclusions are independently inferred.
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer style={{ textAlign: "center", padding: "12px 16px", fontSize: 10, color: "#6B7B95", borderTop: "1px solid rgba(59, 213, 255, 0.08)", background: "rgba(10, 14, 26, 0.8)" }}>
        <p style={{ margin: 0, lineHeight: 1.8 }}>Data source: Japan Meteorological Agency (JMA) | For informational purposes only — follow official local authority warnings</p>
        <p style={{ margin: "4px 0 0", opacity: 0.6 }}>Copyright &copy; 2026 John Zhou | <a href="/" style={{ color: "#3BD5FF", textDecoration: "none" }}>Planet Pulse</a></p>
      </footer>

      <style>{`
        .panel-card { background: rgba(15, 25, 45, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(59, 213, 255, 0.12); border-radius: 12px; padding: 14px; overflow: hidden; }
        @media (max-width: 768px) { .typhoon-en-panels { grid-template-columns: 1fr !important; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
