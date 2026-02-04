import type { Express, RequestHandler, Request, Response, NextFunction } from "express";
import { verifyIdToken, getFirebaseUser } from "./firebase-admin";
import { db } from "./db";
import { users } from "../shared/models/auth";
import { eq } from "drizzle-orm";

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                firebaseUid: string;
                email: string | null;
                firstName: string | null;
                lastName: string | null;
                profileImageUrl: string | null;
                isAdmin: boolean;
            };
        }
    }
}

/**
 * Middleware to verify Firebase ID token and attach user to request
 */
export const isAuthenticated: RequestHandler = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized - No token provided" });
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
        const firebaseUser = await getFirebaseUser(idToken);

        // Find or create user in database
        let [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUser.uid));

        if (!user) {
            // Parse name from Firebase
            const nameParts = (firebaseUser.name || "").split(" ");
            const firstName = nameParts[0] || null;
            const lastName = nameParts.slice(1).join(" ") || null;

            // Create new user
            [user] = await db
                .insert(users)
                .values({
                    firebaseUid: firebaseUser.uid,
                    email: firebaseUser.email,
                    firstName,
                    lastName,
                    profileImageUrl: firebaseUser.picture,
                })
                .returning();
        }

        req.user = {
            id: user.id,
            firebaseUid: user.firebaseUid!,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
            isAdmin: user.isAdmin || false,
        };

        next();
    } catch (error) {
        console.error("Auth verification error:", error);
        return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }
};

/**
 * Optional auth middleware - doesn't require authentication but attaches user if present
 */
export const optionalAuth: RequestHandler = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return next();
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
        const firebaseUser = await getFirebaseUser(idToken);
        const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUser.uid));

        if (user) {
            req.user = {
                id: user.id,
                firebaseUid: user.firebaseUid!,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profileImageUrl: user.profileImageUrl,
                isAdmin: user.isAdmin || false,
            };
        }
    } catch (error) {
        // Token invalid, but optional auth so continue
    }

    next();
};

/**
 * Register auth routes
 */
export function registerAuthRoutes(app: Express): void {
    // Get current user
    app.get("/api/auth/user", isAuthenticated, (req: Request, res: Response) => {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        return res.json(req.user);
    });

    // Logout (client-side only for Firebase, but we provide this endpoint for consistency)
    app.post("/api/logout", (_req: Request, res: Response) => {
        // Firebase logout is handled on the client
        return res.json({ message: "Logged out successfully" });
    });
}
