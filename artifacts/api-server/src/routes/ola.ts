import { Router } from "express";

const router = Router();

const OLA_API_KEY = process.env.OLA_API_KEY ?? "";
const OLA_CLIENT_ID = process.env.OLA_CLIENT_ID ?? "";
const OLA_CLIENT_SECRET = process.env.OLA_CLIENT_SECRET ?? "";

const OLA_BASE = "https://api.olamaps.io";
const OLA_AUTH =
  "https://account.olamaps.io/realms/olamaps/protocol/openid-connect/token";

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<string | null> {
  if (!OLA_CLIENT_ID || !OLA_CLIENT_SECRET) return null;
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  try {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: OLA_CLIENT_ID,
      client_secret: OLA_CLIENT_SECRET,
      scope: "openid",
    });
    const res = await fetch(OLA_AUTH, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("[ola/token] OAuth failed:", res.status, errText);
      return null;
    }
    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    cachedToken = data.access_token ?? null;
    tokenExpiry = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000;
    console.log("[ola/token] Token refreshed, expires in", data.expires_in, "s");
    return cachedToken;
  } catch (err) {
    console.error("[ola/token] Auth error:", err);
    return null;
  }
}

/**
 * Returns the best auth headers: prefer Bearer token, fall back to API key query param.
 */
function authHeaders(token: string | null): Record<string, string> {
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

/**
 * Appends api_key to URL if no Bearer token is available.
 */
function withApiKey(url: string, token: string | null): string {
  if (token) return url; // Bearer token is preferred, no need for api_key
  if (!OLA_API_KEY) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}api_key=${OLA_API_KEY}`;
}

// ── GET /ola/token ─────────────────────────────────────────────────────────────
// Used by the map HTML to authenticate tile requests via Bearer token.
router.get("/ola/token", async (_req, res) => {
  const token = await getAccessToken();
  res.json({ token: token || null, apiKey: OLA_API_KEY || null });
});

// ── GET /ola/map-style ─────────────────────────────────────────────────────────
// Proxies and rewrites Ola Maps style JSON so all URLs have auth injected.
router.get("/ola/map-style", async (req, res) => {
  const isDark = req.query.dark === "true";
  const styleUrl = isDark
    ? `${OLA_BASE}/tiles/vector/v1/styles/default-dark-standard/style.json`
    : `${OLA_BASE}/tiles/vector/v1/styles/default-light-standard/style.json`;

  try {
    const token = await getAccessToken();
    const headers = authHeaders(token);

    // Fetch the style JSON from Ola Maps
    const fetchUrl = withApiKey(styleUrl, token);
    console.log("[ola/map-style] Fetching:", fetchUrl.split("?")[0]);

    const styleRes = await fetch(fetchUrl, { headers });
    if (!styleRes.ok) {
      const errText = await styleRes.text();
      console.error("[ola/map-style] Failed:", styleRes.status, errText.slice(0, 200));
      res.status(502).json({ error: "Failed to fetch Ola Maps style" });
      return;
    }

    const style = (await styleRes.json()) as Record<string, unknown>;

    /**
     * Rewrite every URL in the style JSON so it includes auth.
     * - If we have a Bearer token, inject it as a query param (api_key workaround
     *   for tile requests that don't support Authorization headers).
     * - If we have an API key, inject it directly.
     */
    function injectAuth(url: string): string {
      if (!url.includes("api.olamaps.io")) return url;
      // Already has api_key — don't double-inject
      if (url.includes("api_key=")) return url;
      const sep = url.includes("?") ? "&" : "?";
      // Use api_key param for tile URLs (MapLibre doesn't send Authorization header for tiles)
      if (OLA_API_KEY) return `${url}${sep}api_key=${OLA_API_KEY}`;
      return url;
    }

    function rewriteStyleUrls(obj: unknown): unknown {
      if (typeof obj === "string") return injectAuth(obj);
      if (Array.isArray(obj)) return obj.map(rewriteStyleUrls);
      if (obj && typeof obj === "object") {
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
          result[k] = rewriteStyleUrls(v);
        }
        return result;
      }
      return obj;
    }

    const rewritten = rewriteStyleUrls(style);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(rewritten);
  } catch (err) {
    console.error("[ola/map-style] error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// ── GET /ola/search ────────────────────────────────────────────────────────────
// Proxies Ola Maps Places Autocomplete.
router.get("/ola/search", async (req, res) => {
  const query = String(req.query.q || "").trim();
  const lat = req.query.lat ? String(req.query.lat) : null;
  const lon = req.query.lon ? String(req.query.lon) : null;

  if (!query || query.length < 2) {
    res.json({ predictions: [] });
    return;
  }

  try {
    const token = await getAccessToken();
    const params = new URLSearchParams({ input: query, language: "en" });
    if (lat && lon) {
      params.set("location", `${lat},${lon}`);
    } else {
      params.set("location", "26.8467,80.9462"); // Lucknow default
    }

    const baseUrl = `${OLA_BASE}/places/v1/autocomplete?${params}`;
    const url = withApiKey(baseUrl, token);
    console.log("[ola/search] Fetching:", url.split("?")[0], "q=", query);
    const fetchRes = await fetch(url, { headers: authHeaders(token) });

    if (!fetchRes.ok) {
      const errText = await fetchRes.text();
      console.error("[ola/search] Failed:", fetchRes.status, errText.slice(0, 200));
      res.json({ predictions: [] });
      return;
    }

    const data = (await fetchRes.json()) as any;
    res.json(data);
  } catch (err) {
    console.error("[ola/search] error:", err);
    res.json({ predictions: [] });
  }
});

// ── GET /ola/directions ────────────────────────────────────────────────────────
// Proxies Ola Maps Directions API (POST upstream, GET for client simplicity).
router.get("/ola/directions", async (req, res) => {
  const origin = String(req.query.origin || "");
  const destination = String(req.query.destination || "");

  if (!origin || !destination) {
    res.json({ routes: [] });
    return;
  }

  try {
    const token = await getAccessToken();
    const params = new URLSearchParams({
      origin,
      destination,
      mode: "driving",
    });
    const baseUrl = `${OLA_BASE}/routing/v1/directions?${params}`;
    const url = withApiKey(baseUrl, token);
    console.log("[ola/directions] Fetching:", url.split("?")[0]);

    // Ola Maps directions requires POST
    const fetchRes = await fetch(url, {
      method: "POST",
      headers: {
        ...authHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!fetchRes.ok) {
      const errText = await fetchRes.text();
      console.error("[ola/directions] Failed:", fetchRes.status, errText.slice(0, 200));
      res.json({ routes: [] });
      return;
    }

    const data = (await fetchRes.json()) as any;
    res.json(data);
  } catch (err) {
    console.error("[ola/directions] error:", err);
    res.json({ routes: [] });
  }
});

// ── GET /ola/reverse ───────────────────────────────────────────────────────────
// Proxies Ola Maps Reverse Geocode.
router.get("/ola/reverse", async (req, res) => {
  const lat = String(req.query.lat || "");
  const lon = String(req.query.lon || "");

  if (!lat || !lon) {
    res.json({ results: [] });
    return;
  }

  try {
    const token = await getAccessToken();
    const params = new URLSearchParams({ latlng: `${lat},${lon}`, language: "en" });
    const baseUrl = `${OLA_BASE}/places/v1/reverse-geocode?${params}`;
    const url = withApiKey(baseUrl, token);
    console.log("[ola/reverse] Fetching:", url.split("?")[0]);

    const fetchRes = await fetch(url, { headers: authHeaders(token) });

    if (!fetchRes.ok) {
      const errText = await fetchRes.text();
      console.error("[ola/reverse] Failed:", fetchRes.status, errText.slice(0, 200));
      res.json({ results: [] });
      return;
    }

    const data = (await fetchRes.json()) as any;
    res.json(data);
  } catch (err) {
    console.error("[ola/reverse] error:", err);
    res.json({ results: [] });
  }
});

// ── GET /ola/place-details ─────────────────────────────────────────────────────
// Fetches coordinates for a place_id (needed if autocomplete result has no geometry).
router.get("/ola/place-details", async (req, res) => {
  const placeId = String(req.query.place_id || "").trim();
  if (!placeId) {
    res.json({ result: null });
    return;
  }

  try {
    const token = await getAccessToken();
    const params = new URLSearchParams({ place_id: placeId, language: "en" });
    const baseUrl = `${OLA_BASE}/places/v1/details?${params}`;
    const url = withApiKey(baseUrl, token);
    console.log("[ola/place-details] Fetching:", url.split("?")[0]);

    const fetchRes = await fetch(url, { headers: authHeaders(token) });

    if (!fetchRes.ok) {
      const errText = await fetchRes.text();
      console.error("[ola/place-details] Failed:", fetchRes.status, errText.slice(0, 200));
      res.json({ result: null });
      return;
    }

    const data = (await fetchRes.json()) as any;
    res.json(data);
  } catch (err) {
    console.error("[ola/place-details] error:", err);
    res.json({ result: null });
  }
});

export default router;
