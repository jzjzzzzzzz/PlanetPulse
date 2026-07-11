"use client";

import React, { useState, useEffect } from "react";
import type { TyphoonData } from "@/lib/typhoon/types";
import { knotsToMs } from "@/lib/typhoon/types";
import { Brain, Wind, Gauge } from "lucide-react";

type PredictionPoint = {
  lat: number; lng: number; time: string;
  jmaWindMs: number; jmaPressure: number;
  ecmwfWindMs: number | null; ecmwfPressure: number | null;
};

type Props = { data: TyphoonData | null };

export default function PredictionPanel({ data }: Props) {
  const [predictions, setPredictions] = useState<PredictionPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.forecast?.length) return;
    setLoading(true);
    setError(null);

    // Build query from JMA forecast points
    const points = [
      `${data.current.lat.toFixed(2)},${data.current.lng.toFixed(2)},${data.current.validTime},${knotsToMs(data.current.windSpeed)},${data.current.pressure}`,
      ...data.forecast.map((f) =>
        `${f.lat.toFixed(2)},${f.lng.toFixed(2)},${f.validTime},${knotsToMs(f.windSpeed)},${f.pressure}`
      ),
    ].join("|");

    fetch(`/api/typhoon/prediction?points=${encodeURIComponent(points)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.predictions) setPredictions(d.predictions);
        else setError(d.error ?? "Failed");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [data]);

  if (!data) return null;
  if (loading) return <div style={{ fontSize: 11, color: "#6B7B95", padding: 8 }}>Loading ECMWF predictions...</div>;
  if (error) return <div style={{ fontSize: 11, color: "#E53E3E", padding: 8 }}>Prediction unavailable: {error}</div>;
  if (!predictions?.length) return null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Brain size={14} style={{ color: "#9B7BFF" }} />
        <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--tp-text-secondary, #8D9AAF)" }}>
          ECMWF vs JMA
        </span>
        <span style={{ fontSize: 9, color: "#6B7B95", marginLeft: "auto" }}>powered by Open-Meteo</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {predictions.map((p, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
            borderRadius: 6, background: "var(--tp-card-bg, rgba(255,255,255,0.02))",
            fontSize: 10,
          }}>
            {/* Time label */}
            <span style={{ color: "#6B7B95", width: 50, flexShrink: 0 }}>
              {i === 0 ? "Now" : `+${(i as number) * 3}h`}
            </span>

            {/* Wind comparison */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Wind size={10} style={{ color: "#F5D547", flexShrink: 0 }} />
                <span style={{ color: "#F5D547", width: 28, fontFamily: "var(--font-jetbrains-mono), monospace" }}>{p.jmaWindMs}</span>
                <span style={{ color: "#6B7B95" }}>JMA</span>
                {p.ecmwfWindMs != null && (
                  <>
                    <span style={{ color: "#9B7BFF", width: 28, fontFamily: "var(--font-jetbrains-mono), monospace" }}>{p.ecmwfWindMs}</span>
                    <span style={{ color: "#9B7BFF" }}>EC</span>
                    <span style={{
                      fontSize: 8, padding: "1px 4px", borderRadius: 3,
                      background: Math.abs(p.ecmwfWindMs - p.jmaWindMs) <= 5 ? "rgba(59,213,255,0.15)" : "rgba(240,140,62,0.15)",
                      color: Math.abs(p.ecmwfWindMs - p.jmaWindMs) <= 5 ? "#3BD5FF" : "#F08C3E",
                    }}>
                      {p.ecmwfWindMs > p.jmaWindMs ? "+" : ""}{p.ecmwfWindMs - p.jmaWindMs}
                    </span>
                  </>
                )}
              </div>

              {/* Pressure comparison */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Gauge size={10} style={{ color: "#3BD5FF", flexShrink: 0 }} />
                <span style={{ color: "#3BD5FF", width: 28, fontFamily: "var(--font-jetbrains-mono), monospace" }}>{p.jmaPressure}</span>
                <span style={{ color: "#6B7B95" }}>JMA</span>
                {p.ecmwfPressure != null && (
                  <>
                    <span style={{ color: "#9B7BFF", width: 28, fontFamily: "var(--font-jetbrains-mono), monospace" }}>{p.ecmwfPressure}</span>
                    <span style={{ color: "#9B7BFF" }}>EC</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
