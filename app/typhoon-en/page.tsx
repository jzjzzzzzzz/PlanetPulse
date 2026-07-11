"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { TyphoonData, TyphoonApiResponse } from "@/lib/typhoon/types";
import { CATEGORY_INFO } from "@/lib/typhoon/types";
import { AlertTriangle, RefreshCw, Clock } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useTheme } from "@/lib/theme/useTheme";
import StatusCard from "@/components/typhoon/StatusCard";
import TrendTimeline from "@/components/typhoon/TrendTimeline";
import PredictionPanel from "@/components/typhoon/PredictionPanel";

const TyphoonMap = dynamic(() => import("@/components/typhoon/TyphoonMap"), { ssr: false });
const REFRESH_INTERVAL = 30 * 60;

export default function TyphoonEnPage() {
  const [data, setData] = useState<TyphoonData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshIn, setRefreshIn] = useState(REFRESH_INTERVAL);
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number; time: string; pressure: number | null; windSpeed: number | null; isForecast: boolean; hoursAhead: number } | null>(null);
  const { colors } = useTheme();

  useEffect(() => { document.body.style.overflow = "auto"; document.body.style.height = "auto"; return () => { document.body.style.overflow = ""; document.body.style.height = ""; }; }, []);

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

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const t = setInterval(() => setRefreshIn((p) => { if (p <= 1) { fetchData(); return REFRESH_INTERVAL; } return p - 1; }), 1000); return () => clearInterval(t); }, [fetchData]);

  const countdown = useMemo(() => `${Math.floor(refreshIn / 60)}:${String(refreshIn % 60).padStart(2, "0")}`, [refreshIn]);

  if (loading && !data) {
    return (
      <div style={{ minHeight: "100dvh", background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 48, height: 48, border: "3px solid rgba(59, 213, 255, 0.2)", borderTopColor: "#3BD5FF", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p style={{ color: colors.textMuted, fontSize: 14 }}>Fetching typhoon data...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const storm = data?.storm;
  const current = data?.current;
  const catInfo = current ? CATEGORY_INFO[current.category] : null;

  return (
    <div style={{ minHeight: "100dvh", background: colors.bg, color: colors.text, "--tp-bg-panel": colors.bgPanel, "--tp-border": colors.border, "--tp-text": colors.text, "--tp-text-muted": colors.textMuted, "--tp-text-secondary": colors.textSecondary, "--tp-card-bg": colors.cardBg, fontFamily: "system-ui, -apple-system, sans-serif" } as React.CSSProperties}>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: colors.headerBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: `1px solid ${colors.borderAccent}`, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={18} style={{ color: catInfo?.color ?? "#E53E3E" }} />
          <span style={{ fontSize: 11, letterSpacing: "0.1em", color: colors.textSecondary }}>TYPHOON MONITOR</span>
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
          <span style={{ color: colors.textMuted }}><Clock size={11} style={{ display: "inline", marginRight: 3 }} />{storm?.issueTime ? new Date(storm.issueTime).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "---"}</span>
          <button onClick={() => fetchData(true)} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(59, 213, 255, 0.3)", background: "rgba(59, 213, 255, 0.08)", color: "#3BD5FF", cursor: "pointer", fontSize: 11, fontWeight: 600, opacity: loading ? 0.5 : 1 }} aria-label="Manual refresh"><RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : undefined }} />{countdown}</button>
        </div>
      </header>

      <main style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ height: "50vh", minHeight: 350, position: "relative" }}>
          <TyphoonMap data={data} selectedPoint={selectedPoint} onPointSelect={setSelectedPoint} />
          <div style={{ position: "absolute", bottom: 4, right: 4, zIndex: 1000, fontSize: 9, color: "rgba(255,255,255,0.5)", background: "rgba(0,0,0,0.6)", padding: "2px 6px", borderRadius: 3, pointerEvents: "none" }}>&copy; JMA | &copy; OpenStreetMap | CartoDB dark_all</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "12px 16px", maxWidth: 1200, margin: "0 auto", width: "100%", boxSizing: "border-box" }} className="typhoon-panels">
          <div className="panel-card" style={{ gridColumn: "1 / -1" }}>
            <StatusCard data={data} selectedPoint={selectedPoint} />
          </div>
          <div className="panel-card">
            <TrendTimeline data={data} onPointSelect={setSelectedPoint} selectedPoint={selectedPoint} />
          </div>
          <div className="panel-card">
            <PredictionPanel data={data} />
          </div>
          <div className="panel-card">
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.textSecondary, marginBottom: 10 }}>Official Info &amp; Safety</div>
            <a href="https://www.mem.gov.cn/" target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: "8px 10px", borderRadius: 6, background: "rgba(229, 62, 62, 0.06)", border: "1px solid rgba(229, 62, 62, 0.15)", textDecoration: "none", color: "#e0e6f0", marginBottom: 8, fontSize: 12 }}>
              <div style={{ fontWeight: 600, color: "#E53E3E" }}>National Flood Control HQ — Typhoon Defense Deployment</div>
              <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>Ministry of Emergency Management</div>
            </a>
            <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 10, lineHeight: 1.6 }}>
              <strong style={{ color: "#F08C3E" }}>Disclaimer:</strong> Typhoon information is for reference only. Follow official warnings from local authorities. China risk info only cites official announcements.
            </div>
          </div>
        </div>
      </main>

      <ThemeToggle />
      <footer style={{ textAlign: "center", padding: "12px 16px", fontSize: 10, color: colors.textMuted, borderTop: "1px solid rgba(59, 213, 255, 0.08)", background: colors.footerBg }}>
        <p style={{ margin: 0 }}>Data: JMA | For informational purposes only</p>
        <p style={{ margin: "4px 0 0", opacity: 0.6 }}>Copyright &copy; 2026 John Zhou | <a href="/" style={{ color: "#3BD5FF", textDecoration: "none" }}>Planet Pulse</a></p>
      </footer>
      <style>{`
        .panel-card { background: var(--tp-bg-panel, rgba(15, 25, 45, 0.7)); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid var(--tp-border, rgba(59,213,255,0.12)); border-radius: 12px; padding: 14px; overflow: hidden; }
        @media (max-width: 768px) { .typhoon-panels { grid-template-columns: 1fr !important; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
