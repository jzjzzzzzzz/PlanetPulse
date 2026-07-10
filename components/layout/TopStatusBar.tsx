"use client";
import React from "react";
import { RefreshCw, Info } from "lucide-react";

type TopStatusBarProps = {
  localTime: string;
  dataStatus: "live" | "cached" | "stale" | "offline";
  isFallbackData: boolean;
  eventsCount: number;
  lastUpdated: string | null;
  onRefresh: () => void;
  onOpenInfo: () => void;
};

export default function TopStatusBar({
  localTime,
  dataStatus,
  isFallbackData,
  onRefresh,
  onOpenInfo,
}: TopStatusBarProps) {
  const isLive = dataStatus === "live";

  return (
    <header
      className="fixed top-0 left-0 right-0 z-20 px-4 flex items-center justify-between select-none"
      style={{
        height: "44px",
        backgroundColor: "var(--color-bg-panel)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid var(--color-border)`,
      }}
    >
      {/* Left: Logo */}
      <div className="flex-shrink-0 mr-4">
        <span
          className="text-xs font-semibold tracking-[0.2em] uppercase whitespace-nowrap"
          style={{ color: "var(--color-text-primary)", letterSpacing: "0.2em" }}
        >
          PLANET PULSE
        </span>
      </div>

      {/* Center: Live indicator — hidden on mobile */}
      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
        <span
          className="relative flex h-2 w-2"
          aria-label={isLive ? "Live data" : `Data status: ${dataStatus}`}
        >
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: "var(--color-success)" }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: "var(--color-success)" }}
          />
        </span>
        <span
          className="text-[11px] tracking-[0.15em] uppercase whitespace-nowrap font-medium"
          style={{ color: "var(--color-success)" }}
        >
          LIVE EARTH SIGNAL
        </span>
      </div>

      {/* Right: local time + actions */}
      <div className="flex items-center gap-3 flex-shrink-0 ml-auto sm:ml-0">
        {/* Fallback badge */}
        {isFallbackData && (
          <span
            className="text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full font-medium hidden sm:inline-block"
            style={{
              backgroundColor: `${"var(--color-warning)"}20`,
              color: "var(--color-warning)",
              border: `1px solid var(--color-warning)`,
            }}
          >
            Offline sample data
          </span>
        )}

        {/* Local time */}
        <span
          className="text-xs whitespace-nowrap hidden sm:inline-block"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--color-text-secondary)",
            fontSize: "12px",
          }}
        >
          {localTime}
        </span>

        {/* Mobile fallback badge */}
        {isFallbackData && (
          <span
            className="text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded-full font-medium sm:hidden"
            style={{
              backgroundColor: `${"var(--color-warning)"}20`,
              color: "var(--color-warning)",
              border: `1px solid var(--color-warning)`,
            }}
          >
            Offline
          </span>
        )}

        {/* Mobile time */}
        <span
          className="text-xs whitespace-nowrap sm:hidden"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--color-text-secondary)",
            fontSize: "11px",
          }}
        >
          {localTime}
        </span>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-md transition-colors duration-200 hover:brightness-125"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Refresh data"
          title="Refresh data"
        >
          <RefreshCw size={15} strokeWidth={1.5} />
        </button>

        {/* Info button */}
        <button
          onClick={onOpenInfo}
          className="p-1.5 rounded-md transition-colors duration-200 hover:brightness-125"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Information"
          title="About Planet Pulse"
        >
          <Info size={15} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
