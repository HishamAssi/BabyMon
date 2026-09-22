import type { FastifyInstance } from "fastify";
import { eq, and, gt } from "drizzle-orm";
import { db } from "../db/index.js";
import { careEvents } from "../db/schema.js";
import { requireAuth, requireBabyAccess } from "../auth/device-auth.js";
import { broadcastToHousehold } from "../sync/socket.js";

type CareEventType = "feed" | "diaper" | "sleep" | "pumping";
type FeedType = "breastfeed" | "formula";
type DiaperContents = "pee" | "poop" | "both";

interface DetailFields {
  feedType?: FeedType | null;
  amountOz?: number | null;
  diaperContents?: DiaperContents | null;
}

/**
 * 002-care-event-details — shared create/edit validation for the type-specific
 * detail fields (data-model.md "Validation rules"). `type` is the event's
 * (immutable) type; `merged` is what the row's detail fields would be *after*
 * applying whatever was supplied on this request.
 */
function validateDetailFields(type: CareEventType, merged: DetailFields): string | null {
  if (type === "feed") {
    if (!merged.feedType) return "feedType_required_for_feed";
    if (merged.feedType === "breastfeed" && merged.amountOz != null) {
      return "amountOz_not_allowed_for_breastfeed";
    }
  }
  if (type === "diaper" && !merged.diaperContents) {
    return "diaperContents_required_for_diaper";
  }
  if (merged.amountOz != null && (typeof merged.amountOz !== "number" || merged.amountOz <= 0)) {
    return "amountOz_must_be_a_positive_number";
  }
  return null;
}

/** Detail fields are only meaningful for the types that use them (data-model.md). */
function normalizeForType(type: CareEventType, fields: DetailFields): DetailFields {
  if (type === "feed") return { feedType: fields.feedType ?? null, amountOz: fields.amountOz ?? null };
  if (type === "pumping") return { amountOz: fields.amountOz ?? null };
  if (type === "diaper") return { diaperContents: fields.diaperContents ?? null };
  return {};
}

export async function eventRoutes(app: FastifyInstance) {
  // FR-001, FR-005, FR-018 — idempotent by client-supplied id so offline
  // retries never create duplicates, and two concurrent creates both survive.
  app.post<{
    Params: { babyId: string };
    Body: {
      id: string;
      type: CareEventType;
      startTime: string;
      endTime?: string;
      notes?: string;
    } & DetailFields;
  }>("/babies/:babyId/events", { preHandler: [requireAuth, requireBabyAccess] }, async (request, reply) => {
    const { id, type, startTime, endTime, notes, feedType, amountOz, diaperContents } = request.body;
    if (!id || !type || !startTime) {
      return reply.code(400).send({ error: "id_type_startTime_required" });
    }

    const existing = await db.query.careEvents.findFirst({ where: eq(careEvents.id, id) });
    if (existing) {
      return reply.code(200).send(existing); // idempotent replay — no-op success
    }

    const detail = normalizeForType(type, { feedType, amountOz, diaperContents });
    const validationError = validateDetailFields(type, detail);
    if (validationError) {
      return reply.code(400).send({ error: validationError });
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
        ...detail,
        deletedAt: null,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    broadcastToHousehold(request.params.babyId, { entity: "care_event", op: "create", record: event });
    return reply.code(201).send(event);
  });

  // FR-006, FR-010 — edit (e.g. close an in-progress sleep session, fix a mistake,
  // correct a feed/diaper's recorded detail).
  app.patch<{
    Params: { babyId: string; eventId: string };
    Body: { endTime?: string; notes?: string; startTime?: string } & DetailFields;
  }>("/babies/:babyId/events/:eventId", { preHandler: [requireAuth, requireBabyAccess] }, async (request, reply) => {
    const existing = await db.query.careEvents.findFirst({
      where: and(eq(careEvents.id, request.params.eventId), eq(careEvents.babyId, request.params.babyId))
    });
    if (!existing || existing.deletedAt) return reply.code(404).send({ error: "not_found" });

    const now = new Date();
    const { endTime, notes, startTime, feedType, amountOz, diaperContents } = request.body;

    const detailSupplied = feedType !== undefined || amountOz !== undefined || diaperContents !== undefined;
    let detail: DetailFields = {};
    if (detailSupplied) {
      const merged = normalizeForType(existing.type as CareEventType, {
        feedType: feedType !== undefined ? feedType : (existing.feedType as FeedType | null),
        amountOz: amountOz !== undefined ? amountOz : existing.amountOz,
        diaperContents: diaperContents !== undefined ? diaperContents : (existing.diaperContents as DiaperContents | null)
      });
      // Switching a feed to breastfeed clears any previously-recorded amount (contracts/api.md).
      if (merged.feedType === "breastfeed") merged.amountOz = null;

      const validationError = validateDetailFields(existing.type as CareEventType, merged);
      if (validationError) {
        return reply.code(400).send({ error: validationError });
      }
      detail = merged;
    }

    const [updated] = await db
      .update(careEvents)
      .set({
        ...(endTime !== undefined ? { endTime: new Date(endTime) } : {}),
        ...(startTime !== undefined ? { startTime: new Date(startTime) } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...detail,
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
