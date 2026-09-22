import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { households, babyProfiles } from "../db/schema.js";
import { createInviteCode } from "./invites.js";

/**
 * First-run bootstrap (T010): before any Household exists, an unauthenticated
 * caller may create the household + first baby profile + first invite. Once a
 * Household row exists, this route refuses further calls — a self-hosted
 * instance belongs to exactly one household (Clarifications, 2026-09-21).
 */
export async function setupRoutes(app: FastifyInstance) {
  app.get("/setup/status", async () => {
    const existing = await db.query.households.findFirst();
    return { needsSetup: !existing };
  });

  app.post<{ Body: { householdName?: string; babyName: string; babyBirthdate: string } }>(
    "/setup",
    async (request, reply) => {
      const existing = await db.query.households.findFirst();
      if (existing) {
        return reply.code(409).send({ error: "already_set_up" });
      }

      const { householdName, babyName, babyBirthdate } = request.body;
      if (!babyName?.trim() || !babyBirthdate) {
        return reply.code(400).send({ error: "baby_name_and_birthdate_required" });
      }

      const now = new Date();
      const [household] = await db
        .insert(households)
        .values({ id: nanoid(), name: householdName?.trim() || null, createdAt: now })
        .returning();

      const [baby] = await db
        .insert(babyProfiles)
        .values({
          id: nanoid(),
          householdId: household.id,
          name: babyName.trim(),
          birthdate: babyBirthdate,
          createdAt: now
        })
        .returning();

      const invite = await createInviteCode(baby.id, "new_caregiver");

      return {
        householdId: household.id,
        babyId: baby.id,
        invite: { code: invite.code, shareUrl: `/join/${invite.code}`, expiresAt: invite.expiresAt }
      };
    }
  );
}
