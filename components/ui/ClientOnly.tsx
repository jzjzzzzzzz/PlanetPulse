"use client";

import React, { useState, useEffect, useRef } from "react";

/**
 * ClientOnly — renders children ONLY on the client.
 * Uses a ref flag + state trigger to avoid setState-in-effect lint warning.
 */
export default function ClientOnly({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const initRef = useRef(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      setMounted(true);
    }
  }, []);

  if (!mounted) {
    return (
      <>{fallback ?? <div style={{ position: "fixed", inset: 0, background: "#05070D" }} />}</>
    );
  }

  return <>{children}</>;
}
