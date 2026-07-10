"use client";
import React from "react";
import { EventCategory, CATEGORY_LABELS, CATEGORY_COLORS } from "@/types/environment";
import { Layers, CheckCircle2, AlertCircle } from "lucide-react";

type LayerPanelProps = {
  selectedCategory: EventCategory | "all";
  onSelectCategory: (category: EventCategory | "all") => void;
  eventsCount: number;
  filteredCount: number;
  categoryCounts: Record<EventCategory, number>;
  hasFirmsKey: boolean;
};

const CATEGORY_ORDER: (EventCategory | "all")[] = [
  "all", "wildfire", "severe-storm", "volcano", "flood",
  "drought", "dust-haze", "landslide", "sea-lake-ice", "other",
];

export default function LayerPanel({
  selectedCategory, onSelectCategory, eventsCount, filteredCount, categoryCounts, hasFirmsKey,
}: LayerPanelProps) {
  return (
    <aside
      className="hidden sm:block fixed left-3 z-10 overflow-y-auto"
      style={{
        top: "56px", maxHeight: "calc(100dvh - 56px - 100px)", width: "220px",
        backgroundColor: "var(--color-bg-panel)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        border: "1px solid var(--color-border)", borderRadius: "12px", padding: "14px",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Layers size={13} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />
        <span className="text-[10px] tracking-[0.15em] uppercase font-semibold" style={{ color: "var(--color-text-muted)" }}>SIGNAL LAYERS</span>
      </div>

      <ul className="space-y-1">
        {CATEGORY_ORDER.map((cat) => {
          const isAll = cat === "all";
          const label = isAll ? "All Events" : CATEGORY_LABELS[cat];
          const color = isAll ? "var(--color-text-secondary)" : CATEGORY_COLORS[cat];
          const isSelected = selectedCategory === cat;
          // Per-category count: total for "all", specific count for categories
          const count = isAll ? eventsCount : (categoryCounts[cat] ?? 0);

          return (
            <li key={cat}>
              <button
                onClick={() => onSelectCategory(cat)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors duration-150 cursor-pointer"
                style={{
                  backgroundColor: isSelected ? "var(--color-bg-panel-hover)" : "transparent",
                  border: isSelected ? "1px solid var(--color-border-hover)" : "1px solid transparent",
                  color: isSelected ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                }}
              >
                <span className="flex-shrink-0 rounded-full" style={{ width: "7px", height: "7px", backgroundColor: color }} />
                <span className="text-xs flex-1 truncate">{label}</span>
                <span className="text-[10px] tabular-nums" style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}>{count}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
        <span className="text-[10px] tracking-[0.15em] uppercase font-semibold" style={{ color: "var(--color-text-muted)" }}>DATA SOURCES</span>
        <ul className="mt-2 space-y-1.5">
          <li className="flex items-center gap-1.5">
            <CheckCircle2 size={11} strokeWidth={1.5} style={{ color: "var(--color-success)" }} />
            <span className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>NASA EONET</span>
          </li>
          <li className="flex items-center gap-1.5">
            {hasFirmsKey ? (
              <CheckCircle2 size={11} strokeWidth={1.5} style={{ color: "var(--color-success)" }} />
            ) : (
              <AlertCircle size={11} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />
            )}
            <span className="text-[11px]" style={{ color: hasFirmsKey ? "var(--color-text-secondary)" : "var(--color-text-muted)" }}>
              {hasFirmsKey ? "NASA FIRMS" : "NASA FIRMS (not configured)"}
            </span>
          </li>
        </ul>
      </div>
    </aside>
  );
}
