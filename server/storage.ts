import { db } from "./db";
import { places, reviews, placeImageSubmissions, type InsertPlace, type InsertReview, type Place, type Review, type PlaceWithReviews, type PlaceImageSubmission, type PlaceImageSubmissionWithPlace } from "../shared/schema";
import { eq, sql, and, desc } from "drizzle-orm";

export interface IStorage {
  getPlaces(): Promise<PlaceWithReviews[]>;
  getPlace(id: string): Promise<PlaceWithReviews | undefined>;
  createPlace(place: InsertPlace): Promise<Place>;
  createReview(review: InsertReview): Promise<Review>;
  hasUserReviewedPlace(userId: string, placeId: string): Promise<boolean>;
  // Image submission
  submitPlaceImage(placeId: string, userId: string, imageUrl: string): Promise<PlaceImageSubmission>;
  getPendingImageSubmissions(): Promise<PlaceImageSubmissionWithPlace[]>;
  approveImageSubmission(submissionId: string, adminId: string): Promise<PlaceImageSubmission | undefined>;
  rejectImageSubmission(submissionId: string): Promise<boolean>;
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
    // 1. Fetch the pending place to check for images
    const [pendingPlace] = await db
      .select({
        createdBy: places.createdBy,
        imageUrl1: places.imageUrl1,
        imageUrl2: places.imageUrl2,
        imageUrl3: places.imageUrl3,
      })
      .from(places)
      .where(eq(places.id, placeId));

    if (!pendingPlace) return undefined;

    // 2. Approve the place, but clear its image slots (so they don't bypass photo approval)
    const [approvedPlace] = await db
      .update(places)
      .set({
        approved: true,
        approvedBy: adminUserId,
        approvedAt: new Date(),
        imageUrl1: null,
        imageUrl2: null,
        imageUrl3: null,
      })
      .where(eq(places.id, placeId))
      .returning();

    // 3. Submit extracted extracted images to the photo approvals queue
    const imagesToRoute = [pendingPlace.imageUrl1, pendingPlace.imageUrl2, pendingPlace.imageUrl3].filter(Boolean) as string[];

    for (const url of imagesToRoute) {
      // Use the original creator's user ID as the submitter, so it tracks back to them
      await this.submitPlaceImage(placeId, pendingPlace.createdBy, url);
    }

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
    pendingImages: number;
  }> {
    const allPlacesResult = await db.select().from(places);
    const approvedPlacesResult = await db.select().from(places).where(eq(places.approved, true));
    const pendingPlacesResult = await db.select().from(places).where(eq(places.approved, false));
    const pendingImagesResult = await db.select().from(placeImageSubmissions).where(eq(placeImageSubmissions.approved, false));

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
      pendingImages: pendingImagesResult.length,
    };
  }

  // === IMAGE SUBMISSION METHODS ===

  async submitPlaceImage(placeId: string, userId: string, imageUrl: string): Promise<PlaceImageSubmission> {
    const [submission] = await db
      .insert(placeImageSubmissions)
      .values({ placeId, submittedBy: userId, imageUrl } as any)
      .returning();
    return submission;
  }

  async getPendingImageSubmissions(): Promise<PlaceImageSubmissionWithPlace[]> {
    const submissions = await db
      .select()
      .from(placeImageSubmissions)
      .where(eq(placeImageSubmissions.approved, false))
      .orderBy(desc(placeImageSubmissions.submittedAt));

    // Enrich with place name/location
    const enriched = await Promise.all(
      submissions.map(async (sub) => {
        const [place] = await db.select().from(places).where(eq(places.id, sub.placeId));
        return {
          ...sub,
          placeName: place?.name,
          placeLocation: place?.location,
        };
      })
    );

    return enriched;
  }

  async approveImageSubmission(submissionId: string, adminId: string): Promise<PlaceImageSubmission | undefined> {
    // 1. Mark submission as approved
    const [submission] = await db
      .update(placeImageSubmissions)
      .set({ approved: true, approvedBy: adminId, approvedAt: new Date() })
      .where(eq(placeImageSubmissions.id, submissionId))
      .returning();

    if (!submission) return undefined;

    // 2. Copy the URL into the next free imageUrl slot on the parent place
    const [place] = await db.select().from(places).where(eq(places.id, submission.placeId));
    if (place) {
      if (!place.imageUrl1) {
        await db.update(places).set({ imageUrl1: submission.imageUrl }).where(eq(places.id, place.id));
      } else if (!place.imageUrl2) {
        await db.update(places).set({ imageUrl2: submission.imageUrl }).where(eq(places.id, place.id));
      } else if (!place.imageUrl3) {
        await db.update(places).set({ imageUrl3: submission.imageUrl }).where(eq(places.id, place.id));
      }
      // If all 3 slots are full, the image is approved but not displayed (graceful degradation)
    }

    return submission;
  }

  async rejectImageSubmission(submissionId: string): Promise<boolean> {
    const result = await db
      .delete(placeImageSubmissions)
      .where(eq(placeImageSubmissions.id, submissionId))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
