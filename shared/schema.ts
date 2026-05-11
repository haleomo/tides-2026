import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleValues = ["admin", "editor", "contributor", "viewer"] as const;
export const roleSchema = z.enum(roleValues);
export type Role = z.infer<typeof roleSchema>;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password"),
  fullName: text("full_name").notNull().unique(),
  email: text("email").notNull().unique(),
  mobileNumber: text("mobile_number").notNull().unique(),
  nickname: text("nickname"),
  role: text("role").notNull().default("viewer"),
  needsPasswordSetup: boolean("needs_password_setup").notNull().default(false),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const registerUserSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email is required"),
  mobileNumber: z.string().min(7, "Mobile number is required"),
  nickname: z.string().optional(),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  eventId: integer("event_id"),
  recommendationId: integer("recommendation_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  createdAt: true,
});

export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = typeof photos.$inferSelect;

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  author: text("author").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const messageComments = pgTable("message_comments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull(),
  authorUserId: varchar("author_user_id"),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMessageCommentSchema = createInsertSchema(messageComments).omit({
  id: true,
  createdAt: true,
});

export type InsertMessageComment = z.infer<typeof insertMessageCommentSchema>;
export type MessageComment = typeof messageComments.$inferSelect;

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  eventDate: timestamp("event_date").notNull(),
  location: text("location"),
  category: text("category").notNull().default("general"),
  createdByUserId: varchar("created_by_user_id"),
  createdByName: text("created_by_name"),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdByUserId: true,
  createdByName: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export const recommendationTypeValues = ["restaurant", "coffee shop", "activity", "shopping", "drive", "hike", "beach", "foods", "attraction", "park"] as const;
export const recommendationTypeSchema = z.enum(recommendationTypeValues);

export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull().default(""),
  type: text("type").notNull(),
  createdByUserId: varchar("created_by_user_id"),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
  createdByUserId: true,
  createdByName: true,
}).extend({
  type: recommendationTypeSchema,
});

export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;

export const recommendationComments = pgTable("recommendation_comments", {
  id: serial("id").primaryKey(),
  recommendationId: integer("recommendation_id").notNull(),
  authorUserId: varchar("author_user_id"),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRecommendationCommentSchema = createInsertSchema(recommendationComments).omit({
  id: true,
  createdAt: true,
});

export type InsertRecommendationComment = z.infer<typeof insertRecommendationCommentSchema>;
export type RecommendationComment = typeof recommendationComments.$inferSelect;

export const rsvps = pgTable("rsvps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  mobileNumber: text("mobile_number"),
  status: text("status").notNull(),
  arrivalDate: text("arrival_date"),
  departureDate: text("departure_date"),
  accommodation: text("accommodation"),
  transportation: text("transportation"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRsvpSchema = createInsertSchema(rsvps).omit({
  id: true,
  createdAt: true,
});

export type InsertRsvp = z.infer<typeof insertRsvpSchema>;
export type Rsvp = typeof rsvps.$inferSelect;
