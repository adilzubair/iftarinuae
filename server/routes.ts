import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "../shared/routes";
import { z } from "zod";
import { registerAuthRoutes, isAuthenticated } from "./auth";
import { isAdmin } from "./middleware/admin";
import { insertPlaceSchema, insertReviewSchema } from "../shared/schema";

export async function registerRoutes(app: Express): Promise<Express> {
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

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: "Invalid latitude or longitude" });
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
  app.post(api.places.create.path, isAuthenticated, async (req, res) => {
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
  app.post(api.reviews.create.path, isAuthenticated, async (req, res) => {
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
