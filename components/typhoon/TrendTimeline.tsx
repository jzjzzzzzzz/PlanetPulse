"use client";

import React from "react";
import type { TyphoonData } from "@/lib/typhoon/types";
import { CATEGORY_INFO, knotsToMs } from "@/lib/typhoon/types";
import { TrendingDown } from "lucide-react";

type PointSelect = {
  lat: number; lng: number; time: string;
  pressure: number | null; windSpeed: number | null;
  isForecast: boolean; hoursAhead: number;
};

type Props = {
  data: TyphoonData | null;
  onPointSelect: (pt: PointSelect) => void;
  selectedPoint: PointSelect | null;
  lang?: "zh" | "en";
};

// Intensity bar color — gradient from red (TY) -> orange (STS) -> yellow (TS) -> blue (TD)
function barColor(cat: string): string {
  switch (cat) {
    case "TY": return "#E53E3E";
    case "STS": return "#F08C3E";
    case "TS": return "#F5D547";
    default: return "#6B9BD2";
  }
}

function barHeight(windMs: number, maxMs: number): number {
  const pct = maxMs > 0 ? (windMs / maxMs) * 100 : 0;
  return Math.max(4, pct);
}

export default function TrendTimeline({ data, onPointSelect, selectedPoint, lang = "zh" }: Props) {
  if (!data) return <div style={{ textAlign: "center", color: "var(--tp-text-muted, #6B7B95)", padding: 16 }}>{lang === "en" ? "No data" : "暂无数据"}</div>;

  const t = (zh: string, en: string) => lang === "en" ? en : zh;

  const timeline = [
    {
      label: t("实况", "Now"), hoursAhead: 0, lat: data.current.lat, lng: data.current.lng,
      pressure: data.current.pressure, windMs: knotsToMs(data.current.windSpeed),
      time: data.current.validTime, isForecast: false, category: data.current.category,
    },
    ...data.forecast.map((fp) => ({
      label: `+${fp.hoursAhead}h`, hoursAhead: fp.hoursAhead, lat: fp.lat, lng: fp.lng,
      pressure: fp.pressure, windMs: knotsToMs(fp.windSpeed),
      time: fp.validTime, isForecast: true, category: fp.category,
    })),
  ];

  const maxMs = Math.max(...timeline.map((t) => t.windMs), 1);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <TrendingDown size={14} style={{ color: "#3BD5FF" }} />
        <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--tp-text-secondary, #8D9AAF)" }}>
          {t("强度预报", "Intensity Forecast")}
        </span>
      </div>

      {/* Horizontal bars */}
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", minHeight: 100, paddingBottom: 4 }}>
        {timeline.map((t, i) => {
          const sel = selectedPoint?.hoursAhead === t.hoursAhead && selectedPoint?.isForecast === t.isForecast;
          const catInfo = CATEGORY_INFO[t.category];
          const color = barColor(t.category);
          const h = barHeight(t.windMs, maxMs);

          return (
            <button
              key={i}
              onClick={() => onPointSelect({ lat: t.lat, lng: t.lng, time: t.time, pressure: t.pressure, windSpeed: null, isForecast: t.isForecast, hoursAhead: t.hoursAhead })}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "8px 4px 6px", borderRadius: 8,
                border: sel ? `1px solid ${color}40` : "1px solid transparent",
                background: sel ? `${color}12` : "var(--tp-card-bg, rgba(255,255,255,0.02))",
                cursor: "pointer", fontFamily: "inherit", color: "var(--tp-text, #e0e6f0)",
                transition: "background 0.15s", minWidth: 0,
              }}
            >
              {/* Wind bar */}
              <div style={{
                width: "100%", maxWidth: 32, height: `${h}%`, minHeight: 4,
                background: color, borderRadius: "4px 4px 0 0",
                opacity: t.isForecast ? 0.7 : 1,
              }} />

              {/* Category label */}
              <span style={{
                fontSize: 9, fontWeight: 700, color,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
              }}>
                {lang === "en" ? catInfo.label : catInfo.labelJp}
              </span>

              {/* Wind speed */}
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                {t.windMs}
              </span>
              <span style={{ fontSize: 8, color: "var(--tp-text-muted, #6B7B95)" }}>m/s</span>

              {/* Time */}
              <span style={{ fontSize: 8, color: "var(--tp-text-muted, #6B7B95)", whiteSpace: "nowrap" }}>
                {new Date(t.time).toLocaleString(lang === "en" ? "en-US" : "zh-CN", { month: "short", day: "numeric", hour: "2-digit" })}
              </span>

              {/* Label */}
              <span style={{ fontSize: 9, fontWeight: 600, color: t.isForecast ? "#F5D547" : color }}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Legend row */}
      <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 9, color: "var(--tp-text-muted, #6B7B95)", justifyContent: "center" }}>
        <span>{t("柱高=风速(m/s)", "Bar = wind (m/s)")}</span>
        <span style={{ color: "#E53E3E" }}>TY</span>
        <span style={{ color: "#F08C3E" }}>STS</span>
        <span style={{ color: "#F5D547" }}>TS</span>
        <span style={{ color: "#6B9BD2" }}>TD</span>
      </div>
    </div>
  );
}
