import type { RequestHandler } from "express";

/**
 * Middleware to check if authenticated user has admin privileges
 * Must be used after isAuthenticated middleware
 */
export const isAdmin: RequestHandler = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized - Authentication required" });
    }

    // Check if user has admin privileges
    // Note: isAdmin field is added to user object by the auth system
    const userIsAdmin = (req.user as any).isAdmin;

    if (!userIsAdmin) {
        return res.status(403).json({
            message: "Forbidden - Admin access required"
        });
    }

    next();
};
