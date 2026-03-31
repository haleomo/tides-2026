import { db } from "./db";
import { messages, events, users } from "@shared/schema";
import { sql } from "drizzle-orm";
import { log } from "./index";

async function seedAdminAccounts() {
  const [{ count: userCount }] = await db.select({ count: sql<number>`count(*)` }).from(users);
  if (Number(userCount) > 0) {
    return;
  }

  const adminAccounts = [
    { username: "admin", fullName: "Site Administrator", email: "admin@tides2016.com" },
    { username: "root", fullName: "System Administrator", email: "root@tides2016.com" },
  ];

  for (const admin of adminAccounts) {
    await db.insert(users).values({
      username: admin.username,
      password: null,
      fullName: admin.fullName,
      email: admin.email,
      nickname: null,
      role: "admin",
      needsPasswordSetup: true,
    });
    log(`Seeded admin account: ${admin.username}`, "seed");
  }
}

export async function seedDatabase() {
  try {
    await seedAdminAccounts();

    const [{ count: msgCount }] = await db.select({ count: sql<number>`count(*)` }).from(messages);
    const [{ count: evtCount }] = await db.select({ count: sql<number>`count(*)` }).from(events);

    if (Number(msgCount) === 0) {
      await db.insert(messages).values([
        {
          author: "Linda Thompson",
          content: "Can't wait to see everyone at the Grad Trip! It's been way too long. Who's flying in from out of state?",
        },
        {
          author: "Robert Wilson",
          content: "Count me in! Coming all the way from Florida. Does anyone remember Coach Henderson's halftime speeches?",
        },
        {
          author: "Patricia Garcia",
          content: "This is going to be amazing! I've been looking through my old yearbook and found some great photos to share.",
        },
        {
          author: "James Mitchell",
          content: "Hey tides! Just booked my hotel room. Looking forward to catching up with the whole gang. Go tides!",
        },
        {
          author: "Susan Clark",
          content: "I'll be bringing my famous potato salad to the picnic. Same recipe from the class potlucks back in the day!",
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
        {
          title: "Hotel Booking Cutoff",
          description: "Reserve your room at the Gig Harbor Grand Hotel before the group rate expires. Use code tides2016 for the discount.",
          eventDate: new Date("2026-05-01"),
          location: "Gig Harbor Grand Hotel",
          category: "deadline",
        },
        {
          title: "Welcome Mixer",
          description: "Kick off the Grad Trip with drinks and appetizers at the waterfront pavilion. Casual attire. Bring your yearbooks!",
          eventDate: new Date("2026-06-12"),
          location: "Waterfront Pavilion, Gig Harbor",
          category: "social",
        },
        {
          title: "Harbor Boat Tour",
          description: "Scenic guided tour around the harbor. Learn about the history of Gig Harbor and enjoy the beautiful views together.",
          eventDate: new Date("2026-06-13"),
          location: "Gig Harbor Marina",
          category: "activity",
        },
        {
          title: "Class Picnic & BBQ",
          description: "A full day of fun at Sehmel Homestead Park with BBQ, games, and plenty of time to catch up with old friends.",
          eventDate: new Date("2026-06-14"),
          location: "Sehmel Homestead Park",
          category: "social",
        },
        {
          title: "Farewell Dinner",
          description: "Formal dinner at the Tides Tavern to close out our Grad Trip trip. Share your favorite memories from the weekend.",
          eventDate: new Date("2026-06-15"),
          location: "The Tides Tavern",
          category: "social",
        },
      ]);
      log("Seeded events", "seed");
    }
  } catch (error) {
    console.error("Seed error:", error);
  }
}
