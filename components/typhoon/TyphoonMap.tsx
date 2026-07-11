"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TyphoonData } from "@/lib/typhoon/types";
import { CATEGORY_COLORS_HEX } from "@/types/environment";

// Fix Leaflet default icon issue in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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
  onPointSelect: (pt: PointSelect) => void;
  lang?: "zh" | "en";
};

// Map controller: fit bounds, draw circles, handle auto-follow
function MapController({
  data,
  onPointSelect,
  lang = "zh",
}: {
  data: TyphoonData | null;
  onPointSelect: (pt: PointSelect) => void;
  lang?: "zh" | "en";
}) {
  const map = useMap();
  const circlesRef = useRef<L.Circle[]>([]);
  const markersRef = useRef<L.Marker[]>([]);
  const linesRef = useRef<L.Polyline[]>([]);

  useEffect(() => {
    if (!data) return;

    // Clear previous
    circlesRef.current.forEach((c) => c.remove());
    markersRef.current.forEach((m) => m.remove());
    linesRef.current.forEach((l) => l.remove());
    circlesRef.current = [];
    markersRef.current = [];
    linesRef.current = [];

    const bounds = L.latLngBounds([]);

    // --- Draw forecast path line ---
    const forecastPts: L.LatLng[] = [];
    forecastPts.push(L.latLng(data.current.lat, data.current.lng));
    for (const fp of data.forecast) {
      forecastPts.push(L.latLng(fp.lat, fp.lng));
    }

    const pathLine = L.polyline(forecastPts, {
      color: "#F5D547",
      weight: 2.5,
      opacity: 0.7,
      dashArray: "8 4",
      lineCap: "round",
    }).addTo(map);
    linesRef.current.push(pathLine);
    forecastPts.forEach((p) => bounds.extend(p));

    // --- Draw probability circles ---
    for (const fp of data.forecast) {
      if (fp.probRadius && fp.probRadius > 0) {
        const circle = L.circle([fp.lat, fp.lng], {
          radius: fp.probRadius * 1000, // km to m
          color: "#F5D547",
          weight: 1,
          opacity: 0.25,
          fillOpacity: 0.05,
          fillColor: "#F5D547",
          interactive: false,
        }).addTo(map);
        circlesRef.current.push(circle);
      }
    }

    // --- Draw gale warning radius (current) ---
    if (data.windRadii.galeRadius && data.windRadii.galeRadius > 0) {
      const galeCircle = L.circle([data.current.lat, data.current.lng], {
        radius: data.windRadii.galeRadius * 1000,
        color: "#F08C3E",
        weight: 1.5,
        opacity: 0.4,
        fillOpacity: 0.03,
        fillColor: "#F08C3E",
        interactive: false,
        dashArray: "4 4",
      }).addTo(map);
      circlesRef.current.push(galeCircle);
    }

    // --- Draw storm warning radius (current) ---
    if (data.windRadii.stormRadius && data.windRadii.stormRadius > 0) {
      const stormCircle = L.circle([data.current.lat, data.current.lng], {
        radius: data.windRadii.stormRadius * 1000,
        color: "#E53E3E",
        weight: 2,
        opacity: 0.5,
        fillOpacity: 0.06,
        fillColor: "#E53E3E",
        interactive: false,
      }).addTo(map);
      circlesRef.current.push(stormCircle);
    }

    // --- Draw current position marker ---
    const typhoonIcon = L.divIcon({
      className: "typhoon-marker",
      html: `<div style="
        width: 28px; height: 28px; 
        background: radial-gradient(circle, #E53E3E 0%, #991B1B 100%);
        border: 3px solid rgba(255,255,255,0.8);
        border-radius: 50%;
        box-shadow: 0 0 20px rgba(229,62,62,0.6), 0 0 40px rgba(229,62,62,0.3);
        animation: typhoon-pulse 2s ease-in-out infinite;
      "></div><style>
        @keyframes typhoon-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.8; }
        }
      </style>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const currentMarker = L.marker([data.current.lat, data.current.lng], {
      icon: typhoonIcon,
    })
      .bindTooltip(
        `<b>${data.storm.nameEn}</b><br/>
         Pressure: ${data.current.pressure} hPa<br/>
         Wind: ${data.current.windSpeed} kt<br/>
         ${new Date(data.current.validTime).toLocaleString("en-US")}`,
        { direction: "top", offset: [0, -20] },
      )
      .addTo(map);
    markersRef.current.push(currentMarker);
    bounds.extend([data.current.lat, data.current.lng]);

    // --- Draw forecast point markers ---
    for (const fp of data.forecast) {
      const icon = L.divIcon({
        className: "forecast-marker",
        html: `<div style="
          width: 10px; height: 10px;
          background: #F5D547;
          border: 2px solid rgba(255,255,255,0.6);
          border-radius: 50%;
          cursor: pointer;
        "></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });

      const marker = L.marker([fp.lat, fp.lng], { icon })
        .bindTooltip(
          `<b>+${fp.hoursAhead}h Forecast</b><br/>
           Pressure: ${fp.pressure} hPa<br/>
           Wind: ${fp.windSpeed} kt`,
          { direction: "top" },
        )
        .on("click", () => {
          onPointSelect({
            lat: fp.lat,
            lng: fp.lng,
            time: fp.validTime,
            pressure: fp.pressure,
            windSpeed: fp.windSpeed,
            isForecast: true,
            hoursAhead: fp.hoursAhead,
          });
        })
        .addTo(map);
      markersRef.current.push(marker);
    }

    // --- Draw historical track ---
    if (data.trackHistory?.typhoon && data.trackHistory.typhoon.length > 1) {
      const histPts = data.trackHistory.typhoon.map(([lat, lng]) =>
        L.latLng(lat, lng),
      );
      const histLine = L.polyline(histPts, {
        color: "#6B9BD2",
        weight: 1.5,
        opacity: 0.5,
        dashArray: "3 5",
      }).addTo(map);
      linesRef.current.push(histLine);
      histPts.forEach((p) => bounds.extend(p));
    }

    // Fit map to bounds
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
    }
  }, [data, map, onPointSelect]);

  return null;
}

export default function TyphoonMap({ data, selectedPoint, onPointSelect, lang = "zh" }: Props) {
  const defaultCenter: [number, number] = data
    ? [data.current.lat, data.current.lng]
    : [25, 130]; // Western Pacific default

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <MapContainer
        center={defaultCenter}
        zoom={5}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
      >
        {/* Dark tile layer — CartoDB dark_all, no API key needed */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />
        <MapController data={data} onPointSelect={onPointSelect} lang={lang} />
      </MapContainer>

      {/* Selected point info overlay */}
      {selectedPoint && (
        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: 8,
            zIndex: 1000,
            background: "rgba(10, 14, 26, 0.9)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(59, 213, 255, 0.2)",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 11,
            color: "#e0e6f0",
            minWidth: 180,
          }}
        >
          <div style={{ color: selectedPoint.isForecast ? "#F5D547" : "#E53E3E", fontWeight: 600, marginBottom: 4 }}>
            {selectedPoint.isForecast ? `+${selectedPoint.hoursAhead}h Forecast` : "Current Position"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 8px" }}>
            <span style={{ color: "#6B7B95" }}>Time</span>
            <span>{new Date(selectedPoint.time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            {selectedPoint.pressure != null && (<>
              <span style={{ color: "#6B7B95" }}>Pressure</span>
              <span>{selectedPoint.pressure} hPa</span>
            </>)}
            {selectedPoint.windSpeed != null && (<>
              <span style={{ color: "#6B7B95" }}>Wind</span>
              <span>{selectedPoint.windSpeed} kt ({Math.round(selectedPoint.windSpeed * 1.852)} km/h)</span>
            </>)}
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 1000,
          background: "rgba(10, 14, 26, 0.85)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(59, 213, 255, 0.12)",
          borderRadius: 6,
          padding: "6px 10px",
          fontSize: 10,
          color: "#8D9AAF",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#E53E3E" }} />
          Current
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#F5D547" }} />
          Forecast
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
          <div style={{ width: 14, height: 2, background: "#F5D547", opacity: 0.5 }} />
          Forecast path
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 14, height: 2, background: "#6B9BD2", opacity: 0.4 }} />
          Track history
        </div>
      </div>
    </div>
  );
}
