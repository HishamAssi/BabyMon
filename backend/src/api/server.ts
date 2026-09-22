import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import fastifyMultipart from "@fastify/multipart";
import fastifyRateLimit from "@fastify/rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";
import { setupRoutes } from "./setup.js";
import { babyRoutes } from "./babies.js";
import { eventRoutes } from "./events.js";
import { inviteRoutes } from "./invites.js";
import { growthRoutes } from "./growth.js";
import { milestoneRoutes } from "./milestones.js";
import { reminderRoutes } from "./reminders.js";
import { registerSyncSocket } from "../sync/socket.js";

export function buildServer() {
  const app = Fastify({ logger: true });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const status = error.statusCode ?? 500;
    reply.code(status).send({
      error: status === 500 ? "internal_error" : error.message
    });
  });

  app.get("/health", async () => ({ status: "ok" }));

  // T046 — structured request logging (household-scale traffic; kept lightweight).
  app.addHook("onResponse", (request, reply, done) => {
    request.log.info(
      { method: request.method, url: request.url, statusCode: reply.statusCode, durationMs: reply.elapsedTime },
      "request completed"
    );
    done();
  });

  app.register(fastifyRateLimit, { global: false }); // per-route limits only (see invites.ts)
  app.register(fastifyWebsocket);
  app.register(fastifyMultipart);
  app.register(fastifyStatic, {
    root: path.resolve("data", "uploads"),
    prefix: "/uploads/",
    decorateReply: false
  });
  app.register(setupRoutes, { prefix: "/api" });
  app.register(babyRoutes, { prefix: "/api" });
  app.register(eventRoutes, { prefix: "/api" });
  app.register(inviteRoutes, { prefix: "/api" });
  app.register(growthRoutes, { prefix: "/api" });
  app.register(milestoneRoutes, { prefix: "/api" });
  app.register(reminderRoutes, { prefix: "/api" });
  registerSyncSocket(app);

  // Serve the built PWA as static assets (deploy/docker-compose.yml single-container setup).
  const frontendDist = path.resolve(fileURLToPath(import.meta.url), "../../../../frontend/dist");
  app.register(fastifyStatic, { root: frontendDist });
  app.setNotFoundHandler((request, reply) => {
    if (request.raw.url?.startsWith("/api") || request.raw.url?.startsWith("/sync")) {
      return reply.code(404).send({ error: "not_found" });
    }
    return reply.sendFile("index.html");
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = buildServer();
  app.listen({ port: config.port, host: config.host }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}
