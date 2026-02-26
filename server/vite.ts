import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  console.log(`[${new Date().toISOString()}] Setting up Vite server options...`);
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  console.log(`[${new Date().toISOString()}] Creating Vite server...`);
  const vite = await createViteServer({
    // Inline the config here instead of importing vite.config.ts directly.
    // A direct import causes esbuild to bundle vite.config.ts which uses
    // import.meta.dirname — undefined in CJS — crashing the server on Render.
    plugins: [(await import("@vitejs/plugin-react")).default()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "..", "client", "src"),
        "@shared": path.resolve(__dirname, "..", "shared"),
        "@assets": path.resolve(__dirname, "..", "attached_assets"),
      },
    },
    root: path.resolve(__dirname, "..", "client"),
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });
  console.log(`[${new Date().toISOString()}] Vite server created`);

  console.log(`[${new Date().toISOString()}] Installing Vite middlewares...`);
  app.use(vite.middlewares);
  console.log(`[${new Date().toISOString()}] Vite middlewares installed`);

  app.use("/{*path}", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname, // __dirname works in CJS; import.meta.dirname does not
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
