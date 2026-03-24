import { Router } from "express";

const router = Router();

const OLA_API_KEY = process.env.OLA_API_KEY ?? "";
const OLA_CLIENT_ID = process.env.OLA_CLIENT_ID ?? "";
const OLA_CLIENT_SECRET = process.env.OLA_CLIENT_SECRET ?? "";

const OLA_BASE = "https://api.olamaps.io";
const OLA_AUTH = "https://account.olamaps.io/realms/olamaps/protocol/openid-connect/token";

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
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    cachedToken = data.access_token ?? null;
    tokenExpiry = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000;
    return cachedToken;
  } catch {
    return null;
  }
}

function authHeaders(token: string | null): Record<string, string> {
  if (token) return { Authorization: `Bearer ${token}` };
  if (OLA_API_KEY) return {};
  return {};
}

function withApiKey(url: string): string {
  if (!OLA_API_KEY) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}api_key=${OLA_API_KEY}`;
}

router.get("/ola/token", async (_req, res) => {
  res.json({ apiKey: OLA_API_KEY || null, token: null });
});

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
      params.set("location", "26.8467,80.9462");
    }

    const url = withApiKey(`${OLA_BASE}/places/v1/autocomplete?${params}`);
    const fetchRes = await fetch(url, { headers: authHeaders(token) });

    if (!fetchRes.ok) {
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

router.get("/ola/directions", async (req, res) => {
  const origin = String(req.query.origin || "");
  const destination = String(req.query.destination || "");

  if (!origin || !destination) {
    res.json({ routes: [] });
    return;
  }

  try {
    const token = await getAccessToken();
    const params = new URLSearchParams({ origin, destination, mode: "driving" });
    const url = withApiKey(`${OLA_BASE}/routing/v1/directions?${params}`);

    // Ola Maps directions requires POST
    const fetchRes = await fetch(url, {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
    });

    if (!fetchRes.ok) {
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
    const url = withApiKey(`${OLA_BASE}/places/v1/reverse-geocode?${params}`);
    const fetchRes = await fetch(url, { headers: authHeaders(token) });

    if (!fetchRes.ok) {
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

export default router;
