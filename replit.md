# tides Class of 2016 - Maui Trip Connect

## Overview
A community hub app for the tides Class of 2016 alumni Grad Trip trip. Members can upload photos, send group messages, and view important trip dates/events. Themed in red and black with the tides logo branding.

## Recent Changes
- 2026-02-10: Added editor role, event creation form, role management (promote/demote to editor)
- 2026-02-10: Added admin features - password reset, delete photos/messages/events, admin user management page
- 2026-02-10: Made login optional - app browsable without auth; photo upload and chat require login; fixed registration form fields
- 2026-02-10: Added login/registration system with session-based auth, admin accounts (admin/root), user menu in header
- 2026-02-09: Added RSVP page with attendance status, travel dates, accommodation & transportation preferences
- 2026-02-08: Initial build - full-stack app with photos, messages, events, sidebar navigation, dark mode

## Project Architecture
- **Frontend**: React + Vite + TypeScript, Shadcn UI components, Wouter routing, TanStack Query
- **Backend**: Express.js with REST API
- **Database**: PostgreSQL (Drizzle ORM)
- **Auth**: Session-based (express-session + connect-pg-simple), bcryptjs for password hashing
- **File uploads**: Multer (stored in /uploads directory)
- **Theme**: Red/black color scheme (hue 0 CSS variables)

## Key Files
- `shared/schema.ts` - Data models (users, photos, messages, events, rsvps)
- `server/routes.ts` - API endpoints (auth, photos, messages, events, rsvps)
- `server/storage.ts` - Database storage layer
- `server/seed.ts` - Seed data for messages, events, and admin accounts
- `client/src/App.tsx` - Main app with sidebar layout (no auth gate, browsable by guests)
- `client/src/lib/auth.tsx` - Auth context/provider with login, register, logout
- `client/src/pages/auth.tsx` - Login/registration page
- `client/src/components/user-menu.tsx` - User avatar dropdown menu in header
- `client/src/pages/admin.tsx` - Admin user management page (password resets, role changes, user removal)
- `client/src/pages/` - Home, Photos, Messages, Events, RSVP, About pages
- `client/src/components/app-sidebar.tsx` - Navigation sidebar

## Auth System
- Login/registration is optional for browsing; required for uploading photos and sending messages
- Auth page at /auth route (supports ?mode=register query param)
- Registration: fullName, email, nickname, username, password
- Login: username + password
- Admin accounts: "admin" and "root" (seeded without passwords, set password on first login)
- Users table: id (uuid), username, password (nullable), fullName, email, nickname, role (member/editor/admin/root), needsPasswordSetup
- Roles: member (default), editor (can add events), admin/root (full access)
- Session stored in PostgreSQL via connect-pg-simple
- Header shows Sign In/Register buttons when not logged in, user avatar when logged in

## API Routes
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login (also handles admin first-login password setup)
- POST `/api/auth/logout` - Logout
- GET `/api/auth/me` - Current session user
- GET `/api/photos` - Photo gallery (public)
- POST `/api/photos` - Upload photo (requires auth, multipart form)
- GET `/api/messages` - Group messages (public)
- POST `/api/messages` - Send message (requires auth)
- GET `/api/events` - Trip events (public)
- POST `/api/events` - Create event (admin/root/editor only)
- DELETE `/api/photos/:id` - Delete photo (admin only)
- DELETE `/api/messages/:id` - Delete message (admin only)
- DELETE `/api/events/:id` - Delete event (admin only)
- GET `/api/admin/users` - List all users (admin only)
- POST `/api/admin/reset-password/:userId` - Reset user password (admin only)
- DELETE `/api/admin/users/:userId` - Remove user (admin only)
- POST `/api/admin/change-role/:userId` - Change user role to member/editor (admin only)
- GET/POST `/api/rsvps` - RSVP responses (attendance, travel, accommodation, transportation)

## User Preferences
- Red and black theme (tides school colors)
- tides logo from attached_assets
