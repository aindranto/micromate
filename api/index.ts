import express from "express";

const app = express();

app.use(express.json({ limit: "10mb" }));

// API Route: Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "MicroMate", version: "1.0.0" });
});

// API Route: Google Apps Script Web App relay / proxy (if needed)
app.post("/api/exec", (req, res) => {
  const { action, workspaceId, data } = req.body || {};
  console.log(`[API /exec] Action: ${action}, Workspace: ${workspaceId}`);
  
  res.json({
    status: "success",
    action: action || "ping",
    workspaceId: workspaceId || "default",
    timestamp: new Date().toISOString(),
    receivedData: data || null
  });
});

export default app;
