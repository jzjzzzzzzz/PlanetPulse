"use client";

import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap, Circle, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { EventCategory, EventObservation } from "@/types/environment";
import { CATEGORY_COLORS_HEX } from "@/types/environment";
import { getEventColor } from "@/lib/globe/event-visuals";

// Fix Leaflet default icon
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Props = {
  lat: number;
  lng: number;
  category: EventCategory;
  observations?: EventObservation[];
};

function FitBounds({ lat, lng, observations }: { lat: number; lng: number; observations?: EventObservation[] }) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds([[lat, lng]]);
    if (observations) {
      for (const obs of observations) {
        if (obs.latitude != null && obs.longitude != null) {
          bounds.extend([obs.latitude, obs.longitude]);
        }
      }
    }
    // Pad a bit
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 7 });
    } else {
      map.setView([lat, lng], 5);
    }
  }, [lat, lng, observations, map]);

  return null;
}

export default function EventMiniMap({ lat, lng, category, observations }: Props) {
  const color = CATEGORY_COLORS_HEX[category] ?? "#8D9AAF";

  // Build observation path
  const validObs = (observations ?? []).filter(
    (o) => o.latitude != null && o.longitude != null && !Number.isNaN(o.latitude) && !Number.isNaN(o.longitude),
  );

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <MapContainer
        center={[lat, lng]}
        zoom={5}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />
        <FitBounds lat={lat} lng={lng} observations={validObs} />

        {/* Heat circle at center */}
        <Circle
          center={[lat, lng]}
          radius={30000}
          pathOptions={{
            color,
            fillColor: color,
            fillOpacity: 0.15,
            weight: 2,
          }}
        />

        {/* Observation dots */}
        {validObs.map((obs, i) => (
          <Circle
            key={i}
            center={[obs.latitude, obs.longitude]}
            radius={5000}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: i === validObs.length - 1 ? 0.6 : 0.2,
              weight: i === validObs.length - 1 ? 2 : 1,
            }}
          />
        ))}

        {/* Center marker */}
        <Marker position={[lat, lng]}>
          <Popup>
            <div style={{ fontSize: 12, color: "#05070D" }}>
              Event center: {lat.toFixed(2)}°N, {lng.toFixed(2)}°E
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
