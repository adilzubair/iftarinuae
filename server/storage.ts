import { db } from "./db";
import { places, reviews, type InsertPlace, type InsertReview, type Place, type Review, type PlaceWithReviews } from "../shared/schema";
import { eq, sql, and, desc } from "drizzle-orm";

export interface IStorage {
  getPlaces(): Promise<PlaceWithReviews[]>;
  getPlace(id: string): Promise<PlaceWithReviews | undefined>;
  createPlace(place: InsertPlace): Promise<Place>;
  createReview(review: InsertReview): Promise<Review>;
  hasUserReviewedPlace(userId: string, placeId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Helper function to build PlaceWithReviews from a Place
  private async buildPlaceWithReviews(place: Place, includeReviews: boolean = false): Promise<PlaceWithReviews> {
    const placeReviews = await db.select().from(reviews).where(eq(reviews.placeId, place.id));
    const totalRating = placeReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = placeReviews.length > 0 ? totalRating / placeReviews.length : 0;

    return {
      ...place,
      reviews: includeReviews ? placeReviews : [],
      reviewCount: placeReviews.length,
      averageRating: Number(averageRating.toFixed(1)),
    };
  }

  async getPlaces(): Promise<PlaceWithReviews[]> {
    // Get only approved places for public view
    const approvedPlaces = await db
      .select()
      .from(places)
      .where(eq(places.approved, true))
      .orderBy(desc(places.createdAt));

    const result = await Promise.all(
      approvedPlaces.map((place) => this.buildPlaceWithReviews(place, false))
    );

    return result;
  }

  async getPlace(id: string): Promise<PlaceWithReviews | undefined> {
    const [place] = await db.select().from(places).where(eq(places.id, id));
    if (!place) return undefined;

    return this.buildPlaceWithReviews(place, true);
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

  // === ADMIN METHODS ===

  async getPlacesForAdmin(): Promise<PlaceWithReviews[]> {
    // Get ALL places (approved and pending) for admin view
    const allPlaces = await db.select().from(places).orderBy(desc(places.createdAt));

    const result = await Promise.all(
      allPlaces.map((place) => this.buildPlaceWithReviews(place, false))
    );

    return result;
  }

  async getPendingPlaces(): Promise<PlaceWithReviews[]> {
    // Get only pending (unapproved) places
    const pendingPlaces = await db
      .select()
      .from(places)
      .where(eq(places.approved, false))
      .orderBy(desc(places.createdAt));

    const result = await Promise.all(
      pendingPlaces.map((place) => this.buildPlaceWithReviews(place, false))
    );

    return result;
  }

  async approvePlace(placeId: string, adminUserId: string): Promise<Place | undefined> {
    const [approvedPlace] = await db
      .update(places)
      .set({
        approved: true,
        approvedBy: adminUserId,
        approvedAt: new Date(),
      })
      .where(eq(places.id, placeId))
      .returning();

    return approvedPlace;
  }

  async rejectPlace(placeId: string): Promise<boolean> {
    // First delete associated reviews to avoid FK constraint violations
    await db.delete(reviews).where(eq(reviews.placeId, placeId));

    // Then delete the place
    const result = await db
      .delete(places)
      .where(eq(places.id, placeId))
      .returning();

    return result.length > 0;
  }

  async getAdminStats(): Promise<{
    totalPlaces: number;
    approvedPlaces: number;
    pendingPlaces: number;
    approvedToday: number;
  }> {
    const allPlacesResult = await db.select().from(places);
    const approvedPlacesResult = await db.select().from(places).where(eq(places.approved, true));
    const pendingPlacesResult = await db.select().from(places).where(eq(places.approved, false));

    // Get places approved today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const approvedTodayResult = await db
      .select()
      .from(places)
      .where(
        and(
          eq(places.approved, true),
          sql`${places.approvedAt} >= ${today}`
        )
      );

    return {
      totalPlaces: allPlacesResult.length,
      approvedPlaces: approvedPlacesResult.length,
      pendingPlaces: pendingPlacesResult.length,
      approvedToday: approvedTodayResult.length,
    };
  }
}

export const storage = new DatabaseStorage();
