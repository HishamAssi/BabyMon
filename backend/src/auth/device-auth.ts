import type { FastifyReply, FastifyRequest } from "fastify";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { caregiverDevices, caregiverBabyAccess } from "../db/schema.js";
import { hashToken } from "./tokens.js";

declare module "fastify" {
  interface FastifyRequest {
    caregiverId?: string;
  }
}

/**
 * Resolves the Authorization: Bearer <device token> header to a Caregiver
 * identity (FR-020/FR-022). Attaches `request.caregiverId` on success.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    return reply.code(401).send({ error: "missing_token" });
  }

  const tokenHash = hashToken(token);
  const device = await db.query.caregiverDevices.findFirst({
    where: eq(caregiverDevices.deviceTokenHash, tokenHash)
  });

  if (!device) {
    return reply.code(401).send({ error: "invalid_token" });
  }

  request.caregiverId = device.caregiverId;

  await db
    .update(caregiverDevices)
    .set({ lastSeenAt: new Date() })
    .where(eq(caregiverDevices.id, device.id));
}

/**
 * Ensures the authenticated caregiver has ACTIVE access to :babyId.
 * Call after requireAuth, on any route with a babyId path param.
 */
export async function requireBabyAccess(request: FastifyRequest, reply: FastifyReply) {
  const babyId = (request.params as { babyId?: string }).babyId;
  if (!request.caregiverId || !babyId) {
    return reply.code(400).send({ error: "missing_baby_id" });
  }

  const access = await db.query.caregiverBabyAccess.findFirst({
    where: and(
      eq(caregiverBabyAccess.caregiverId, request.caregiverId),
      eq(caregiverBabyAccess.babyId, babyId),
      eq(caregiverBabyAccess.status, "active")
    )
  });

  if (!access) {
    return reply.code(403).send({ error: "no_access" });
  }
}
