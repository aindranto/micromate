import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Route: Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "MicroMate", version: "1.0.0" });
  });

  // API Route: Google Apps Script Web App API simulation / relay
  // Matches PRD Section 20 POST /exec
  app.post("/api/exec", (req, res) => {
    const { action, workspaceId, data } = req.body || {};
    console.log(`[API /exec] Action: ${action}, Workspace: ${workspaceId}`);
    
    // Echo back success for offline-first sync queue processing
    res.json({
      status: "success",
      action: action || "ping",
      workspaceId: workspaceId || "workspace_123",
      timestamp: new Date().toISOString(),
      receivedData: data || null
    });
  });

  // API Route: Gemini AI Assistant for Asset Questions
  app.post("/api/ai/query", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: "GEMINI_API_KEY is not configured.",
          fallback: true
        });
      }

      const { prompt, assetsData } = req.body;
      const ai = new GoogleGenAI({ apiKey });

      const systemPrompt = `You are MicroMate AI, an intelligent personal asset and maintenance manager assistant.
The user will ask questions about their registered assets, maintenance history, warranties, vehicle mileage, or expenses.
Use the provided structured JSON context of the user's assets to answer accurately, concisely, and helpfully in Indonesian (or the language of the prompt).

Current Assets Data context:
${JSON.stringify(assetsData, null, 2)}

Instructions:
1. Answer directly and precisely based on the assets data.
2. If asked about last oil change ("kapan terakhir ganti oli"), check maintenance records for oil change or vehicle last_oil_change_date/mileage.
3. If asked about total cost, sum up expenses for the relevant asset.
4. If asked about expiring warranties, highlight assets whose warranty end_date is upcoming or expired.
5. Format answer neatly using bullet points if needed.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\nUser Question: ${prompt}` }] }
        ]
      });

      const replyText = response.text || "Tidak ada jawaban yang dihasilkan.";
      res.json({ reply: replyText });
    } catch (err: any) {
      console.error("AI query error:", err);
      res.status(500).json({ error: err.message || "Failed to query AI assistant" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MicroMate server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
