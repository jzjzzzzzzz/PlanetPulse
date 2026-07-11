import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Planet Pulse — See what Earth is signaling now",
  description: "Transform scattered environmental data into a clear global overview and a personalized local environmental signal. Powered by NASA EONET.",
  keywords: ["environmental monitoring", "Earth observation", "NASA EONET", "wildfire tracking", "natural events", "3D globe"],
  openGraph: { title: "Planet Pulse — See what Earth is signaling now", description: "A global environmental situation-awareness website combining cinematic 3D Earth with real NASA data." },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark h-full antialiased`}>
      <body className="h-full overflow-hidden">
        <Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#05070D" }} />}>
          <ClientLayout>{children}</ClientLayout>
        </Suspense>
      </body>
    </html>
  );
}
