# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM node:22-alpine AS runner

ENV NODE_ENV=dev
WORKDIR /app

# Only install production dependencies that were externalised by esbuild
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built artefacts from builder
COPY --from=builder /app/dist ./dist

# Uploads directory – will be overridden by the bind mount at runtime,
# but the directory must exist for the image to start cleanly without a mount.
RUN mkdir -p /app/uploads

EXPOSE 5033
CMD ["node", "dist/index.cjs"]
