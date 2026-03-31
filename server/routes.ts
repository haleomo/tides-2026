import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPhotoSchema, insertMessageSchema, insertEventSchema, insertRsvpSchema, registerUserSchema, loginUserSchema, users } from "@shared/schema";
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

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || (user.role !== "admin" && user.role !== "root")) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

async function requireEditor(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || !["admin", "root", "editor"].includes(user.role)) {
    return res.status(403).json({ message: "Editor access required" });
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
      const { fullName, email, nickname, username, password } = parsed.data;

      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        fullName,
        email,
        nickname: nickname || null,
        role: "member",
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
      res.clearCookie("connect.sid");
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

  app.post("/api/photos", requireAuth, upload.single("photo"), async (req, res) => {
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

  app.post("/api/messages", requireAuth, async (req, res) => {
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

  app.post("/api/events", requireEditor, async (req, res) => {
    try {
      const body = {
        ...req.body,
        eventDate: req.body.eventDate ? new Date(req.body.eventDate) : undefined,
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

  app.get("/api/rsvps", async (_req, res) => {
    const rsvps = await storage.getRsvps();
    res.json(rsvps);
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
      const { role } = req.body;
      if (!["member", "editor"].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'member' or 'editor'." });
      }
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      if (targetUser.role === "admin" || targetUser.role === "root") {
        return res.status(400).json({ message: "Cannot change role of admin accounts" });
      }
      const updated = await storage.updateUserRole(userId, role);
      res.json({ message: `${updated.fullName} is now a ${role}.` });
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
