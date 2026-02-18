import express from "express";
import { registerRoutes } from "./routes";
import helmet from "helmet";

import { rateLimit } from "express-rate-limit";

export async function createApp() {
    const app = express();

    // Trust Vercel's proxy so express-rate-limit can read the real client IP
    // from the X-Forwarded-For header (fixes ERR_ERL_UNEXPECTED_X_FORWARDED_FOR)
    app.set("trust proxy", 1);

    // Security Headers
    const isDev = process.env.NODE_ENV !== "production";
    app.use(helmet({
        // Disable CSP in development — Vite manages its own security and its
        // HMR WebSocket (ws://localhost:*) would otherwise be blocked.
        contentSecurityPolicy: isDev ? false : {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com", "https://www.googletagmanager.com"],
                connectSrc: [
                    "'self'",
                    "https://identitytoolkit.googleapis.com",
                    "https://securetoken.googleapis.com",
                    "https://*.firebaseio.com",
                    "wss://*.firebaseio.com",
                    // Map feature: Photon search + Nominatim reverse geocoding
                    "https://photon.komoot.io",
                    "https://nominatim.openstreetmap.org",
                ],
                imgSrc: ["'self'", "data:", "https:", "blob:"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                frameSrc: ["'self'", "https://*.firebaseapp.com", "https://*.googleapis.com"],
            },
        },
        crossOriginOpenerPolicy: { policy: "unsafe-none" }, // Allow Firebase Auth popups (google.com origin)
    }));

    // Rate Limiting
    // General Rate Limiting
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 1000, // Relaxed limit: 1000 requests per 15 minutes
        standardHeaders: true,
        legacyHeaders: false,
        message: { message: "Too many requests, please try again later." }
    });

    // Strict Rate Limiting for sensitive routes (e.g. creating content)
    const strictLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 50, // Stricter limit: 50 requests per 15 minutes
        standardHeaders: true,
        legacyHeaders: false,
        message: { message: "Too many requests, please try again later." }
    });

    // Apply rate limiting to all requests
    app.use(limiter);

    // JSON Body Parser — 50kb limit prevents body-size DoS
    app.use(express.json({ limit: "50kb" }));
    app.use(express.urlencoded({ extended: false, limit: "50kb" }));

    // Logging Middleware
    app.use((req, res, next) => {
        const start = Date.now();
        const path = req.path;
        let capturedJsonResponse: Record<string, any> | undefined = undefined;

        // Only capture response body in development (avoids logging PII in production)
        if (isDev) {
            const originalResJson = res.json;
            res.json = function (bodyJson, ...args) {
                capturedJsonResponse = bodyJson;
                return originalResJson.apply(res, [bodyJson, ...args]);
            };
        }

        res.on("finish", () => {
            const duration = Date.now() - start;
            if (path.startsWith("/api")) {
                let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
                if (isDev && capturedJsonResponse) {
                    logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
                }
                console.log(logLine);
            }
        });

        next();
    });

    // Register API Routes
    await registerRoutes(app, strictLimiter);

    // Global Error Handler
    app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = process.env.NODE_ENV === "production" ? "Internal Server Error" : (err.message || "Internal Server Error");
        console.error("Internal Server Error:", err);
        if (res.headersSent) {
            return next(err);
        }
        return res.status(status).json({ message });
    });

    return app;
}
