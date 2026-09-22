import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { reminders, type CareEventType } from "../db/schema.js";
import { requireAuth, requireBabyAccess } from "../auth/device-auth.js";
import { computeDueAt } from "../sync/reminders.js";

type ReminderEventType = CareEventType | "medicine";

/** FR-017 — recurring reminder intervals; due-time is always recomputed, never stored statically. */
export async function reminderRoutes(app: FastifyInstance) {
  app.get<{ Params: { babyId: string } }>(
    "/babies/:babyId/reminders",
    { preHandler: [requireAuth, requireBabyAccess] },
    async (request) => {
      const rows = await db.query.reminders.findMany({ where: eq(reminders.babyId, request.params.babyId) });
      const withDueAt = await Promise.all(
        rows
          .filter((r) => r.active)
          .map(async (r) => ({
            ...r,
            dueAt: await computeDueAt(r.babyId, r.eventType as ReminderEventType, r.intervalMinutes, r.createdAt)
          }))
      );
      return { reminders: withDueAt };
    }
  );

  app.post<{ Params: { babyId: string }; Body: { eventType: ReminderEventType; intervalMinutes: number } }>(
    "/babies/:babyId/reminders",
    { preHandler: [requireAuth, requireBabyAccess] },
    async (request, reply) => {
      const { eventType, intervalMinutes } = request.body;
      if (!eventType || !intervalMinutes || intervalMinutes <= 0) {
        return reply.code(400).send({ error: "eventType_and_positive_intervalMinutes_required" });
      }
      const [reminder] = await db
        .insert(reminders)
        .values({
          id: nanoid(),
          babyId: request.params.babyId,
          eventType,
          intervalMinutes,
          createdByCaregiverId: request.caregiverId!,
          active: true,
          createdAt: new Date()
        })
        .returning();
      return reply.code(201).send(reminder);
    }
  );

  app.patch<{ Params: { babyId: string; id: string }; Body: { intervalMinutes?: number; active?: boolean } }>(
    "/babies/:babyId/reminders/:id",
    { preHandler: [requireAuth, requireBabyAccess] },
    async (request) => {
      const [updated] = await db
        .update(reminders)
        .set(request.body)
        .where(eq(reminders.id, request.params.id))
        .returning();
      return updated;
    }
  );
}
