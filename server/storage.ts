import {
  type User, type InsertUser,
  type Photo, type InsertPhoto,
  type Message, type InsertMessage,
  type Event, type InsertEvent,
  type Rsvp, type InsertRsvp,
  users, photos, messages, events, rsvps,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: string, hashedPassword: string): Promise<User>;
  deleteUser(id: string): Promise<void>;
  updateUserRole(id: string, role: string): Promise<User>;
  getPhotos(): Promise<Photo[]>;
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  deletePhoto(id: number): Promise<void>;
  getMessages(): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(id: number): Promise<void>;
  getEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  deleteEvent(id: number): Promise<void>;
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

  async getEvents(): Promise<Event[]> {
    return db.select().from(events).orderBy(events.eventDate);
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [created] = await db.insert(events).values(event).returning();
    return created;
  }

  async deleteEvent(id: number): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
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
