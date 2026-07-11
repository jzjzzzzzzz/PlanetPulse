"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Lang = "zh" | "en";

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "zh",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("zh");

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved === "en" || saved === "zh") setLang(saved);
  }, []);

  const switchLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem("lang", l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang: switchLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LangContext);
}

// Shared translations for common UI elements
export const T = {
  planetPulse: { zh: "PLANET PULSE", en: "PLANET PULSE" },
  live: { zh: "LIVE", en: "LIVE" },
  refresh: { zh: "刷新", en: "Refresh" },
  about: { zh: "关于", en: "About" },
  typhoon: { zh: "台风", en: "TYPHOON" },
  offlineSample: { zh: "离线样本数据", en: "Offline sample data" },
  offline: { zh: "离线", en: "Offline" },
  eventsCount: (n: number, lang: Lang) => lang === "zh" ? `${n} 个事件` : `${n} events`,
};
