# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

---

## Tech stack (this project)
- Framework: Nuxt 3 (Vue 3, Nitro)
- Runtime: Node.js 22 (containerized)
- Package manager: pnpm (Corepack)
- Database (optional local dev): Postgres (via Docker Compose)
- Dev tooling: Docker / Docker Compose for local development

## Quickstart — Development (Docker Compose)
1. Copy example env and adjust if needed:

```bash
cp .env.example .env
# Edit .env to confirm POSTGRES_* values
```

2. Start development environment (build + hot-reload):

```bash
docker compose up --build
# or (older syntax)
docker-compose up --build
```

3. Open the app in your browser:

- http://localhost:3000

4. Useful commands:

- Tail logs: `docker compose logs -f app` or `docker compose logs -f db`
- Enter app container: `docker compose exec app sh`
- Stop and remove containers: `docker compose down`
- Remove volumes (clears DB): `docker compose down -v`

Notes:
- The app service uses `node:22-alpine` and runs `corepack enable && pnpm install && pnpm dev` for local development with hot reload.
- Do not commit `.env` (contains secrets). Use `.env.example` as template.
- For production builds the included `Dockerfile` uses a multi-stage build and Node 22 to produce a runnable image.

---

