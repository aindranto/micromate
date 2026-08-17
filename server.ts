import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import apiApp from "./api/index";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Reuse the exact same API routes as the Vercel serverless deployment
  // (api/index.ts) instead of duplicating /api/health and /api/exec here.
  // The two copies had already drifted (e.g. /api/ai/query only existed
  // in neither), which is the kind of divergence duplication invites.
  app.use(apiApp);

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
