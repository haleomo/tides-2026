import { db } from "./db";
import { messages, events } from "@shared/schema";
import { log } from "console";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  try {
    const [{ count: msgCount }] = await db.select({ count: sql<number>`count(*)` }).from(messages);
    const [{ count: evtCount }] = await db.select({ count: sql<number>`count(*)` }).from(events);

    if (Number(msgCount) === 0) {
      await db.insert(messages).values([
        {
          author: "Rob Nelson",
          content: "Newly implemented App for Sharing Maui Linkup?",
        },        
      ]);
      log("Seeded messages", "seed");
    }

    if (Number(evtCount) === 0) {
      await db.insert(events).values([
        {
          title: "RSVP Deadline",
          description: "Last day to confirm your attendance for the Grad Trip trip. Please let the organizing committee know if you're coming!",
          eventDate: new Date("2026-04-15"),
          location: "Online",
          category: "deadline",
        },
      ]);
      log("Seeded events", "seed");
    }
  } catch (error) {
    console.error("Seed error:", error);
  }
}
