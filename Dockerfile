# Single self-hostable container: builds the frontend PWA and the backend
# API/sync server, then runs the backend which also serves the built PWA
# as static assets (see backend/src/api/server.ts).

FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:20-slim AS backend-build
WORKDIR /app/backend
# better-sqlite3 needs build tools to compile its native addon.
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npm run build

FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY --from=backend-build /app/backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/src/db/migrations ./backend/src/db/migrations
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

ENV DB_PATH=/data/babymon.sqlite
ENV PORT=3000
EXPOSE 3000
VOLUME ["/data"]

WORKDIR /app/backend
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/api/server.js"]
