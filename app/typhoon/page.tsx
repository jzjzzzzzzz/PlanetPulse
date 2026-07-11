"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { TyphoonData, TyphoonApiResponse } from "@/lib/typhoon/types";
import { CATEGORY_INFO, knotsToKmh } from "@/lib/typhoon/types";
import StatusCard from "@/components/typhoon/StatusCard";
import TrendTimeline from "@/components/typhoon/TrendTimeline";
import OfficialInfo from "@/components/typhoon/OfficialInfo";
import { AlertTriangle, RefreshCw, Clock } from "lucide-react";

const TyphoonMap = dynamic(() => import("@/components/typhoon/TyphoonMap"), {
  ssr: false,
});

const REFRESH_INTERVAL = 30 * 60; // 30 minutes

export default function TyphoonPage() {
  const [data, setData] = useState<TyphoonData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshIn, setRefreshIn] = useState(REFRESH_INTERVAL);
  const [selectedPoint, setSelectedPoint] = useState<{
    lat: number;
    lng: number;
    time: string;
    pressure: number | null;
    windSpeed: number | null;
    isForecast: boolean;
    hoursAhead: number;
  } | null>(null);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setLoading(true);
    try {
      const res = await fetch("/api/typhoon");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: TyphoonApiResponse = await res.json();
      if (json.data) {
        setData(json.data);
        setError(json.error);
        setStale(json.stale);
      } else {
        setError(json.error ?? "未知错误");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      if (isManual) setRefreshIn(REFRESH_INTERVAL);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto refresh countdown
  useEffect(() => {
    const countdown = setInterval(() => {
      setRefreshIn((prev) => {
        if (prev <= 1) {
          fetchData();
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdown);
  }, [fetchData]);

  const refreshCountdown = useMemo(() => {
    const min = Math.floor(refreshIn / 60);
    const sec = refreshIn % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }, [refreshIn]);

  const handlePointSelect = useCallback(
    (pt: {
      lat: number;
      lng: number;
      time: string;
      pressure: number | null;
      windSpeed: number | null;
      isForecast: boolean;
      hoursAhead: number;
    }) => {
      setSelectedPoint(pt);
    },
    [],
  );

  if (loading && !data) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "linear-gradient(180deg, #0a0e1a 0%, #0d1525 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: "3px solid rgba(59, 213, 255, 0.2)",
            borderTopColor: "#3BD5FF",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ color: "#8D9AAF", fontSize: 14 }}>正在获取台风数据...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const storm = data?.storm;
  const current = data?.current;
  const catInfo = current ? CATEGORY_INFO[current.category] : null;
  const windKmh = current ? knotsToKmh(current.windSpeed) : null;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(180deg, #0a0e1a 0%, #0d1525 50%, #0f1a2e 100%)",
        color: "#e0e6f0",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ============ HEADER ============ */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(10, 14, 26, 0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(59, 213, 255, 0.15)",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={18} style={{ color: catInfo?.color ?? "#E53E3E" }} />
            <span style={{ fontSize: 11, letterSpacing: "0.1em", color: "#8D9AAF" }}>
              TYPHOON MONITOR
            </span>
          </div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "0.02em",
              margin: 0,
            }}
          >
            台风 {storm?.nameJp ?? "巴威"} / {storm?.nameEn ?? "BAVI"}
            <span
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: catInfo?.color ?? "#F5D547",
                marginLeft: 8,
                padding: "2px 8px",
                background: `${catInfo?.color ?? "#F5D547"}18`,
                borderRadius: 4,
                border: `1px solid ${catInfo?.color ?? "#F5D547"}40`,
              }}
            >
              {catInfo?.labelJp ?? "台風"}
            </span>
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
          {/* Stale warning */}
          {stale && (
            <span
              style={{
                color: "#F08C3E",
                background: "rgba(240, 140, 62, 0.1)",
                padding: "3px 8px",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <AlertTriangle size={12} />
              数据可能已过期
            </span>
          )}

          {/* Error */}
          {error && (
            <span
              style={{
                color: "#E53E3E",
                background: "rgba(229, 62, 62, 0.08)",
                padding: "3px 8px",
                borderRadius: 4,
                maxWidth: 200,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={error}
            >
              {error.length > 30 ? error.slice(0, 30) + "..." : error}
            </span>
          )}

          {/* Issue time */}
          <span style={{ color: "#6B7B95" }}>
            <Clock size={11} style={{ display: "inline", marginRight: 3 }} />
            {storm?.issueTime
              ? new Date(storm.issueTime).toLocaleString("zh-CN", {
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "---"}
          </span>

          {/* Refresh */}
          <button
            onClick={() => fetchData(true)}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid rgba(59, 213, 255, 0.3)",
              background: "rgba(59, 213, 255, 0.08)",
              color: "#3BD5FF",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              opacity: loading ? 0.5 : 1,
            }}
            aria-label="手动刷新"
          >
            <RefreshCw
              size={12}
              style={{
                animation: loading ? "spin 1s linear infinite" : undefined,
              }}
            />
            {refreshCountdown}
          </button>
        </div>
      </header>

      {/* ============ MAIN CONTENT ============ */}
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "calc(100dvh - 60px)",
        }}
      >
        {/* ============ MAP SECTION ============ */}
        <div style={{ flex: 1, position: "relative", minHeight: 350 }}>
          <TyphoonMap
            data={data}
            selectedPoint={selectedPoint}
            onPointSelect={handlePointSelect}
          />

          {/* Data source attribution (overlay on map) */}
          <div
            style={{
              position: "absolute",
              bottom: 4,
              right: 4,
              zIndex: 1000,
              fontSize: 9,
              color: "rgba(255,255,255,0.5)",
              background: "rgba(0,0,0,0.6)",
              padding: "2px 6px",
              borderRadius: 3,
              pointerEvents: "none",
            }}
          >
            © JMA | © OpenStreetMap | CartoDB dark_all
          </div>
        </div>

        {/* ============ PANELS SECTION ============ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            padding: "12px 16px",
            maxWidth: 1200,
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",
          }}
          className="typhoon-panels"
        >
          {/* Status Card */}
          <div className="panel-card" style={{ gridColumn: "1 / -1" }}>
            <StatusCard data={data} selectedPoint={selectedPoint} />
          </div>

          {/* Trend Timeline */}
          <div className="panel-card">
            <TrendTimeline
              data={data}
              onPointSelect={handlePointSelect}
              selectedPoint={selectedPoint}
            />
          </div>

          {/* Official Info */}
          <div className="panel-card">
            <OfficialInfo />
          </div>
        </div>
      </main>

      {/* ============ FOOTER / DISCLAIMER ============ */}
      <footer
        style={{
          textAlign: "center",
          padding: "12px 16px",
          fontSize: 10,
          color: "#6B7B95",
          borderTop: "1px solid rgba(59, 213, 255, 0.08)",
          background: "rgba(10, 14, 26, 0.8)",
        }}
      >
        <p style={{ margin: 0, lineHeight: 1.8 }}>
          数据来源：日本气象厅 (JMA) | 台风信息仅供信息参考，请以当地主管部门正式预警为准
        </p>
        <p style={{ margin: "4px 0 0", opacity: 0.6 }}>
          Copyright © 2026 John Zhou |{" "}
          <a
            href="/"
            style={{ color: "#3BD5FF", textDecoration: "none" }}
          >
            Planet Pulse
          </a>
        </p>
      </footer>

      {/* ============ GLOBAL STYLES ============ */}
      <style>{`
        .panel-card {
          background: rgba(15, 25, 45, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(59, 213, 255, 0.12);
          border-radius: 12px;
          padding: 14px;
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .typhoon-panels {
            grid-template-columns: 1fr !important;
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
