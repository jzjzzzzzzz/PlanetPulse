import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventClientPage from "./EventClientPage";

type Props = { params: Promise<{ id: string }> };

// ============================================================
// Generate metadata for each event page
// ============================================================
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://planet-pulse-eta.vercel.app";
    const res = await fetch(`${base}/api/event/${id}`, { next: { revalidate: 600 } });
    if (!res.ok) {
      return { title: "Event Not Found — Planet Pulse" };
    }
    const { event } = await res.json();
    return {
      title: `${event.title} — Planet Pulse`,
      description: `${event.category} event. Hotspot score: ${event.hotspotScore}/100. ${event.observations?.length ?? 0} observations.`,
      openGraph: {
        title: `${event.title} — Planet Pulse`,
        description: `Track this ${event.category} event on Planet Pulse. Score: ${event.hotspotScore}/100.`,
      },
    };
  } catch {
    return { title: "Event — Planet Pulse" };
  }
}

// ============================================================
// Server component — fetches initial data
// ============================================================
export default async function EventPage({ params }: Props) {
  const { id } = await params;

  return <EventClientPage eventId={id} />;
}
