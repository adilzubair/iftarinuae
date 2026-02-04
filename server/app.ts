import express from "express";
import { registerRoutes } from "./routes";
import helmet from "helmet";

export async function createApp() {
    const app = express();

    // Security Headers
    app.use(helmet({
        contentSecurityPolicy: false, // Disable CSP for simplicity in this demo, enable for prod
        crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }, // Allow Firebase Auth popups
    }));

    // JSON Body Parser with rawBody capture (if needed for webhooks, else standard is fine)
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Logging Middleware
    app.use((req, res, next) => {
        const start = Date.now();
        const path = req.path;
        let capturedJsonResponse: Record<string, any> | undefined = undefined;

        const originalResJson = res.json;
        res.json = function (bodyJson, ...args) {
            capturedJsonResponse = bodyJson;
            return originalResJson.apply(res, [bodyJson, ...args]);
        };

        res.on("finish", () => {
            const duration = Date.now() - start;
            if (path.startsWith("/api")) {
                let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
                if (capturedJsonResponse) {
                    logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
                }
                console.log(logLine);
            }
        });

        next();
    });

    // Register API Routes
    await registerRoutes(app);

    // Global Error Handler
    app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        console.error("Internal Server Error:", err);
        if (res.headersSent) {
            return next(err);
        }
        return res.status(status).json({ message });
    });

    return app;
}
