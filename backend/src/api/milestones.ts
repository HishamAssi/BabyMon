import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { db } from "../db/index.js";
import { milestones } from "../db/schema.js";
import { requireAuth, requireBabyAccess } from "../auth/device-auth.js";
import { broadcastToHousehold } from "../sync/socket.js";

const uploadsDir = path.resolve("data", "uploads", "milestones");

/** FR-011 — dated milestones with an optional photo, stored locally (FR-015: never an external CDN). */
export async function milestoneRoutes(app: FastifyInstance) {
  app.get<{ Params: { babyId: string } }>(
    "/babies/:babyId/milestones",
    { preHandler: [requireAuth, requireBabyAccess] },
    async (request) => {
      const rows = await db.query.milestones.findMany({ where: eq(milestones.babyId, request.params.babyId) });
      return { milestones: rows };
    }
  );

  app.post<{ Params: { babyId: string }; Body: { id?: string; date: string; description: string } }>(
    "/babies/:babyId/milestones",
    { preHandler: [requireAuth, requireBabyAccess] },
    async (request, reply) => {
      const { id, date, description } = request.body;
      if (!date || !description?.trim()) return reply.code(400).send({ error: "date_and_description_required" });

      const [milestone] = await db
        .insert(milestones)
        .values({
          id: id ?? nanoid(),
          babyId: request.params.babyId,
          date,
          description: description.trim(),
          photoRef: null,
          loggedByCaregiverId: request.caregiverId!,
          createdAt: new Date()
        })
        .returning();

      broadcastToHousehold(request.params.babyId, { entity: "milestone", op: "create", record: milestone });
      return reply.code(201).send(milestone);
    }
  );

  app.post<{ Params: { babyId: string; id: string } }>(
    "/babies/:babyId/milestones/:id/photo",
    { preHandler: [requireAuth, requireBabyAccess] },
    async (request, reply) => {
      const file = await request.file();
      if (!file) return reply.code(400).send({ error: "no_file" });

      await mkdir(uploadsDir, { recursive: true });
      const ext = path.extname(file.filename) || ".jpg";
      const filename = `${request.params.id}${ext}`;
      await pipeline(file.file, createWriteStream(path.join(uploadsDir, filename)));

      const photoRef = `/uploads/milestones/${filename}`;
      const [updated] = await db
        .update(milestones)
        .set({ photoRef })
        .where(eq(milestones.id, request.params.id))
        .returning();

      broadcastToHousehold(request.params.babyId, { entity: "milestone", op: "update", record: updated });
      return updated;
    }
  );
}
