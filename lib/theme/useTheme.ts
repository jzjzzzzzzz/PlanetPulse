"use client";

import { useState, useEffect } from "react";

// ============================================================
// Shared theme hook for sub-pages (typhoon, event, etc.)
// Detects dark/light from <html> class and localStorage.
// Matches ThemeToggle behavior on the main page.
// ============================================================

export type ThemeColors = {
  bg: string;
  bgPanel: string;
  bgGlass: string;
  border: string;
  borderAccent: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  headerBg: string;
  footerBg: string;
  cardBg: string;
  inputBg: string;
};

const DARK: ThemeColors = {
  bg: "linear-gradient(180deg, #0a0e1a 0%, #0d1525 50%, #0f1a2e 100%)",
  bgPanel: "rgba(15, 25, 45, 0.7)",
  bgGlass: "rgba(15, 25, 45, 0.55)",
  border: "rgba(59, 213, 255, 0.12)",
  borderAccent: "rgba(59, 213, 255, 0.25)",
  text: "#e0e6f0",
  textSecondary: "#8D9AAF",
  textMuted: "#6B7B95",
  accent: "#3BD5FF",
  headerBg: "rgba(10, 14, 26, 0.9)",
  footerBg: "rgba(10, 14, 26, 0.8)",
  cardBg: "rgba(255,255,255,0.03)",
  inputBg: "rgba(255,255,255,0.04)",
};

const LIGHT: ThemeColors = {
  bg: "linear-gradient(180deg, #e8ecf1 0%, #f0f4f8 50%, #e2e8f0 100%)",
  bgPanel: "rgba(255, 255, 255, 0.75)",
  bgGlass: "rgba(255, 255, 255, 0.6)",
  border: "rgba(100, 116, 139, 0.2)",
  borderAccent: "rgba(37, 99, 235, 0.3)",
  text: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#64748b",
  accent: "#2563EB",
  headerBg: "rgba(255, 255, 255, 0.85)",
  footerBg: "rgba(248, 250, 252, 0.9)",
  cardBg: "rgba(0,0,0,0.02)",
  inputBg: "rgba(0,0,0,0.03)",
};

export function useTheme(): { dark: boolean; colors: ThemeColors } {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    // Read initial state
    const isDark = document.documentElement.classList.contains("dark");
    const saved = localStorage.getItem("theme");
    if (saved === "light") setDark(false);
    else if (saved === "dark") setDark(true);
    else setDark(isDark);

    // Watch for class changes (ThemeToggle modifies html class)
    const observer = new MutationObserver(() => {
      const nowDark = document.documentElement.classList.contains("dark");
      setDark(nowDark);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return { dark, colors: dark ? DARK : LIGHT };
}
