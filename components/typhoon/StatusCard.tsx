"use client";

import React from "react";
import type { TyphoonData } from "@/lib/typhoon/types";
import { CATEGORY_INFO, knotsToMs, getWindLevel, degreesToCompass } from "@/lib/typhoon/types";
import { Wind, Gauge, Compass, MoveRight, Circle } from "lucide-react";

type PointSelect = {
  lat: number; lng: number; time: string;
  pressure: number | null; windSpeed: number | null;
  isForecast: boolean; hoursAhead: number;
};

type Props = { data: TyphoonData | null; selectedPoint: PointSelect | null; };

export default function StatusCard({ data, selectedPoint }: Props) {
  if (!data) return <div style={{ textAlign: "center", color: "#6B7B95", padding: 16 }}>No data available</div>;

  const display = selectedPoint ?? {
    lat: data.current.lat, lng: data.current.lng,
    pressure: data.current.pressure, windSpeed: data.current.windSpeed,
    time: data.current.validTime, isForecast: false, hoursAhead: 0,
  };

  const windKt = display.windSpeed ?? 0;
  const windMs = knotsToMs(windKt);
  const windLevel = getWindLevel(windMs);
  const catInfo = selectedPoint ? null : CATEGORY_INFO[data.current.category];
  const compass = data.current.direction != null ? degreesToCompass(data.current.direction) : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--tp-text, #e0e6f0)" }}>
            {display.isForecast ? `+${display.hoursAhead}h Forecast` : "Real-Time Status"}
          </h2>
          {!selectedPoint && catInfo && (
            <span style={{ fontSize: 11, color: catInfo.color, background: `${catInfo.color}18`, padding: "2px 8px", borderRadius: 4 }}>
              {catInfo.label}
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: "var(--tp-text-muted, #6B7B95)" }}>
          {new Date(display.time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
        <div className="metric-tile">
          <Gauge size={16} style={{ color: "#3BD5FF", marginBottom: 4 }} />
          <div className="metric-label">Pressure</div>
          <div className="metric-value" style={{ color: "#3BD5FF" }}>{display.pressure ?? "—"}</div>
          <div className="metric-unit">hPa</div>
        </div>

        <div className="metric-tile">
          <Wind size={16} style={{ color: "#E53E3E", marginBottom: 4 }} />
          <div className="metric-label">Max Wind</div>
          <div className="metric-value" style={{ color: "#E53E3E" }}>{windMs}</div>
          <div className="metric-unit">m/s</div>
        </div>

        <div className="metric-tile">
          <Wind size={16} style={{ color: "#F5D547", marginBottom: 4 }} />
          <div className="metric-label">Wind Force</div>
          <div className="metric-value" style={{ color: "#F5D547" }}>L{windLevel.level}</div>
          <div className="metric-unit">{windLevel.labelEn}</div>
        </div>

        <div className="metric-tile">
          <Wind size={16} style={{ color: "#F08C3E", marginBottom: 4 }} />
          <div className="metric-label">Gust</div>
          <div className="metric-value" style={{ color: "#F08C3E" }}>{data.current.gustSpeed ? knotsToMs(data.current.gustSpeed) : "—"}</div>
          <div className="metric-unit">m/s</div>
        </div>

        {!selectedPoint && data.current.direction != null && (<>
          <div className="metric-tile">
            <Compass size={16} style={{ color: "#6B9BD2", marginBottom: 4 }} />
            <div className="metric-label">Direction</div>
            <div className="metric-value" style={{ color: "#6B9BD2", fontSize: 14 }}>{compass?.en ?? "—"}</div>
            <div className="metric-unit">{data.current.direction}°</div>
          </div>
          <div className="metric-tile">
            <MoveRight size={16} style={{ color: "#8D9AAF", marginBottom: 4 }} />
            <div className="metric-label">Speed</div>
            <div className="metric-value">{data.current.speed ?? "—"}</div>
            <div className="metric-unit">km/h</div>
          </div>
        </>)}

        {!selectedPoint && (<>
          {data.windRadii.stormRadius ? (
            <div className="metric-tile" style={{ border: "1px solid rgba(229,62,62,0.2)" }}>
              <Circle size={16} style={{ color: "#E53E3E", marginBottom: 4 }} />
              <div className="metric-label">Storm Radius</div>
              <div className="metric-value" style={{ color: "#E53E3E" }}>{data.windRadii.stormRadius}</div>
              <div className="metric-unit">km</div>
            </div>
          ) : null}
          {data.windRadii.galeRadius ? (
            <div className="metric-tile" style={{ border: "1px solid rgba(240,140,62,0.2)" }}>
              <Circle size={16} style={{ color: "#F08C3E", marginBottom: 4 }} />
              <div className="metric-label">Gale Radius</div>
              <div className="metric-value" style={{ color: "#F08C3E" }}>{data.windRadii.galeRadius}</div>
              <div className="metric-unit">km</div>
            </div>
          ) : null}
        </>)}

        <div className="metric-tile">
          <div style={{ fontSize: 10, color: "var(--tp-text-muted, #6B7B95)", marginBottom: 4 }}>Position</div>
          <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-jetbrains-mono), monospace", color: "var(--tp-text, #e0e6f0)" }}>
            {display.lat.toFixed(1)}°N {display.lng.toFixed(1)}°E
          </div>
        </div>
      </div>

      <style>{`
        .metric-tile { display: flex; flex-direction: column; align-items: center; padding: 10px 6px; border-radius: 8px; border: 1px solid var(--tp-border, rgba(59,213,255,0.12)); background: var(--tp-card-bg, rgba(255,255,255,0.03)); }
        .metric-label { font-size: 10px; color: var(--tp-text-muted, #6B7B95); margin-bottom: 2px; text-align: center; }
        .metric-value { font-size: 18px; fontWeight: 700; font-family: var(--font-jetbrains-mono), monospace; color: var(--tp-text, #e0e6f0); line-height: 1.2; }
        .metric-unit { font-size: 10px; color: var(--tp-text-muted, #6B7B95); margin-top: 1px; }
      `}</style>
    </div>
  );
}
