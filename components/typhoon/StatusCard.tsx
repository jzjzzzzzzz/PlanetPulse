"use client";

import React from "react";
import type { TyphoonData } from "@/lib/typhoon/types";
import { CATEGORY_INFO, knotsToKmh, knotsToMs } from "@/lib/typhoon/types";
import { Wind, Gauge, Compass, MoveRight, Circle } from "lucide-react";

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
  selectedPoint: PointSelect | null;
};

function metricCard(
  icon: React.ReactNode,
  label: string,
  value: string,
  sub?: string,
  accent?: string,
) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "10px 8px",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div style={{ color: accent ?? "#3BD5FF", marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 10, color: "#6B7B95", marginBottom: 2 }}>{label}</div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          fontFamily: "var(--font-jetbrains-mono), monospace",
          color: "#e0e6f0",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: "#6B7B95", marginTop: 1 }}>{sub}</div>
      )}
    </div>
  );
}

export default function StatusCard({ data, selectedPoint }: Props) {
  if (!data) {
    return (
      <div style={{ textAlign: "center", color: "#6B7B95", padding: 16 }}>
        暂无数据
      </div>
    );
  }

  // Use selected point if available, otherwise use current analysis
  const display = selectedPoint
    ? {
        lat: selectedPoint.lat,
        lng: selectedPoint.lng,
        pressure: selectedPoint.pressure,
        windSpeed: selectedPoint.windSpeed,
        time: selectedPoint.time,
        isForecast: selectedPoint.isForecast,
        hoursAhead: selectedPoint.hoursAhead,
      }
    : {
        lat: data.current.lat,
        lng: data.current.lng,
        pressure: data.current.pressure,
        windSpeed: data.current.windSpeed,
        time: data.current.validTime,
        isForecast: false,
        hoursAhead: 0,
      };

  const catInfo = selectedPoint
    ? null
    : CATEGORY_INFO[data.current.category];
  const windKt = display.windSpeed ?? 0;
  const windKmh = knotsToKmh(windKt);
  const windMs = knotsToMs(windKt);

  return (
    <div>
      {/* Title row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              margin: 0,
              color: "#e0e6f0",
            }}
          >
            {display.isForecast
              ? `${display.hoursAhead}小时预报`
              : "实时状态"}
          </h2>
          {!selectedPoint && catInfo && (
            <span
              style={{
                fontSize: 11,
                color: catInfo.color,
                background: `${catInfo.color}18`,
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              {catInfo.labelJp} / {catInfo.label}
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: "#6B7B95" }}>
          {new Date(display.time).toLocaleString("zh-CN", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short",
          })}
        </span>
      </div>

      {/* Metric cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
          gap: 8,
        }}
      >
        {metricCard(
          <Gauge size={16} />,
          "中心气压",
          `${display.pressure ?? "---"}`,
          "hPa",
          "#3BD5FF",
        )}
        {metricCard(
          <Wind size={16} />,
          "最大风速",
          `${windKt}`,
          `kt | ${windKmh} km/h`,
          "#F5D547",
        )}
        {metricCard(
          <Wind size={16} />,
          "最大瞬间风速",
          `${windMs}`,
          "m/s",
          "#F08C3E",
        )}

        {/* Current-only metrics */}
        {!selectedPoint && data.current.direction != null && (
          <>
            {metricCard(
              <Compass size={16} />,
              "移动方向",
              `${data.current.direction}°`,
              data.current.direction < 90
                ? "东北"
                : data.current.direction < 180
                  ? "东南"
                  : data.current.direction < 270
                    ? "西南"
                    : "西北",
              "#6B9BD2",
            )}
            {metricCard(
              <MoveRight size={16} />,
              "移动速度",
              `${data.current.speed ?? "---"}`,
              "km/h",
              "#8D9AAF",
            )}
          </>
        )}

        {/* Wind radii */}
        {!selectedPoint && (
          <>
            {data.windRadii.stormRadius && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "10px 8px",
                  background: "rgba(229, 62, 62, 0.05)",
                  borderRadius: 8,
                  border: "1px solid rgba(229, 62, 62, 0.15)",
                }}
              >
                <Circle size={16} style={{ color: "#E53E3E", marginBottom: 4 }} />
                <span style={{ fontSize: 10, color: "#6B7B95", marginBottom: 2 }}>
                  暴风域半径
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    color: "#E53E3E",
                    lineHeight: 1.2,
                  }}
                >
                  {data.windRadii.stormRadius}
                </span>
                <span style={{ fontSize: 10, color: "#6B7B95", marginTop: 1 }}>
                  km
                </span>
              </div>
            )}
            {data.windRadii.galeRadius && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "10px 8px",
                  background: "rgba(240, 140, 62, 0.05)",
                  borderRadius: 8,
                  border: "1px solid rgba(240, 140, 62, 0.15)",
                }}
              >
                <Circle size={16} style={{ color: "#F08C3E", marginBottom: 4 }} />
                <span style={{ fontSize: 10, color: "#6B7B95", marginBottom: 2 }}>
                  强风域半径
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    color: "#F08C3E",
                    lineHeight: 1.2,
                  }}
                >
                  {data.windRadii.galeRadius}
                </span>
                <span style={{ fontSize: 10, color: "#6B7B95", marginTop: 1 }}>
                  km
                </span>
              </div>
            )}
          </>
        )}

        {/* Location */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "10px 8px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <span style={{ fontSize: 10, color: "#6B7B95", marginBottom: 4 }}>
            位置
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "var(--font-jetbrains-mono), monospace",
              color: "#e0e6f0",
            }}
          >
            {display.lat.toFixed(1)}°N
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "var(--font-jetbrains-mono), monospace",
              color: "#e0e6f0",
            }}
          >
            {display.lng.toFixed(1)}°E
          </span>
        </div>
      </div>
    </div>
  );
}
