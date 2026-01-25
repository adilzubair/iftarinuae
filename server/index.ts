import { createApp } from "./app";
import { createServer } from "http";
import { serveStatic } from "./static";

(async () => {
  const app = await createApp();
  const httpServer = createServer(app);

  // Setup Vite or Static serving
  // These middlewares are added after the API routes and Error Handler
  // Requests that are not API and not Errors will fall through to here (Frontend)
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      console.log(`serving on port ${port}`);
    },
  );
})();
