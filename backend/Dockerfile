# Build stage: install all dependencies, generate the Prisma client and compile TypeScript.
FROM node:24-slim AS build
WORKDIR /app

# Copied before the source so the npm ci layer is cached until dependencies change.
# The Prisma files are needed because npm ci runs `prisma generate` (postinstall).
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build

# Run stage: production dependencies and the compiled app only.
# The same image runs the API (node dist/server.js) and the email worker
# (node dist/workers/email.worker.js).
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production

# Prisma's migration engine (used by `npm run db:deploy`) needs OpenSSL, which the slim image lacks.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
# Install scripts must run: they download the migration engine that `prisma migrate deploy` uses.
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY docs ./docs

USER node
EXPOSE 8000
# Node runs directly (not through npm) so it receives SIGTERM itself and can shut down cleanly.
CMD ["node", "dist/server.js"]
