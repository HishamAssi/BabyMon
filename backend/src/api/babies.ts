import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { babyProfiles, caregiverBabyAccess, households } from "../db/schema.js";
import { requireAuth } from "../auth/device-auth.js";

/**
 * FR-009 — a household may have more than one baby profile. This wasn't
 * broken out as its own tasks.md task (an oversight from /speckit-tasks);
 * folded into Foundational since every story needs at least one baby to
 * operate against.
 */
export async function babyRoutes(app: FastifyInstance) {
  app.get("/babies", { preHandler: requireAuth }, async (request) => {
    const rows = await db
      .select({ id: babyProfiles.id, name: babyProfiles.name, birthdate: babyProfiles.birthdate })
      .from(babyProfiles)
      .innerJoin(caregiverBabyAccess, eq(caregiverBabyAccess.babyId, babyProfiles.id))
      .where(
        and(eq(caregiverBabyAccess.caregiverId, request.caregiverId!), eq(caregiverBabyAccess.status, "active"))
      );
    return { babies: rows };
  });

  app.post<{ Body: { name: string; birthdate: string } }>(
    "/babies",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { name, birthdate } = request.body;
      if (!name?.trim() || !birthdate) {
        return reply.code(400).send({ error: "name_and_birthdate_required" });
      }
      const household = await db.query.households.findFirst();
      if (!household) return reply.code(409).send({ error: "not_set_up" });

      const now = new Date();
      const [baby] = await db
        .insert(babyProfiles)
        .values({ id: nanoid(), householdId: household.id, name: name.trim(), birthdate, createdAt: now })
        .returning();

      await db
        .insert(caregiverBabyAccess)
        .values({ caregiverId: request.caregiverId!, babyId: baby.id, status: "active", joinedAt: now });

      return reply.code(201).send(baby);
    }
  );
}
