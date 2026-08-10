import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Route: Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "MicroMate", version: "1.0.0" });
  });

  // API Route: Google Apps Script Web App API simulation / relay
  app.post("/api/exec", (req, res) => {
    const { action, workspaceId, data } = req.body || {};
    console.log(`[API /exec] Action: ${action}, Workspace: ${workspaceId}`);
    
    res.json({
      status: "success",
      action: action || "ping",
      workspaceId: workspaceId || "workspace_123",
      timestamp: new Date().toISOString(),
      receivedData: data || null
    });
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
