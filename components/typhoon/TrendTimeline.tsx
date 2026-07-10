"use client";

import React from "react";
import type { TyphoonData } from "@/lib/typhoon/types";
import { CATEGORY_INFO, knotsToKmh } from "@/lib/typhoon/types";
import { TrendingDown, Wind } from "lucide-react";

type PointSelect = {
  lat: number;
  lng: number;
  time: string;
  pressure: number | null;
  windSpeed: number | null;
  isForecast: boolean;
  hoursAhead: number;
};

type Props = {
  data: TyphoonData | null;
  onPointSelect: (pt: PointSelect) => void;
  selectedPoint: PointSelect | null;
};

export default function TrendTimeline({
  data,
  onPointSelect,
  selectedPoint,
}: Props) {
  if (!data) {
    return (
      <div style={{ textAlign: "center", color: "#6B7B95", padding: 16 }}>
        暂无数据
      </div>
    );
  }

  // Build timeline: current (0h) + forecast points
  const timeline = [
    {
      label: "现在",
      hoursAhead: 0,
      lat: data.current.lat,
      lng: data.current.lng,
      pressure: data.current.pressure,
      windSpeed: data.current.windSpeed,
      time: data.current.validTime,
      isForecast: false,
      category: data.current.category,
    },
    ...data.forecast.map((fp) => ({
      label: `+${fp.hoursAhead}h`,
      hoursAhead: fp.hoursAhead,
      lat: fp.lat,
      lng: fp.lng,
      pressure: fp.pressure,
      windSpeed: fp.windSpeed,
      time: fp.validTime,
      isForecast: true,
      category: fp.category,
    })),
  ];

  // Find min/max for scaling
  const pressures = timeline.map((t) => t.pressure).filter(Boolean) as number[];
  const minPressure = Math.min(...pressures);
  const maxPressure = Math.max(...pressures);
  const pressureRange = maxPressure - minPressure || 1;

  const maxWind = Math.max(...timeline.map((t) => t.windSpeed));

  const isSelected = (t: (typeof timeline)[0]) =>
    selectedPoint?.hoursAhead === t.hoursAhead &&
    selectedPoint?.isForecast === t.isForecast;

  return (
    <div>
      {/* Title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 12,
        }}
      >
        <TrendingDown size={14} style={{ color: "#3BD5FF" }} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#8D9AAF",
          }}
        >
          强度趋势
        </span>
      </div>

      {/* Timeline bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {timeline.map((t, i) => {
          const pressurePct =
            ((t.pressure - minPressure) / pressureRange) * 100;
          const windPct = (t.windSpeed / Math.max(maxWind, 1)) * 100;
          const catInfo = CATEGORY_INFO[t.category];
          const sel = isSelected(t);

          return (
            <button
              key={i}
              onClick={() =>
                onPointSelect({
                  lat: t.lat,
                  lng: t.lng,
                  time: t.time,
                  pressure: t.pressure,
                  windSpeed: t.windSpeed,
                  isForecast: t.isForecast,
                  hoursAhead: t.hoursAhead,
                })
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 6,
                border: sel
                  ? `1px solid ${catInfo.color}40`
                  : "1px solid transparent",
                background: sel
                  ? `${catInfo.color}10`
                  : "transparent",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
                fontFamily: "inherit",
                color: "#e0e6f0",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!sel)
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.03)";
              }}
              onMouseLeave={(e) => {
                if (!sel)
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
              }}
            >
              {/* Label */}
              <div
                style={{
                  width: 42,
                  fontSize: 10,
                  fontWeight: 600,
                  color: t.isForecast ? "#F5D547" : catInfo.color,
                  flexShrink: 0,
                }}
              >
                {t.label}
              </div>

              {/* Bars */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                {/* Pressure bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span
                    style={{
                      fontSize: 9,
                      color: "#6B7B95",
                      width: 36,
                      flexShrink: 0,
                    }}
                  >
                    {t.pressure} hPa
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pressurePct}%`,
                        background:
                          t.pressure < 980
                            ? "#E53E3E"
                            : t.pressure < 1000
                              ? "#F08C3E"
                              : "#3BD5FF",
                        borderRadius: 3,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </div>

                {/* Wind bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span
                    style={{
                      fontSize: 9,
                      color: "#6B7B95",
                      width: 36,
                      flexShrink: 0,
                    }}
                  >
                    {t.windSpeed} kt
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 4,
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${windPct}%`,
                        background: catInfo.color,
                        borderRadius: 2,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Time */}
              <div
                style={{
                  fontSize: 9,
                  color: "#6B7B95",
                  flexShrink: 0,
                  width: 55,
                  textAlign: "right",
                }}
              >
                {new Date(t.time).toLocaleString("zh-CN", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                })}
              </div>
            </button>
          );
        })}
      </div>

      {/* Color legend */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 10,
          fontSize: 9,
          color: "#6B7B95",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: "#3BD5FF",
            }}
          />
          气压 (hPa)
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div
            style={{
              width: 8,
              height: 4,
              borderRadius: 2,
              background: "#E53E3E",
            }}
          />
          风速 (kt)
        </div>
      </div>
    </div>
  );
}
