// ============================================================
// Planet Pulse — Date formatting helpers
// (zero external dependencies — native Date + Intl only)
// ============================================================

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Parses an ISO string into a Date, returning null when invalid. */
function tryParseDate(isoString: string): Date | null {
  if (!isoString) {
    return null;
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

// ---------------------------------------------------------------------------
// formatRelativeTime
// ---------------------------------------------------------------------------

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

const RELATIVE_FORMAT = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
  style: "long",
});

/**
 * Returns a human-friendly relative time string such as "2 hours ago",
 * "3 days ago", or "Just now".
 *
 * Uses Intl.RelativeTimeFormat for locale-safe output. Accepts an optional
 * `now` Date to use as the reference point (defaults to current time).
 */
export function formatRelativeTime(
  isoString: string,
  now?: Date
): string {
  const date = tryParseDate(isoString);
  if (date === null) {
    return "Unknown";
  }

  const reference = now ?? new Date();
  const diffMs = date.getTime() - reference.getTime();

  // Handle future timestamps.
  if (diffMs > 0) {
    const diffSec = Math.round(diffMs / 1000);
    if (diffSec < 60) {
      return "Just now";
    }
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) {
      return RELATIVE_FORMAT.format(diffMin, "minute");
    }
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) {
      return RELATIVE_FORMAT.format(diffHr, "hour");
    }
    const diffDay = Math.round(diffHr / 24);
    if (diffDay < 30) {
      return RELATIVE_FORMAT.format(diffDay, "day");
    }
    const diffMonth = Math.round(diffDay / 30);
    if (diffMonth < 12) {
      return RELATIVE_FORMAT.format(diffMonth, "month");
    }
    return RELATIVE_FORMAT.format(Math.round(diffMonth / 12), "year");
  }

  const diffMsAbs = Math.abs(diffMs);

  // < 60 seconds
  if (diffMsAbs < MINUTE_MS) {
    return "Just now";
  }

  // < 60 minutes
  if (diffMsAbs < HOUR_MS) {
    const minutes = Math.round(diffMsAbs / MINUTE_MS);
    return RELATIVE_FORMAT.format(-minutes, "minute");
  }

  // < 24 hours
  if (diffMsAbs < DAY_MS) {
    const hours = Math.round(diffMsAbs / HOUR_MS);
    return RELATIVE_FORMAT.format(-hours, "hour");
  }

  // < 30 days
  if (diffMsAbs < 30 * DAY_MS) {
    const days = Math.round(diffMsAbs / DAY_MS);
    return RELATIVE_FORMAT.format(-days, "day");
  }

  // < 365 days
  if (diffMsAbs < 365 * DAY_MS) {
    const months = Math.round(diffMsAbs / (30 * DAY_MS));
    return RELATIVE_FORMAT.format(-months, "month");
  }

  // >= 365 days
  const years = Math.round(diffMsAbs / (365 * DAY_MS));
  return RELATIVE_FORMAT.format(-years, "year");
}

// ---------------------------------------------------------------------------
// formatTimestamp
// ---------------------------------------------------------------------------

/**
 * Formats an ISO timestamp to a human-friendly string.
 *
 * With a timezone:  "Jul 10, 2026 · 14:30 PST"
 * Without timezone: "Jul 10, 2026 · 14:30 UTC"
 *
 * Uses native Intl APIs for locale-safe formatting.
 */
export function formatTimestamp(
  isoString: string,
  timezone?: string
): string {
  const date = tryParseDate(isoString);
  if (date === null) {
    return "Unknown";
  }

  const datePartOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  const timePartOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };

  if (timezone) {
    datePartOptions.timeZone = timezone;
    timePartOptions.timeZone = timezone;
    timePartOptions.timeZoneName = "short";
  } else {
    datePartOptions.timeZone = "UTC";
    timePartOptions.timeZone = "UTC";
    timePartOptions.timeZoneName = "short";
  }

  const datePart = new Intl.DateTimeFormat("en", datePartOptions).format(date);
  const timePart = new Intl.DateTimeFormat("en", timePartOptions).format(date);

  return `${datePart} · ${timePart}`;
}

// ---------------------------------------------------------------------------
// formatLocalTime
// ---------------------------------------------------------------------------

/**
 * Returns the current time for a given timezone as a "14:30" style string.
 * Uses the device clock for "now".
 */
export function formatLocalTime(timezone: string): string {
  if (!timezone) {
    return "--:--";
  }

  try {
    const now = new Date();

    const formatter = new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    });

    return formatter.format(now);
  } catch {
    // Invalid timezone string produces a RangeError from Intl.
    return "--:--";
  }
}

// ---------------------------------------------------------------------------
// getHoursSince
// ---------------------------------------------------------------------------

/**
 * Returns the number of hours (fractional) since the given ISO timestamp.
 * Returns null when the input is invalid or unparseable.
 * Accepts an optional `now` Date as the reference point (defaults to current
 * time).
 */
export function getHoursSince(
  isoString: string,
  now?: Date
): number | null {
  const date = tryParseDate(isoString);
  if (date === null) {
    return null;
  }

  const reference = now ?? new Date();
  const diffMs = reference.getTime() - date.getTime();

  return diffMs / HOUR_MS;
}
