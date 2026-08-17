import "dotenv/config";
import express from "express";

const app = express();

app.use(express.json({ limit: "50mb" }));

// API Route: Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "MicroMate", version: "1.0.0" });
});

// API Route: Google Apps Script Web App relay / proxy
app.post("/api/exec", async (req, res) => {
  const targetUrl = req.header("x-apps-script-url") || req.body?.appsScriptUrl;
  const payload = req.body;

  if (!targetUrl || !targetUrl.startsWith("https://script.google.com/")) {
    return res.status(400).json({
      success: false,
      error: "INVALID_URL",
      message: "URL Apps Script Web App tidak valid atau tidak ditemukan di header 'x-apps-script-url'."
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "User-Agent": "MicroMate-Proxy/1.0"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: "HTTP_ERROR",
        message: `Apps Script mengembalikan status HTTP ${response.status}`
      });
    }

    const json = await response.json().catch(() => null);
    if (!json) {
      return res.status(502).json({
        success: false,
        error: "BAD_GATEWAY",
        message: "Apps Script tidak mengembalikan format JSON yang valid."
      });
    }

    return res.json(json);
  } catch (error: any) {
    if (error.name === "AbortError") {
      return res.status(504).json({
        success: false,
        error: "GATEWAY_TIMEOUT",
        message: "Koneksi ke Apps Script melebihi batas waktu (Timeout 25 detik)."
      });
    }
    return res.status(500).json({
      success: false,
      error: "PROXY_ERROR",
      message: error?.message || "Terjadi kesalahan pada server proxy."
    });
  }
});

export default app;
