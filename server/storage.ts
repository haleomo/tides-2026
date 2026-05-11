import {
  type User, type InsertUser,
  type Photo, type InsertPhoto,
  type Message, type InsertMessage,
  type MessageComment, type InsertMessageComment,
  type Event, type InsertEvent,
  type Recommendation, type InsertRecommendation,
  type RecommendationComment, type InsertRecommendationComment,
  type Rsvp, type InsertRsvp,
  users, photos, messages, messageComments, events, recommendations, recommendationComments, rsvps,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  countUsers(): Promise<number>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: string, hashedPassword: string): Promise<User>;
  deleteUser(id: string): Promise<void>;
  updateUserRole(id: string, role: string): Promise<User>;
  getPhotos(): Promise<Photo[]>;
  getPhotosByEventId(eventId: number): Promise<Photo[]>;
  getPhotosByRecommendationId(recommendationId: number): Promise<Photo[]>;
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  deletePhoto(id: number): Promise<void>;
  getMessages(): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(id: number): Promise<void>;
  getMessageComments(messageId: number): Promise<MessageComment[]>;
  createMessageComment(comment: InsertMessageComment): Promise<MessageComment>;
  deleteMessageComment(id: number): Promise<void>;
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: number): Promise<void>;
  getRecommendations(): Promise<Recommendation[]>;
  getRecommendation(id: number): Promise<Recommendation | undefined>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  updateRecommendation(id: number, recommendation: Partial<InsertRecommendation>): Promise<Recommendation>;
  deleteRecommendation(id: number): Promise<void>;
  getRecommendationComments(recommendationId: number): Promise<RecommendationComment[]>;
  createRecommendationComment(comment: InsertRecommendationComment): Promise<RecommendationComment>;
  getRsvps(): Promise<Rsvp[]>;
  createRsvp(rsvp: InsertRsvp): Promise<Rsvp>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async countUsers(): Promise<number> {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users);
    return Number(count);
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ password: hashedPassword, needsPasswordSetup: false })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await db.update(users).set({ role }).where(eq(users.id, id)).returning();
    return user;
  }

  async getPhotos(): Promise<Photo[]> {
    return db.select().from(photos).orderBy(desc(photos.createdAt));
  }

  async getPhotosByEventId(eventId: number): Promise<Photo[]> {
    return db.select().from(photos).where(eq(photos.eventId, eventId)).orderBy(desc(photos.createdAt));
  }

  async getPhotosByRecommendationId(recommendationId: number): Promise<Photo[]> {
    return db.select().from(photos).where(eq(photos.recommendationId, recommendationId)).orderBy(desc(photos.createdAt));
  }

  async createPhoto(photo: InsertPhoto): Promise<Photo> {
    const [created] = await db.insert(photos).values(photo).returning();
    return created;
  }

  async deletePhoto(id: number): Promise<void> {
    await db.delete(photos).where(eq(photos.id, id));
  }

  async getMessages(): Promise<Message[]> {
    return db.select().from(messages).orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  async deleteMessage(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
  }

  async getMessageComments(messageId: number): Promise<MessageComment[]> {
    return db.select().from(messageComments).where(eq(messageComments.messageId, messageId)).orderBy(messageComments.createdAt);
  }

  async createMessageComment(comment: InsertMessageComment): Promise<MessageComment> {
    const [created] = await db.insert(messageComments).values(comment).returning();
    return created;
  }

  async deleteMessageComment(id: number): Promise<void> {
    await db.delete(messageComments).where(eq(messageComments.id, id));
  }

  async getEvents(): Promise<Event[]> {
    return db.select().from(events).orderBy(events.eventDate);
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [created] = await db.insert(events).values(event).returning();
    return created;
  }

  async updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event> {
    const [updated] = await db.update(events).set(event).where(eq(events.id, id)).returning();
    return updated;
  }

  async deleteEvent(id: number): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  async getRecommendations(): Promise<Recommendation[]> {
    return db.select().from(recommendations).orderBy(desc(recommendations.createdAt));
  }

  async getRecommendation(id: number): Promise<Recommendation | undefined> {
    const [recommendation] = await db.select().from(recommendations).where(eq(recommendations.id, id));
    return recommendation;
  }

  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const [created] = await db.insert(recommendations).values(recommendation).returning();
    return created;
  }

  async updateRecommendation(id: number, recommendation: Partial<InsertRecommendation>): Promise<Recommendation> {
    const [updated] = await db.update(recommendations).set(recommendation).where(eq(recommendations.id, id)).returning();
    return updated;
  }

  async deleteRecommendation(id: number): Promise<void> {
    await db.delete(recommendations).where(eq(recommendations.id, id));
  }

  async getRecommendationComments(recommendationId: number): Promise<RecommendationComment[]> {
    return db.select().from(recommendationComments).where(eq(recommendationComments.recommendationId, recommendationId)).orderBy(desc(recommendationComments.createdAt));
  }

  async createRecommendationComment(comment: InsertRecommendationComment): Promise<RecommendationComment> {
    const [created] = await db.insert(recommendationComments).values(comment).returning();
    return created;
  }

  async getRsvps(): Promise<Rsvp[]> {
    return db.select().from(rsvps).orderBy(desc(rsvps.createdAt));
  }

  async createRsvp(rsvp: InsertRsvp): Promise<Rsvp> {
    const [created] = await db.insert(rsvps).values(rsvp).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
