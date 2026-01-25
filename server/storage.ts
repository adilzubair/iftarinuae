import { db } from "./db";
import { places, reviews, type InsertPlace, type InsertReview, type Place, type Review, type PlaceWithReviews } from "@shared/schema";
import { eq, sql, and, desc } from "drizzle-orm";

export interface IStorage {
  getPlaces(): Promise<PlaceWithReviews[]>;
  getPlace(id: string): Promise<PlaceWithReviews | undefined>;
  createPlace(place: InsertPlace): Promise<Place>;
  createReview(review: InsertReview): Promise<Review>;
  hasUserReviewedPlace(userId: string, placeId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getPlaces(): Promise<PlaceWithReviews[]> {
    // Get all places
    const allPlaces = await db.select().from(places).orderBy(desc(places.createdAt));
    
    // For each place, get stats
    // Note: In a larger app, we'd use a more complex SQL query with joins and aggregation,
    // but for simplicity and type safety with Drizzle, we'll fetch relations or aggregate separately.
    // Let's do a join to get reviews to calculate averages.
    
    const result = await Promise.all(allPlaces.map(async (place) => {
      const placeReviews = await db.select().from(reviews).where(eq(reviews.placeId, place.id));
      const totalRating = placeReviews.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = placeReviews.length > 0 ? totalRating / placeReviews.length : 0;
      
      return {
        ...place,
        reviews: [], // List view doesn't need full reviews
        reviewCount: placeReviews.length,
        averageRating: Number(averageRating.toFixed(1)),
      };
    }));

    return result;
  }

  async getPlace(id: string): Promise<PlaceWithReviews | undefined> {
    const [place] = await db.select().from(places).where(eq(places.id, id));
    if (!place) return undefined;

    const placeReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.placeId, id))
      .orderBy(desc(reviews.createdAt));

    const totalRating = placeReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = placeReviews.length > 0 ? totalRating / placeReviews.length : 0;

    return {
      ...place,
      reviews: placeReviews,
      reviewCount: placeReviews.length,
      averageRating: Number(averageRating.toFixed(1)),
    };
  }

  async createPlace(place: InsertPlace): Promise<Place> {
    const [newPlace] = await db.insert(places).values(place as any).returning();
    return newPlace;
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review as any).returning();
    return newReview;
  }

  async hasUserReviewedPlace(userId: string, placeId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.placeId, placeId)));
    return !!existing;
  }
}

export const storage = new DatabaseStorage();
