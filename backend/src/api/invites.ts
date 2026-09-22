import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { babyProfiles, caregivers, caregiverDevices, caregiverBabyAccess, inviteCodes } from "../db/schema.js";
import { generateInviteCode, generateDeviceToken, hashToken } from "../auth/tokens.js";
import { requireAuth, requireBabyAccess } from "../auth/device-auth.js";
import { config } from "../config.js";
import { broadcastToHousehold } from "../sync/socket.js";

type InviteMode = "new_caregiver" | "add_device";

/**
 * Shared by the authenticated POST /invites/:babyId route and by the
 * unauthenticated first-run setup flow (backend/src/api/setup.ts).
 */
export async function createInviteCode(
  babyId: string,
  mode: InviteMode,
  opts: { createdByCaregiverId?: string; targetCaregiverId?: string } = {}
) {
  const now = new Date();
  const expiresAt =
    mode === "new_caregiver"
      ? new Date(now.getTime() + config.inviteExpiryDays * 24 * 60 * 60 * 1000)
      : null; // add_device codes are reusable until explicitly revoked

  const [invite] = await db
    .insert(inviteCodes)
    .values({
      id: nanoid(),
      babyId,
      code: generateInviteCode(),
      mode,
      targetCaregiverId: opts.targetCaregiverId,
      createdByCaregiverId: opts.createdByCaregiverId,
      status: "active",
      expiresAt,
      createdAt: now
    })
    .returning();

  return invite;
}

export async function inviteRoutes(app: FastifyInstance) {
  // FR-003, FR-023 — create an invite for an existing baby profile.
  app.post<{ Params: { babyId: string }; Body: { mode: InviteMode; targetCaregiverId?: string } }>(
    "/invites/:babyId",
    { preHandler: [requireAuth, requireBabyAccess] },
    async (request, reply) => {
      const { mode, targetCaregiverId } = request.body;
      if (mode === "add_device" && !targetCaregiverId) {
        return reply.code(400).send({ error: "target_caregiver_required" });
      }
      const invite = await createInviteCode(request.params.babyId, mode, {
        createdByCaregiverId: request.caregiverId,
        targetCaregiverId
      });
      return { code: invite.code, shareUrl: `/join/${invite.code}`, expiresAt: invite.expiresAt };
    }
  );

  // FR-020, FR-022, FR-023 — redeem an invite (no auth: this IS how a device authenticates).
  // T047 — rate-limited since this endpoint is unauthenticated and codes are guessable-length.
  app.post<{ Params: { code: string }; Body: { displayName?: string } }>(
    "/invites/:code/redeem",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const invite = await db.query.inviteCodes.findFirst({
        where: eq(inviteCodes.code, request.params.code)
      });

      if (!invite || invite.status === "revoked" || invite.status === "expired") {
        return reply.code(404).send({ error: "invalid_invite" });
      }
      if (invite.mode === "new_caregiver" && invite.status === "redeemed") {
        return reply.code(410).send({ error: "invite_already_used" });
      }
      if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
        await db.update(inviteCodes).set({ status: "expired" }).where(eq(inviteCodes.id, invite.id));
        return reply.code(410).send({ error: "invite_expired" });
      }

      const now = new Date();
      let caregiverId: string;

      if (invite.mode === "new_caregiver") {
        if (!request.body?.displayName?.trim()) {
          return reply.code(400).send({ error: "display_name_required" });
        }
        const baby = await db.query.babyProfiles.findFirst({ where: eq(babyProfiles.id, invite.babyId) });
        if (!baby) return reply.code(404).send({ error: "baby_not_found" });

        const [caregiver] = await db
          .insert(caregivers)
          .values({
            id: nanoid(),
            householdId: baby.householdId,
            displayName: request.body.displayName.trim(),
            createdAt: now
          })
          .returning();
        caregiverId = caregiver.id;

        await db
          .insert(caregiverBabyAccess)
          .values({ caregiverId, babyId: invite.babyId, status: "active", joinedAt: now });

        await db.update(inviteCodes).set({ status: "redeemed" }).where(eq(inviteCodes.id, invite.id));
      } else {
        // add_device: link a new device to the SAME existing caregiver identity (FR-023).
        if (!invite.targetCaregiverId) {
          return reply.code(400).send({ error: "invite_missing_target" });
        }
        caregiverId = invite.targetCaregiverId;

        const existingAccess = await db.query.caregiverBabyAccess.findFirst({
          where: and(
            eq(caregiverBabyAccess.caregiverId, caregiverId),
            eq(caregiverBabyAccess.babyId, invite.babyId)
          )
        });
        if (!existingAccess) {
          await db
            .insert(caregiverBabyAccess)
            .values({ caregiverId, babyId: invite.babyId, status: "active", joinedAt: now });
        }
      }

      const deviceToken = generateDeviceToken();
      await db.insert(caregiverDevices).values({
        id: nanoid(),
        caregiverId,
        deviceTokenHash: hashToken(deviceToken),
        label: null,
        createdAt: now,
        lastSeenAt: now
      });

      return { deviceToken, caregiverId, babyId: invite.babyId };
    }
  );

  // FR-004 — revoke a caregiver's access; history stays attributed to them.
  app.delete<{ Params: { babyId: string; caregiverId: string } }>(
    "/babies/:babyId/caregivers/:caregiverId",
    { preHandler: [requireAuth, requireBabyAccess] },
    async (request) => {
      await db
        .update(caregiverBabyAccess)
        .set({ status: "revoked" })
        .where(
          and(
            eq(caregiverBabyAccess.caregiverId, request.params.caregiverId),
            eq(caregiverBabyAccess.babyId, request.params.babyId)
          )
        );
      broadcastToHousehold(request.params.babyId, {
        entity: "caregiver_access",
        op: "update",
        record: { caregiverId: request.params.caregiverId, babyId: request.params.babyId, status: "revoked" }
      });
      return { revoked: true };
    }
  );

  // List active caregivers for a baby (used by the caregiver-management UI, T031).
  app.get<{ Params: { babyId: string } }>(
    "/babies/:babyId/caregivers",
    { preHandler: [requireAuth, requireBabyAccess] },
    async (request) => {
      const rows = await db
        .select({ caregiverId: caregivers.id, displayName: caregivers.displayName, status: caregiverBabyAccess.status })
        .from(caregiverBabyAccess)
        .innerJoin(caregivers, eq(caregivers.id, caregiverBabyAccess.caregiverId))
        .where(eq(caregiverBabyAccess.babyId, request.params.babyId));
      return { caregivers: rows };
    }
  );
}
