import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache 1 hour

/**
 * GET /api/epic
 *
 * Returns the latest NASA EPIC (Earth Polychromatic Imaging Camera)
 * natural-color Earth image URL. EPIC provides daily full-disk
 * Earth images from the DSCOVR satellite at Lagrange point L1.
 *
 * Data comes from the NASA EPIC API (public, no key required).
 */
export async function GET() {
  try {
    // Fetch latest natural-color images from EPIC
    const res = await fetch(
      "https://epic.gsfc.nasa.gov/api/natural?limit=1",
      { signal: AbortSignal.timeout(10_000) },
    );

    if (!res.ok) {
      throw new Error(`EPIC API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No EPIC images available");
    }

    const latest = data[0];
    const { image, date, caption, centroid_coordinates } = latest;

    // Build the image URL: https://epic.gsfc.nasa.gov/archive/natural/YYYY/MM/DD/png/epic_1b_XXXX.png
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const imageUrl = `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/png/${image}.png`;
    const thumbnailUrl = `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/thumbs/${image}.jpg`;

    return NextResponse.json({
      source: "live",
      provider: "NASA EPIC",
      imageUrl,
      thumbnailUrl,
      date,
      caption,
      coordinates: centroid_coordinates
        ? { lat: centroid_coordinates.lat, lng: centroid_coordinates.lon }
        : null,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/epic]", (error as Error).message);
    return NextResponse.json(
      {
        source: "unavailable",
        provider: "NASA EPIC",
        message: "EPIC imagery temporarily unavailable",
        degradedReason: (error as Error).message,
      },
      { status: 200 }, // Still 200 — app handles gracefully
    );
  }
}
