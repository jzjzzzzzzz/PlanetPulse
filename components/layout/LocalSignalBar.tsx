"use client";
import React from "react";
import type { EnvironmentalEvent, UserLocation } from "@/types/environment";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/types/environment";
import { MapPin, Clock, Crosshair, Loader2, Navigation } from "lucide-react";

type LocalSignalBarProps = {
  userLocation: UserLocation;
  localTime: string;
  nearestEvent: EnvironmentalEvent | null;
  distanceKm: number | null;
  personalRelevanceScore: number | null;
  onRequestGeolocation: () => void;
  geoLoading: boolean;
  geoDenied: boolean;
};

export default function LocalSignalBar({
  userLocation,
  localTime,
  nearestEvent,
  distanceKm,
  personalRelevanceScore,
  onRequestGeolocation,
  geoLoading,
  geoDenied,
}: LocalSignalBarProps) {
  const hasLocation = userLocation.city != null;
  const locationLabel = hasLocation
    ? [userLocation.city, userLocation.country].filter(Boolean).join(", ")
    : "Location unavailable";

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-20 px-3 py-2"
      style={{ margin: "0 8px 8px 8px" }}
    >
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 px-3 py-2.5 rounded-xl"
        style={{
          backgroundColor: "var(--color-bg-panel)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: `1px solid var(--color-border)`,
        }}
      >
        {/* Section label — visible on mobile as tag */}
        <span
          className="text-[10px] tracking-[0.15em] uppercase font-semibold sm:hidden"
          style={{ color: "var(--color-text-muted)" }}
        >
          YOUR SIGNAL
        </span>

        {/* Location */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <MapPin size={13} strokeWidth={1.5} style={{ color: "var(--color-location)" }} />
          <span
            className="text-xs whitespace-nowrap"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {locationLabel}
          </span>
        </div>

        {/* Divider visible on desktop */}
        <span
          className="hidden sm:block w-px h-4 flex-shrink-0"
          style={{ backgroundColor: "var(--color-border)" }}
        />

        {/* Local time */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Clock size={13} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />
          <span
            className="text-xs whitespace-nowrap tabular-nums"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--color-text-muted)",
            }}
          >
            {localTime}
          </span>
        </div>

        {/* Divider */}
        <span
          className="hidden sm:block w-px h-4 flex-shrink-0"
          style={{ backgroundColor: "var(--color-border)" }}
        />

        {/* Nearest event info */}
        {nearestEvent ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className="flex-shrink-0 rounded-full"
              style={{
                width: "7px",
                height: "7px",
                backgroundColor: CATEGORY_COLORS[nearestEvent.category],
              }}
            />
            <span
              className="text-xs truncate"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {CATEGORY_LABELS[nearestEvent.category]}
            </span>
            {distanceKm != null && (
              <>
                <span
                  className="hidden sm:block w-px h-3 flex-shrink-0"
                  style={{ backgroundColor: "var(--color-border)" }}
                />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Navigation
                    size={11}
                    strokeWidth={1.5}
                    style={{ color: "var(--color-text-muted)" }}
                  />
                  <span
                    className="text-[11px] tabular-nums whitespace-nowrap"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {distanceKm < 1
                      ? "<1 km"
                      : `${Math.round(distanceKm).toLocaleString()} km`}
                  </span>
                </div>
              </>
            )}
            {personalRelevanceScore != null && (
              <span
                className="text-[10px] tabular-nums font-medium whitespace-nowrap"
                style={{
                  fontFamily: "var(--font-mono)",
                  color:
                    personalRelevanceScore > 70
                      ? "var(--color-success)"
                      : personalRelevanceScore > 40
                        ? "var(--color-warning)"
                        : "var(--color-text-secondary)",
                }}
              >
                {Math.round(personalRelevanceScore)}% match
              </span>
            )}
          </div>
        ) : (
          <span
            className="hidden sm:inline-block text-xs flex-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            No nearby events detected in the current dataset
          </span>
        )}

        {/* No events — mobile */}
        {!nearestEvent && (
          <span
            className="sm:hidden text-[11px]"
            style={{ color: "var(--color-text-muted)" }}
          >
            No nearby events detected
          </span>
        )}

        {/* Geolocation button + status */}
        <div className="flex items-center gap-2 ml-auto sm:ml-0">
          {geoDenied && (
            <span
              className="text-[10px] whitespace-nowrap"
              style={{ color: "var(--color-text-muted)" }}
            >
              Location permission denied
            </span>
          )}
          <button
            onClick={onRequestGeolocation}
            disabled={geoLoading}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors duration-150 cursor-pointer disabled:opacity-60"
            style={{
              backgroundColor: "var(--color-bg-panel-hover)",
              color: "var(--color-location)",
              border: `1px solid var(--color-border)`,
            }}
            title="Use precise location"
          >
            {geoLoading ? (
              <Loader2
                size={11}
                strokeWidth={2}
                className="animate-spin"
                style={{ color: "var(--color-location)" }}
              />
            ) : (
              <Crosshair size={11} strokeWidth={1.5} />
            )}
            <span className="hidden sm:inline">Precise location</span>
            <span className="sm:hidden">GPS</span>
          </button>
        </div>
      </div>

      {/* Disclaimer + Copyright */}
      <div
        className="mt-1 flex flex-col sm:flex-row justify-between items-end sm:items-center gap-0.5"
        style={{ color: "var(--color-text-muted)", opacity: 0.55 }}
      >
        <p className="text-[9px] leading-tight">
          Planet Pulse uses satellite and public environmental data for awareness and
          exploration. It is not an official emergency alert service.
        </p>
        <p className="text-[9px] leading-tight whitespace-nowrap">
          Copyright © 2026 John Zhou. Licensed under Apache 2.0.
        </p>
      </div>
    </footer>
  );
}
