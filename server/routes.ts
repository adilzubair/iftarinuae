import type { Express, RequestHandler } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "../shared/routes";
import { z } from "zod";
import { registerAuthRoutes, isAuthenticated } from "./auth";
import { isAdmin } from "./middleware/admin";
import { insertPlaceSchema, insertReviewSchema } from "../shared/schema";

export async function registerRoutes(app: Express, strictLimiter?: RequestHandler): Promise<Express> {
  // Register Auth Routes (Firebase-based)
  registerAuthRoutes(app);

  // === API Routes ===

  // List Places
  app.get(api.places.list.path, async (req, res) => {
    const places = await storage.getPlaces();
    res.json(places);
  });

  // Get Nearby Places
  app.get("/api/places/nearby", async (req, res) => {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    // Validate coords are finite numbers within UAE geographic bounds
    // UAE bounding box: ~22.6–26.5°N, ~51.5–56.5°E
    const UAE_BOUNDS = { minLat: 22.0, maxLat: 27.0, minLng: 51.0, maxLng: 57.0 };
    if (
      isNaN(lat) || isNaN(lng) ||
      !isFinite(lat) || !isFinite(lng) ||
      lat < UAE_BOUNDS.minLat || lat > UAE_BOUNDS.maxLat ||
      lng < UAE_BOUNDS.minLng || lng > UAE_BOUNDS.maxLng
    ) {
      return res.status(400).json({ message: "Invalid or out-of-range coordinates" });
    }

    const places = await storage.getPlaces();

    // Calculate distance and sort
    const placesWithDistance = places.map(place => {
      const placeLat = parseFloat(place.latitude || "0");
      const placeLng = parseFloat(place.longitude || "0");

      if (placeLat === 0 && placeLng === 0) {
        return { ...place, distance: Infinity };
      }

      // Haversine formula
      const R = 6371; // Radius of the earth in km
      const dLat = deg2rad(placeLat - lat);
      const dLng = deg2rad(placeLng - lng);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat)) * Math.cos(deg2rad(placeLat)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c; // Distance in km

      return { ...place, distance };
    }).sort((a, b) => a.distance - b.distance).slice(0, 20); // Limit to top 20 closest places

    // Filter out places with Infinity distance (invalid coordinates) if desired, 
    // or just return valid ones first. 
    // We already sliced the top 20, so we just return them.

    res.json(placesWithDistance);
  });

  function deg2rad(deg: number) {
    return deg * (Math.PI / 180)
  }

  // Get Place Details
  app.get(api.places.get.path, async (req, res) => {
    const place = await storage.getPlace(req.params.id as string);
    if (!place) {
      return res.status(404).json({ message: "Place not found" });
    }
    res.json(place);
  });

  // Create Place (Protected)
  app.post(api.places.create.path, strictLimiter || ((req, res, next) => next()), isAuthenticated, async (req, res) => {
    try {
      // Inject createdBy from authenticated user
      const input = insertPlaceSchema.parse(req.body);
      const place = await storage.createPlace({
        ...input,
        createdBy: req.user!.id,
      } as any);
      res.status(201).json(place);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Create Review (Protected)
  app.post(api.reviews.create.path, strictLimiter || ((req, res, next) => next()), isAuthenticated, async (req, res) => {
    try {
      const placeId = req.params.id as string;
      const userId = req.user!.id;

      // Check if user already reviewed
      const hasReviewed = await storage.hasUserReviewedPlace(userId, placeId);
      if (hasReviewed) {
        return res.status(409).json({ message: "You have already reviewed this place." });
      }

      const input = insertReviewSchema.parse(req.body);
      const review = await storage.createReview({
        ...input,
        placeId,
        userId,
      } as any);
      res.status(201).json(review);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // === ADMIN ROUTES ===

  // List all places (for admin)
  app.get("/api/admin/places", isAuthenticated, isAdmin, async (req, res) => {
    const places = await storage.getPlacesForAdmin();
    res.json(places);
  });

  // List pending places
  app.get("/api/admin/places/pending", isAuthenticated, isAdmin, async (req, res) => {
    const pendingPlaces = await storage.getPendingPlaces();
    res.json(pendingPlaces);
  });

  // Approve a place
  app.patch("/api/admin/places/:id/approve", isAuthenticated, isAdmin, async (req, res) => {
    const placeId = req.params.id as string;
    const adminUserId = req.user!.id;

    const approvedPlace = await storage.approvePlace(placeId, adminUserId);

    if (!approvedPlace) {
      return res.status(404).json({ message: "Place not found" });
    }

    res.json(approvedPlace);
  });

  // Reject a place (deletes it)
  app.delete("/api/admin/places/:id/reject", isAuthenticated, isAdmin, async (req, res) => {
    const placeId = req.params.id as string;

    const deleted = await storage.rejectPlace(placeId);

    if (!deleted) {
      return res.status(404).json({ message: "Place not found" });
    }

    res.json({ message: "Place rejected and deleted" });
  });

  // Get admin statistics
  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req, res) => {
    const stats = await storage.getAdminStats();
    res.json(stats);
  });

  // === IMAGE SUBMISSION ROUTES ===

  // Submit a photo for an existing place (authenticated users)
  app.post("/api/places/:id/images", isAuthenticated, async (req, res) => {
    const placeId = req.params.id as string;
    const userId = req.user!.id;
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== "string") {
      return res.status(400).json({ message: "imageUrl is required" });
    }

    // Only accept images hosted on Cloudinary
    try {
      const { hostname } = new URL(imageUrl);
      if (hostname !== "res.cloudinary.com") {
        return res.status(400).json({ message: "Images must be uploaded via the app's upload tool." });
      }
    } catch {
      return res.status(400).json({ message: "Invalid image URL." });
    }

    // Verify the place exists
    const place = await storage.getPlace(placeId);
    if (!place) {
      return res.status(404).json({ message: "Place not found" });
    }

    const submission = await storage.submitPlaceImage(placeId, userId, imageUrl);
    res.status(201).json(submission);
  });

  // List pending image submissions (admin only)
  app.get("/api/admin/images/pending", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const submissions = await storage.getPendingImageSubmissions();
      res.json(submissions);
    } catch (err) {
      console.error("[admin/images/pending] error:", err);
      res.status(500).json({ message: "Failed to fetch image submissions" });
    }
  });

  // Approve an image submission (admin only)
  app.patch("/api/admin/images/:id/approve", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const submissionId = req.params.id as string;
      const adminId = req.user!.id;
      const submission = await storage.approveImageSubmission(submissionId, adminId);
      if (!submission) return res.status(404).json({ message: "Submission not found" });
      res.json(submission);
    } catch (err) {
      console.error("[admin/images/approve] error:", err);
      res.status(500).json({ message: "Failed to approve image" });
    }
  });

  // Reject an image submission (admin only)
  app.delete("/api/admin/images/:id/reject", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const submissionId = req.params.id as string;
      const deleted = await storage.rejectImageSubmission(submissionId);
      if (!deleted) return res.status(404).json({ message: "Submission not found" });
      res.json({ message: "Image submission rejected" });
    } catch (err) {
      console.error("[admin/images/reject] error:", err);
      res.status(500).json({ message: "Failed to reject image" });
    }
  });

  // Resolve shortened Google Maps links
  app.get("/api/resolve-link", strictLimiter || ((req, res, next) => next()), async (req, res) => {
    const shortUrl = req.query.url as string;
    if (!shortUrl) {
      return res.status(400).json({ message: "URL is required" });
    }

    // SSRF Prevention: Strictly validate that the requested URL is a Google Maps shortlink
    try {
      const parsedUrl = new URL(shortUrl);
      const allowedDomains = ["goo.gl", "maps.app.goo.gl"];
      if (!allowedDomains.includes(parsedUrl.hostname.toLowerCase())) {
        return res.status(400).json({ message: "Invalid URL domain. Only Google Maps short links are allowed." });
      }
    } catch (e) {
      return res.status(400).json({ message: "Invalid URL format." });
    }

    try {
      const response = await fetch(shortUrl, { method: 'HEAD' });
      const finalUrl = response.url;
      res.json({ url: finalUrl });
    } catch (err) {
      console.error("Failed to resolve link:", err);
      res.status(500).json({ message: "Failed to resolve link" });
    }
  });

  // === SEO ROUTES ===

  app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    res.send(`User-agent: *\nAllow: /\nSitemap: https://${req.get("host")}/sitemap.xml`);
  });

  app.get("/sitemap.xml", async (req, res) => {
    const places = await storage.getPlaces();
    const baseUrl = `https://${req.get("host")}`;

    const staticPages = [
      `${baseUrl}/`,
      `${baseUrl}/login`,
      `${baseUrl}/add`,
    ];

    const placePages = places.map(place => `${baseUrl}/places/${place.id}`);

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticPages.map(url => `
  <url>
    <loc>${url}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
  ${placePages.map(url => `
  <url>
    <loc>${url}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')}
</urlset>`;

    res.type("application/xml");
    res.send(sitemap);
  });

  // Seed Data (if empty)
  console.log(`[${new Date().toISOString()}] Checking if database needs seeding...`);

  try {
    const placesDataPromise = storage.getPlaces();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout after 10s")), 10000)
    );

    const placesData = await Promise.race([placesDataPromise, timeoutPromise]) as any;
    console.log(`[${new Date().toISOString()}] Database has ${placesData.length} places`);
    if (placesData.length === 0) {
      console.log("Seeding database...");
      const user = "system_seed_user"; // Placeholder user ID for seed data

      const dubaiMall = await storage.createPlace({
        name: "Al Hallab - Dubai Mall",
        description: "Authentic Lebanese cuisine with a view of the fountains. Great for families.",
        location: "Dubai Mall, Downtown Dubai",
        createdBy: user,
      } as any);

      await storage.createReview({
        placeId: dubaiMall.id,
        userId: user,
        rating: 5,
        comment: "Amazing food and atmosphere!",
      } as any);

      await storage.createPlace({
        name: "Seven Sands",
        description: "Traditional Emirati cuisine with a modern twist. Located at The Beach, JBR.",
        location: "The Beach, JBR, Dubai",
        createdBy: user,
      } as any);

      await storage.createPlace({
        name: "Tent Jumeirah Restaurant",
        description: "Experience iftar in a traditional setting right by the sea.",
        location: "Umm Suqeim, Jumeirah, Dubai",
        createdBy: user,
      } as any);

      console.log("Seeding complete.");
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error during seeding:`, error);
  }

  // We return the http server instance if we had one, but strict return type demands Server. 
  // Since we removed httpServer input, we can just return app as unknown as Server or just null, 
  // BUT the existing code in index.ts expects a return.
  // Actually, let's fix the return type in signature too.
  // For now, I'll return empty object casted or just change signature in previous step?
  // I changed signature to Promise<Server>. I should change it to Promise<void> or Promise<Express>.
  // I'll update signature in next step. For now, let's just make it compilable.
  // Wait, I can't return httpServer if I don't have it.
  // I'll return app as any.
  return app as any;
}
