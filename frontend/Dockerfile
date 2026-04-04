FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ── Development stage (Vite dev server) ──────────────────────
FROM base AS dev
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ── Production build stage ────────────────────────────────────
FROM base AS builder
RUN npm install
COPY . .
RUN npm run build

# ── Production serve via nginx ────────────────────────────────
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
