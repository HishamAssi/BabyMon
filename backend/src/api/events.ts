import type { FastifyInstance } from "fastify";
import { eq, and, gt } from "drizzle-orm";
import { db } from "../db/index.js";
import { careEvents } from "../db/schema.js";
import { requireAuth, requireBabyAccess } from "../auth/device-auth.js";
import { broadcastToHousehold } from "../sync/socket.js";

type CareEventType = "feed" | "diaper" | "sleep" | "pumping";

export async function eventRoutes(app: FastifyInstance) {
  // FR-001, FR-005, FR-018 — idempotent by client-supplied id so offline
  // retries never create duplicates, and two concurrent creates both survive.
  app.post<{
    Params: { babyId: string };
    Body: { id: string; type: CareEventType; startTime: string; endTime?: string; notes?: string };
  }>("/babies/:babyId/events", { preHandler: [requireAuth, requireBabyAccess] }, async (request, reply) => {
    const { id, type, startTime, endTime, notes } = request.body;
    if (!id || !type || !startTime) {
      return reply.code(400).send({ error: "id_type_startTime_required" });
    }

    const existing = await db.query.careEvents.findFirst({ where: eq(careEvents.id, id) });
    if (existing) {
      return reply.code(200).send(existing); // idempotent replay — no-op success
    }

    const now = new Date();
    const [event] = await db
      .insert(careEvents)
      .values({
        id,
        babyId: request.params.babyId,
        type,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        loggedByCaregiverId: request.caregiverId!,
        lastModifiedByCaregiverId: request.caregiverId!,
        notes,
        deletedAt: null,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    broadcastToHousehold(request.params.babyId, { entity: "care_event", op: "create", record: event });
    return reply.code(201).send(event);
  });

  // FR-006 — edit (e.g. close an in-progress sleep session, fix a mistake).
  app.patch<{
    Params: { babyId: string; eventId: string };
    Body: { endTime?: string; notes?: string; startTime?: string };
  }>("/babies/:babyId/events/:eventId", { preHandler: [requireAuth, requireBabyAccess] }, async (request, reply) => {
    const existing = await db.query.careEvents.findFirst({
      where: and(eq(careEvents.id, request.params.eventId), eq(careEvents.babyId, request.params.babyId))
    });
    if (!existing || existing.deletedAt) return reply.code(404).send({ error: "not_found" });

    const now = new Date();
    const { endTime, notes, startTime } = request.body;
    const [updated] = await db
      .update(careEvents)
      .set({
        ...(endTime !== undefined ? { endTime: new Date(endTime) } : {}),
        ...(startTime !== undefined ? { startTime: new Date(startTime) } : {}),
        ...(notes !== undefined ? { notes } : {}),
        lastModifiedByCaregiverId: request.caregiverId!,
        updatedAt: now
      })
      .where(eq(careEvents.id, request.params.eventId))
      .returning();

    broadcastToHousehold(request.params.babyId, { entity: "care_event", op: "update", record: updated });
    return updated;
  });

  app.delete<{ Params: { babyId: string; eventId: string } }>(
    "/babies/:babyId/events/:eventId",
    { preHandler: [requireAuth, requireBabyAccess] },
    async (request) => {
      const now = new Date();
      const [tombstoned] = await db
        .update(careEvents)
        .set({ deletedAt: now, lastModifiedByCaregiverId: request.caregiverId!, updatedAt: now })
        .where(eq(careEvents.id, request.params.eventId))
        .returning();

      broadcastToHousehold(request.params.babyId, { entity: "care_event", op: "delete", record: tombstoned });
      return { deleted: true };
    }
  );

  // FR-002 — initial load and reconnect catch-up (the WebSocket channel pushes live updates).
  app.get<{ Params: { babyId: string }; Querystring: { since?: string } }>(
    "/babies/:babyId/events",
    { preHandler: [requireAuth, requireBabyAccess] },
    async (request) => {
      const since = request.query.since ? new Date(Number(request.query.since)) : new Date(0);
      const events = await db.query.careEvents.findMany({
        where: and(eq(careEvents.babyId, request.params.babyId), gt(careEvents.updatedAt, since))
      });
      return { events, cursor: Date.now().toString() };
    }
  );
}
