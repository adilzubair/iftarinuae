import { pgTable, text, serial, integer, boolean, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Export auth models so they are included in the schema
export * from "./models/auth";

// === TABLE DEFINITIONS ===

export const places = pgTable("places", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location").notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  createdBy: varchar("created_by").notNull(), // Links to user ID
  createdAt: timestamp("created_at").defaultNow(),
  // Images (up to 3 Cloudinary URLs per place)
  imageUrl1: text("image_url_1"),
  imageUrl2: text("image_url_2"),
  imageUrl3: text("image_url_3"),
  // Approval workflow fields
  approved: boolean("approved").default(false).notNull(),
  approvedBy: varchar("approved_by"), // Links to admin user ID (nullable)
  approvedAt: timestamp("approved_at"), // Nullable
});

// === PLACE IMAGE SUBMISSIONS (pending admin approval) ===

export const placeImageSubmissions = pgTable("place_image_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  placeId: uuid("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  submittedBy: varchar("submitted_by").notNull(), // user ID
  submittedAt: timestamp("submitted_at").defaultNow(),
  // Approval workflow
  approved: boolean("approved").default(false).notNull(),
  approvedBy: varchar("approved_by"), // admin user ID (nullable)
  approvedAt: timestamp("approved_at"), // nullable
});

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  placeId: uuid("place_id").notNull().references(() => places.id),
  userId: varchar("user_id").notNull(), // Links to user ID
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const placesRelations = relations(places, ({ many }) => ({
  reviews: many(reviews),
  imageSubmissions: many(placeImageSubmissions),
}));

export const placeImageSubmissionsRelations = relations(placeImageSubmissions, ({ one }) => ({
  place: one(places, {
    fields: [placeImageSubmissions.placeId],
    references: [places.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  place: one(places, {
    fields: [reviews.placeId],
    references: [places.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertPlaceSchema = createInsertSchema(places).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  approved: true,
  approvedBy: true,
  approvedAt: true,
}).extend({
  // All three image fields are optional Cloudinary URLs
  imageUrl1: z.string().url().nullable().optional(),
  imageUrl2: z.string().url().nullable().optional(),
  imageUrl3: z.string().url().nullable().optional(),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  userId: true,
  placeId: true,
  createdAt: true
}).extend({
  rating: z.number().min(1).max(5),
});

export const insertPlaceImageSubmissionSchema = createInsertSchema(placeImageSubmissions).omit({
  id: true,
  submittedBy: true,
  submittedAt: true,
  approved: true,
  approvedBy: true,
  approvedAt: true,
}).extend({
  imageUrl: z.string().url(),
});

// === EXPLICIT API CONTRACT TYPES ===

export type Place = typeof places.$inferSelect;
export type InsertPlace = z.infer<typeof insertPlaceSchema>;

export type PlaceImageSubmission = typeof placeImageSubmissions.$inferSelect;
export type InsertPlaceImageSubmission = z.infer<typeof insertPlaceImageSubmissionSchema>;

export type PlaceImageSubmissionWithPlace = PlaceImageSubmission & {
  placeName?: string;
  placeLocation?: string;
};

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type CreatePlaceRequest = InsertPlace;
export type CreateReviewRequest = InsertReview;

export type PlaceWithReviews = Place & {
  reviews: Review[];
  averageRating?: number; // Calculated on backend or frontend
  reviewCount?: number;
};

export type PlaceResponse = PlaceWithReviews;
export type PlacesListResponse = PlaceWithReviews[];

export type PlaceWithDistance = PlaceWithReviews & {
  distance?: number;
};
