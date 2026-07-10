import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/satellite?lat=34&lng=-118
 *
 * Returns satellite imagery from ESRI World Imagery (free, no key).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "0");
  const lng = parseFloat(searchParams.get("lng") ?? "0");

  const span = 3;
  const bbox = [
    lng - span, lat - span,
    lng + span, lat + span,
  ].join(",");

  const esriUrl =
    "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export" +
    `?bbox=${bbox.replace(/,/g, "%2C")}` +
    "&bboxSR=4326" +
    "&imageSR=4326" +
    "&size=512%2C512" +
    "&format=png" +
    "&transparent=false" +
    "&f=image";

  try {
    const res = await fetch(esriUrl, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
  } catch { /* fall through */ }

  return NextResponse.json({ error: "unavailable" }, { status: 502 });
}
