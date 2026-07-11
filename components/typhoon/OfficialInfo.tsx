"use client";

import React from "react";
import { Shield, ExternalLink, AlertTriangle, Newspaper } from "lucide-react";

const OFFICIAL_BULLETINS = [
  { title: "National Flood Control HQ — Typhoon Defense Deployment", url: "https://www.mem.gov.cn/", source: "Ministry of Emergency Management" },
];

const OFFICIAL_SOURCES = [
  { name: "China MEM", url: "https://www.mem.gov.cn/", desc: "Ministry of Emergency Management" },
  { name: "National Early Warning Center", url: "https://www.12379.cn/", desc: "Official warning platform" },
  { name: "CMA Typhoon Network", url: "http://typhoon.nmc.cn/", desc: "China Meteorological Administration" },
  { name: "JMA Typhoon Info", url: "https://www.jma.go.jp/bosai/typhoon/", desc: "Japan Meteorological Agency — data source" },
];

const SAFETY_TIPS = [
  "Follow official warnings from local emergency management authorities",
  "Secure outdoor objects and close windows before the typhoon arrives",
  "Avoid coastal areas, riverbanks, and other dangerous zones",
  "Prepare emergency supplies: water, food, flashlight, medicine",
  "Keep communication channels open and monitor official channels",
];

export default function OfficialInfo() {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <Shield size={14} style={{ color: "#3BD5FF" }} />
        <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--tp-text-secondary, #8D9AAF)" }}>
          Official Info &amp; Safety Tips
        </span>
      </div>

      {/* Official bulletins */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#E53E3E", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <Newspaper size={10} /> Verified Official Bulletin
        </div>
        {OFFICIAL_BULLETINS.map((b, i) => (
          <a key={i} href={b.url} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 6, background: "rgba(229, 62, 62, 0.06)", border: "1px solid rgba(229, 62, 62, 0.15)", textDecoration: "none", color: "#e0e6f0", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#E53E3E" }}>{b.title}</div>
              <div style={{ fontSize: 10, color: "#6B7B95", marginTop: 1 }}>{b.source}</div>
            </div>
            <ExternalLink size={12} style={{ color: "#E53E3E", flexShrink: 0 }} />
          </a>
        ))}
      </div>

      {/* Official sources */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "#6B7B95", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Official Warning Portals
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {OFFICIAL_SOURCES.map((src) => (
            <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 6, background: "rgba(59, 213, 255, 0.04)", border: "1px solid rgba(59, 213, 255, 0.1)", textDecoration: "none", color: "#e0e6f0" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{src.name}</div>
                <div style={{ fontSize: 10, color: "#6B7B95", marginTop: 1 }}>{src.desc}</div>
              </div>
              <ExternalLink size={12} style={{ color: "#6B7B95", flexShrink: 0 }} />
            </a>
          ))}
        </div>
      </div>

      {/* Safety tips */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#F08C3E", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <AlertTriangle size={10} /> Safety Tips
        </div>
        <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 11, color: "#8D9AAF", lineHeight: 1.8 }}>
          {SAFETY_TIPS.map((tip, i) => <li key={i}>{tip}</li>)}
        </ul>
      </div>

      <div style={{ marginTop: 14, padding: "8px 10px", borderRadius: 6, background: "rgba(240, 140, 62, 0.06)", border: "1px solid rgba(240, 140, 62, 0.12)", fontSize: 10, color: "#F08C3E", lineHeight: 1.6 }}>
        <strong>Disclaimer:</strong> Typhoon information on this page is for informational reference only. It does not constitute any form of official warning or evacuation guidance. Please refer to official warnings issued by local authorities.
      </div>
    </div>
  );
}
