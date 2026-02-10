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
  // Approval workflow fields
  approved: boolean("approved").default(false).notNull(),
  approvedBy: varchar("approved_by"), // Links to admin user ID (nullable)
  approvedAt: timestamp("approved_at"), // Nullable
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
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  userId: true,
  placeId: true,
  createdAt: true
}).extend({
  rating: z.number().min(1).max(5),
});

// === EXPLICIT API CONTRACT TYPES ===

export type Place = typeof places.$inferSelect;
export type InsertPlace = z.infer<typeof insertPlaceSchema>;

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
