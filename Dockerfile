# Production multi-stage Dockerfile for Nuxt 3 (Node 22)
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8 --silent

# Copy package manifests first to leverage cache
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --silent

# Copy source and build (cloudflare-pages preset)
COPY . .
RUN NITRO_PRESET=cloudflare-pages pnpm build --silent

# Runtime image
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Ensure CA certificates (required by workerd / wrangler for TLS)
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy built dist (cloudflare-pages output)
# Note: Cloudflare preset generates dist (worker + static) rather than .output
COPY --from=builder /app/dist /app/dist

EXPOSE 3000
CMD ["sh","-c","if [ -f /app/.output/server/index.mjs ]; then node /app/.output/server/index.mjs; elif [ -d /app/dist ]; then npx -y http-server /app/dist -p 3000; else echo 'No server or dist found' >&2; exit 1; fi"]
