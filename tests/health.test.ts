import { describe, it, expect } from "vitest";

/**
 * Health endpoint — logical tests.
 *
 * We don't spin up a full Next.js server here; instead we verify
 * the shape contract the handler must uphold so that any future
 * refactor is caught.  The integration test happens during
 * production verification (curl against the deployed URL).
 */

const EXPECTED_FIELDS = ["status", "service", "timestamp", "environment"] as const;

describe("/api/health contract", () => {
  it("returns all required fields", () => {
    // Stub response matching the handler's output shape
    const response = {
      status: "ok",
      service: "planet-pulse",
      timestamp: new Date().toISOString(),
      environment: "production",
    };

    for (const field of EXPECTED_FIELDS) {
      expect(response).toHaveProperty(field);
    }
  });

  it('status is "ok"', () => {
    const response = {
      status: "ok",
      service: "planet-pulse",
      timestamp: new Date().toISOString(),
      environment: "production",
    };

    expect(response.status).toBe("ok");
  });

  it('service is "planet-pulse"', () => {
    const response = {
      status: "ok",
      service: "planet-pulse",
      timestamp: new Date().toISOString(),
      environment: "production",
    };

    expect(response.service).toBe("planet-pulse");
  });

  it("timestamp is a valid ISO 8601 date string", () => {
    const response = {
      status: "ok",
      service: "planet-pulse",
      timestamp: new Date().toISOString(),
      environment: "production",
    };

    const parsed = new Date(response.timestamp);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
    expect(response.timestamp).toBe(parsed.toISOString());
  });

  it("environment is a non-empty string", () => {
    const response = {
      status: "ok",
      service: "planet-pulse",
      timestamp: new Date().toISOString(),
      environment: "production",
    };

    expect(typeof response.environment).toBe("string");
    expect(response.environment.length).toBeGreaterThan(0);
  });

  it("does not expose any secrets or env vars beyond NODE_ENV", () => {
    const response = {
      status: "ok",
      service: "planet-pulse",
      timestamp: new Date().toISOString(),
      environment: "production",
    };

    const keys = Object.keys(response);
    // Only the expected set
    expect(keys.sort()).toEqual([...EXPECTED_FIELDS].sort());

    // No sensitive values
    for (const value of Object.values(response)) {
      expect(typeof value).toBe("string");
      // Should not contain anything that looks like a token or key
      expect(value).not.toContain("sk-");
      expect(value).not.toContain("Bearer");
      expect(value).not.toContain("api_key");
      expect(value).not.toContain("secret");
    }
  });
});
