import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runBreachCheck } from "../lib/breach-check.js";

// Mocked breach-check regression test for the shared core used by BOTH the
// Express route (server.js) and the Vercel entry (api/breach-check.js). The
// upstream XposedOrNot call is always mocked — this test never touches the
// network. Each case uses a unique IP (per-IP rate limit) and a unique email
// (10-min response cache) so cases cannot interfere with each other.

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe("breach-check core (mocked upstream)", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 400 invalid_email for a malformed email, never calling upstream", async () => {
    const { status, body } = await runBreachCheck({ email: "not-an-email", ip: "10.0.0.4" });
    expect(status).toBe(400);
    expect(body.error).toBe("invalid_email");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 invalid_email for a missing/empty email", async () => {
    const { status, body } = await runBreachCheck({ email: "   ", ip: "10.0.0.5" });
    expect(status).toBe(400);
    expect(body.error).toBe("invalid_email");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 200 with a normalized result on upstream success", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ExposedBreaches: {
          breaches_details: [
            {
              breach: "ExampleBreach",
              domain: "example.com",
              xposed_date: "2021",
              xposed_records: "100",
              xposed_data: "emails; passwords",
              password_risk: "plaintext",
            },
          ],
        },
      }),
    );
    const { status, body } = await runBreachCheck({
      email: "success-case@example.com",
      ip: "10.0.0.6",
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.result.found).toBe(true);
    expect(body.result.breaches[0].name).toBe("ExampleBreach");
    expect(body.result.source).toBe("XposedOrNot");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps an upstream 429 to our own rate_limited 429", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(429, { error: "too many" }));
    const { status, body } = await runBreachCheck({
      email: "upstream-429@example.com",
      ip: "10.0.0.7",
    });
    expect(status).toBe(429);
    expect(body.error).toBe("rate_limited");
  });

  it("maps an upstream 5xx to upstream_unavailable 502", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: "boom" }));
    const { status, body } = await runBreachCheck({
      email: "upstream-500@example.com",
      ip: "10.0.0.8",
    });
    expect(status).toBe(502);
    expect(body.error).toBe("upstream_unavailable");
  });
});
