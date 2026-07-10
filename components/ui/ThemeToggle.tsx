"use client";

import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      setDark(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      onClick={toggle}
      style={{
        width: 34, height: 34, borderRadius: 8,
        border: "1px solid var(--color-border)",
        background: "var(--color-bg-glass)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        color: "var(--color-text-secondary)", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "fixed", top: 44, left: 16, zIndex: 100,
      }}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun size={15} strokeWidth={1.5} /> : <Moon size={15} strokeWidth={1.5} />}
    </button>
  );
}
