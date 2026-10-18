# Production multi-stage Dockerfile for Nuxt 3 (Node 22)
FROM node:22-bullseye-slim AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8 --silent

# Copy package manifests first to leverage cache
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile --silent

# Copy source and build
COPY . .
RUN pnpm build --silent

# Runtime image
FROM node:22-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built output
COPY --from=builder /app/.output /app/.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
