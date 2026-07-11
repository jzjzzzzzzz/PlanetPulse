"use client";

import React from "react";
import type { TyphoonData } from "@/lib/typhoon/types";
import { CATEGORY_INFO, knotsToMs } from "@/lib/typhoon/types";
import { TrendingDown } from "lucide-react";

type Props = {
  data: TyphoonData | null;
  onPointSelect: (pt: { lat: number; lng: number; time: string; pressure: number | null; windSpeed: number | null; isForecast: boolean; hoursAhead: number }) => void;
  selectedPoint: { hoursAhead: number; isForecast: boolean } | null;
};

function barColor(cat: string): string {
  switch (cat) { case "TY": return "#E53E3E"; case "STS": return "#F08C3E"; case "TS": return "#F5D547"; default: return "#6B9BD2"; }
}

export default function TrendTimeline({ data, onPointSelect, selectedPoint }: Props) {
  if (!data) return <div style={{ textAlign: "center", color: "var(--tp-text-muted, #6B7B95)", padding: 16 }}>No data available</div>;

  const timeline = [
    { label: "Now", hoursAhead: 0, lat: data.current.lat, lng: data.current.lng, pressure: data.current.pressure, windMs: knotsToMs(data.current.windSpeed), time: data.current.validTime, isForecast: false, category: data.current.category },
    ...data.forecast.map((fp) => ({ label: `+${fp.hoursAhead}h`, hoursAhead: fp.hoursAhead, lat: fp.lat, lng: fp.lng, pressure: fp.pressure, windMs: knotsToMs(fp.windSpeed), time: fp.validTime, isForecast: true, category: fp.category })),
  ];
  const maxMs = Math.max(...timeline.map((t) => t.windMs), 1);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <TrendingDown size={14} style={{ color: "#3BD5FF" }} />
        <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--tp-text-secondary, #8D9AAF)" }}>Intensity Forecast</span>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", minHeight: 100, paddingBottom: 4 }}>
        {timeline.map((t, i) => {
          const sel = selectedPoint?.hoursAhead === t.hoursAhead && selectedPoint?.isForecast === t.isForecast;
          const color = barColor(t.category);
          const h = Math.max(6, Math.round((t.windMs / maxMs) * 80));
          return (
            <button key={i} onClick={() => onPointSelect({ lat: t.lat, lng: t.lng, time: t.time, pressure: t.pressure, windSpeed: null, isForecast: t.isForecast, hoursAhead: t.hoursAhead })}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px 6px", borderRadius: 8, border: sel ? `1px solid ${color}40` : "1px solid transparent", background: sel ? `${color}12` : "var(--tp-card-bg, rgba(255,255,255,0.02))", cursor: "pointer", fontFamily: "inherit", color: "var(--tp-text, #e0e6f0)", minWidth: 0 }}>
              <div style={{ width: "100%", maxWidth: 32, height: h, background: color, borderRadius: "4px 4px 0 0", opacity: t.isForecast ? 0.7 : 1 }} />
              <span style={{ fontSize: 9, fontWeight: 700, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{CATEGORY_INFO[t.category].label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-jetbrains-mono), monospace" }}>{t.windMs}</span>
              <span style={{ fontSize: 8, color: "var(--tp-text-muted, #6B7B95)" }}>m/s</span>
              <span style={{ fontSize: 8, color: "var(--tp-text-muted, #6B7B95)", whiteSpace: "nowrap" }}>{new Date(t.time).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit" })}</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: t.isForecast ? "#F5D547" : color }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
