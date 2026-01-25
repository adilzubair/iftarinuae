import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { registerAuthRoutes, isAuthenticated } from "./auth";
import { insertPlaceSchema, insertReviewSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Express> {
  // Register Auth Routes (Firebase-based)
  registerAuthRoutes(app);

  // === API Routes ===

  // List Places
  app.get(api.places.list.path, async (req, res) => {
    const places = await storage.getPlaces();
    res.json(places);
  });

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

  // Seed Data (if empty)
  const placesData = await storage.getPlaces();
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
