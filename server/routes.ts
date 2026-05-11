import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPhotoSchema, insertMessageSchema, insertEventSchema, insertRecommendationSchema, insertRecommendationCommentSchema, insertRsvpSchema, registerUserSchema, loginUserSchema, users, roleSchema, type Role } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

function requireRole(allowedRoles: Role[], message: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const parsedRole = roleSchema.safeParse(user.role);
    if (!parsedRole.success || !allowedRoles.includes(parsedRole.data)) {
      return res.status(403).json({ message });
    }
    next();
  };
}

const requireAdmin = requireRole(["admin"], "Admin access required");
const requireEditor = requireRole(["admin", "editor"], "Editor access required");
const requireContributor = requireRole(["admin", "editor", "contributor"], "Contributor access required");

async function requireEventEditor(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (user.role === "admin" || user.role === "editor") {
    return next();
  }

  const eventId = Number(req.params.id);
  if (Number.isNaN(eventId)) {
    return res.status(400).json({ message: "Invalid event ID" });
  }

  const event = await storage.getEvent(eventId);
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  if (event.createdByUserId !== user.id) {
    return res.status(403).json({ message: "Event edit access required" });
  }

  next();
}

async function requireRecommendationEditor(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (user.role === "admin" || user.role === "editor") {
    return next();
  }

  const recommendationId = Number(req.params.id);
  if (Number.isNaN(recommendationId)) {
    return res.status(400).json({ message: "Invalid recommendation ID" });
  }

  const recommendation = await storage.getRecommendation(recommendationId);
  if (!recommendation) {
    return res.status(404).json({ message: "Recommendation not found" });
  }

  if (recommendation.createdByUserId !== user.id) {
    return res.status(403).json({ message: "Recommendation edit access required" });
  }

  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const { fullName, email, mobileNumber, nickname, username, password } = parsed.data;

      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const userCount = await storage.countUsers();
      const assignedRole: Role = userCount === 0 ? "admin" : "viewer";

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        fullName,
        email,
        mobileNumber,
        nickname: nickname || null,
        role: assignedRole,
        needsPasswordSetup: false,
      });

      req.session.userId = user.id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
      });
      res.status(201).json({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        nickname: user.nickname,
        role: user.role,
        needsPasswordSetup: user.needsPasswordSetup,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const { username, password } = parsed.data;

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      if (user.needsPasswordSetup) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await storage.updateUserPassword(user.id, hashedPassword);

        req.session.userId = user.id;
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => (err ? reject(err) : resolve()));
        });
        return res.json({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          mobileNumber: user.mobileNumber,
          nickname: user.nickname,
          role: user.role,
          needsPasswordSetup: false,
          message: "Password set successfully",
        });
      }

      if (!user.password) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      req.session.userId = user.id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
      });
      res.json({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        nickname: user.nickname,
        role: user.role,
        needsPasswordSetup: user.needsPasswordSetup,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to log out" });
      }
      res.clearCookie("tides.sid");
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      mobileNumber: user.mobileNumber,
      nickname: user.nickname,
      role: user.role,
      needsPasswordSetup: user.needsPasswordSetup,
    });
  });

  app.use("/uploads", (req, res, next) => {
    const filePath = path.join(uploadDir, path.basename(req.path));
    res.sendFile(filePath, (err) => {
      if (err) next();
    });
  });

  app.get("/api/photos", async (_req, res) => {
    const photos = await storage.getPhotos();
    res.json(photos);
  });

  app.post("/api/photos", requireContributor, upload.single("photo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      const parsed = insertPhotoSchema.safeParse({
        title: req.body.title,
        description: req.body.description || null,
        imageUrl,
        uploadedBy: req.body.uploadedBy,
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid photo data" });
      }
      const photo = await storage.createPhoto(parsed.data);
      res.status(201).json(photo);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/messages", async (_req, res) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  app.post("/api/messages", requireContributor, async (req, res) => {
    try {
      const parsed = insertMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid message data" });
      }
      const message = await storage.createMessage(parsed.data);
      res.status(201).json(message);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/events", async (_req, res) => {
    const events = await storage.getEvents();
    res.json(events);
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const event = await storage.getEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const photos = await storage.getPhotosByEventId(id);
      res.json({ ...event, photos });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/events", requireEditor, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const body = {
        ...req.body,
        eventDate: req.body.eventDate ? new Date(req.body.eventDate) : undefined,
        createdByUserId: currentUser.id,
        createdByName: currentUser.fullName,
      };
      const parsed = insertEventSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid event data" });
      }
      const event = await storage.createEvent(parsed.data);
      res.status(201).json(event);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/events/:id", requireEventEditor, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const existingEvent = await storage.getEvent(id);
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }

      const body = {
        title: req.body.title ?? existingEvent.title,
        description: req.body.description ?? existingEvent.description,
        eventDate: req.body.eventDate ? new Date(req.body.eventDate) : existingEvent.eventDate,
        location: req.body.location ?? existingEvent.location,
        category: req.body.category ?? existingEvent.category,
      };

      const parsed = insertEventSchema.partial().safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid event data" });
      }

      const updated = await storage.updateEvent(id, parsed.data);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/events/:id/photos", requireAuth, upload.single("photo"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const event = await storage.getEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const imageUrl = `/uploads/${req.file.filename}`;
      const uploadedBy = req.body.uploadedBy || "Event attendee";
      const parsed = insertPhotoSchema.safeParse({
        title: req.body.title || event.title,
        description: req.body.description || null,
        imageUrl,
        uploadedBy,
        eventId: id,
      });

      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid photo data" });
      }

      const photo = await storage.createPhoto(parsed.data);
      res.status(201).json(photo);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/recommendations", requireAuth, async (_req, res) => {
    try {
      const recommendations = await storage.getRecommendations();
      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/recommendations/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid recommendation ID" });
      }

      const recommendation = await storage.getRecommendation(id);
      if (!recommendation) {
        return res.status(404).json({ message: "Recommendation not found" });
      }

      const comments = await storage.getRecommendationComments(id);
      const photos = await storage.getPhotosByRecommendationId(id);
      res.json({ ...recommendation, comments, photos });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/recommendations", requireEditor, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const body = {
        ...req.body,
        createdByUserId: currentUser.id,
        createdByName: currentUser.fullName,
      };
      const parsed = insertRecommendationSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid recommendation data" });
      }

      const recommendation = await storage.createRecommendation(parsed.data);
      res.status(201).json(recommendation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/recommendations/:id", requireRecommendationEditor, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid recommendation ID" });
      }

      const existingRecommendation = await storage.getRecommendation(id);
      if (!existingRecommendation) {
        return res.status(404).json({ message: "Recommendation not found" });
      }

      const body = {
        title: req.body.title ?? existingRecommendation.title,
        description: req.body.description ?? existingRecommendation.description,
        location: req.body.location ?? existingRecommendation.location,
        type: req.body.type ?? existingRecommendation.type,
      };

      const parsed = insertRecommendationSchema.partial().safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid recommendation data" });
      }

      const updated = await storage.updateRecommendation(id, parsed.data);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/recommendations/:id", requireRecommendationEditor, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid recommendation ID" });
      }

      const recommendation = await storage.getRecommendation(id);
      if (!recommendation) {
        return res.status(404).json({ message: "Recommendation not found" });
      }

      await storage.deleteRecommendation(id);
      res.json({ message: "Recommendation deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/recommendations/:id/comments", requireContributor, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid recommendation ID" });
      }

      const recommendation = await storage.getRecommendation(id);
      if (!recommendation) {
        return res.status(404).json({ message: "Recommendation not found" });
      }

      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const parsed = insertRecommendationCommentSchema.safeParse({
        recommendationId: id,
        authorUserId: currentUser.id,
        authorName: currentUser.fullName,
        content: req.body.content,
      });

      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid comment data" });
      }

      const comment = await storage.createRecommendationComment(parsed.data);
      res.status(201).json(comment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/recommendations/:id/photos", requireContributor, upload.single("photo"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid recommendation ID" });
      }

      const recommendation = await storage.getRecommendation(id);
      if (!recommendation) {
        return res.status(404).json({ message: "Recommendation not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const imageUrl = `/uploads/${req.file.filename}`;
      const parsed = insertPhotoSchema.safeParse({
        title: req.body.title || recommendation.title,
        description: req.body.description || null,
        imageUrl,
        uploadedBy: req.body.uploadedBy || currentUser.fullName,
        recommendationId: id,
      });

      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid photo data" });
      }

      const photo = await storage.createPhoto(parsed.data);
      res.status(201).json(photo);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/recommendations/:id/photos/:photoId", requireEditor, async (req, res) => {
    try {
      const recommendationId = Number(req.params.id);
      const photoId = Number(req.params.photoId);
      if (Number.isNaN(recommendationId) || Number.isNaN(photoId)) {
        return res.status(400).json({ message: "Invalid recommendation or photo ID" });
      }

      const recommendation = await storage.getRecommendation(recommendationId);
      if (!recommendation) {
        return res.status(404).json({ message: "Recommendation not found" });
      }

      const recommendationPhotos = await storage.getPhotosByRecommendationId(recommendationId);
      const targetPhoto = recommendationPhotos.find((photo) => photo.id === photoId);
      if (!targetPhoto) {
        return res.status(404).json({ message: "Photo not found for this recommendation" });
      }

      await storage.deletePhoto(photoId);
      res.json({ message: "Recommendation photo deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/rsvps", async (_req, res) => {
    const rsvps = await storage.getRsvps();
    res.json(rsvps);
  });

  app.get("/api/rsvp-users", async (_req, res) => {
    try {
      const allUsers = await storage.getUsers();
      const rsvpUsers = allUsers
        .map((user) => ({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          mobileNumber: user.mobileNumber,
        }))
        .sort((left, right) => left.fullName.localeCompare(right.fullName));

      res.json(rsvpUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/rsvps", async (req, res) => {
    try {
      const parsed = insertRsvpSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid RSVP data" });
      }
      const rsvp = await storage.createRsvp(parsed.data);
      res.status(201).json(rsvp);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getUsers();
      res.json(allUsers.map(u => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        mobileNumber: u.mobileNumber,
        nickname: u.nickname,
        role: u.role,
        needsPasswordSetup: u.needsPasswordSetup,
      })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/reset-password/:userId", requireAdmin, async (req, res) => {
    try {
      const userId = req.params.userId as string;
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      await storage.updateUserPassword(userId, "");
      await db.update(users).set({ needsPasswordSetup: true }).where(eq(users.id, userId));
      res.json({ message: "Password reset successfully. User will set a new password on next login." });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/change-role/:userId", requireAdmin, async (req, res) => {
    try {
      const userId = req.params.userId as string;
      if (userId === req.session.userId) {
        return res.status(400).json({ message: "You cannot change your own role." });
      }
      const parsedRole = roleSchema.safeParse(req.body?.role);
      if (!parsedRole.success) {
        return res.status(400).json({ message: "Invalid role. Must be one of: admin, editor, contributor, viewer." });
      }

      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const updated = await storage.updateUserRole(userId, parsedRole.data);
      res.json({ message: `${updated.fullName} is now a ${parsedRole.data}.` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/users/:userId", requireAdmin, async (req, res) => {
    try {
      const userId = req.params.userId as string;
      if (userId === req.session.userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      await storage.deleteUser(userId);
      res.json({ message: `User "${targetUser.fullName}" has been removed.` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/photos/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid photo ID" });
      await storage.deletePhoto(id);
      res.json({ message: "Photo deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/messages/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid message ID" });
      await storage.deleteMessage(id);
      res.json({ message: "Message deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/events/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid event ID" });
      await storage.deleteEvent(id);
      res.json({ message: "Event deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
