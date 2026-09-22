import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { growthMeasurements } from "../db/schema.js";
import { requireAuth, requireBabyAccess } from "../auth/device-auth.js";
import { broadcastToHousehold } from "../sync/socket.js";

/** FR-010 — dated growth measurements, viewable as a history over time. */
export async function growthRoutes(app: FastifyInstance) {
  app.get<{ Params: { babyId: string } }>(
    "/babies/:babyId/growth",
    { preHandler: [requireAuth, requireBabyAccess] },
    async (request) => {
      const rows = await db.query.growthMeasurements.findMany({
        where: eq(growthMeasurements.babyId, request.params.babyId)
      });
      return { measurements: rows };
    }
  );

  app.post<{
    Params: { babyId: string };
    Body: { id?: string; date: string; weight?: number; length?: number; headCircumference?: number };
  }>("/babies/:babyId/growth", { preHandler: [requireAuth, requireBabyAccess] }, async (request, reply) => {
    const { id, date, weight, length, headCircumference } = request.body;
    if (!date) return reply.code(400).send({ error: "date_required" });

    const [measurement] = await db
      .insert(growthMeasurements)
      .values({
        id: id ?? nanoid(),
        babyId: request.params.babyId,
        date,
        weight,
        length,
        headCircumference,
        loggedByCaregiverId: request.caregiverId!,
        createdAt: new Date()
      })
      .returning();

    broadcastToHousehold(request.params.babyId, {
      entity: "growth_measurement",
      op: "create",
      record: measurement
    });
    return reply.code(201).send(measurement);
  });
}
