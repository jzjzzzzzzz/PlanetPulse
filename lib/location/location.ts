// ============================================================
// Planet Pulse — Location helpers (Vercel IP geolocation)
// ============================================================

import type { UserLocation } from "@/types/environment";

/**
 * Safely decode a URI-encoded component.
 * Returns the original string if decoding fails.
 */
function tryDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Reads Vercel IP geolocation headers from the incoming request and returns a
 * normalized UserLocation.
 *
 * Headers consumed (x-vercel-ip-*). The raw IP address header is intentionally
 * never read, stored, or logged.
 *
 * Returns source: "unavailable" when none of the expected headers are present.
 */
export function getLocationFromHeaders(
  headers: Headers
): UserLocation {
  const city = headers.get("x-vercel-ip-city");
  const country = headers.get("x-vercel-ip-country");
  const region = headers.get("x-vercel-ip-country-region");
  const latitudeRaw = headers.get("x-vercel-ip-latitude");
  const longitudeRaw = headers.get("x-vercel-ip-longitude");
  const timezone = headers.get("x-vercel-ip-timezone");

  // If every header is missing, the request did not come through Vercel's edge.
  const hasAnyHeader =
    city !== null ||
    country !== null ||
    region !== null ||
    latitudeRaw !== null ||
    longitudeRaw !== null ||
    timezone !== null;

  if (!hasAnyHeader) {
    return {
      city: null,
      country: null,
      region: null,
      latitude: null,
      longitude: null,
      timezone: null,
      source: "unavailable",
    };
  }

  const latitude = latitudeRaw !== null ? Number(latitudeRaw) : null;
  const longitude = longitudeRaw !== null ? Number(longitudeRaw) : null;

  return {
    city: city !== null ? tryDecodeURIComponent(city) : null,
    country: country !== null ? tryDecodeURIComponent(country) : null,
    region: region !== null ? tryDecodeURIComponent(region) : null,
    latitude:
      latitude !== null && !Number.isNaN(latitude) ? latitude : null,
    longitude:
      longitude !== null && !Number.isNaN(longitude) ? longitude : null,
    timezone: timezone !== null ? tryDecodeURIComponent(timezone) : null,
    source: "vercel",
  };
}

/**
 * Resolves a timezone string.
 *
 * When called with an explicit timezone (e.g. from Vercel headers) it returns
 * that value directly. Otherwise it attempts Intl.DateTimeFormat().resolvedOptions()
 * as a fallback, which on most modern runtimes will return the host system
 * timezone. Returns null when no timezone can be determined.
 */
export function getBrowserTimezone(timezone?: string): string | null {
  if (timezone) {
    return timezone;
  }

  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    return resolved.timeZone ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns a human-readable location string from a UserLocation.
 *
 * Examples:
 * - "San Francisco, California, US"
 * - "London, GB"
 * - "Unknown location"
 */
export function formatLocation(location: UserLocation): string {
  const parts: string[] = [];

  if (location.city) {
    parts.push(location.city);
  }

  if (location.region) {
    parts.push(location.region);
  }

  if (location.country) {
    parts.push(location.country);
  }

  if (parts.length === 0) {
    return "Unknown location";
  }

  return parts.join(", ");
}
