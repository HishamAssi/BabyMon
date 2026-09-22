import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import { eq, and, gt } from "drizzle-orm";
import { db } from "../db/index.js";
import { caregiverDevices, caregiverBabyAccess, careEvents } from "../db/schema.js";
import { hashToken } from "../auth/tokens.js";

type SyncMessage = {
  entity: "care_event" | "growth_measurement" | "milestone" | "reminder" | "caregiver_access";
  op: "create" | "update" | "delete";
  record: unknown;
  cursor?: string;
};

interface Connection {
  socket: WebSocket;
  caregiverId: string;
}

const connections = new Set<Connection>();

async function caregiverHasAccess(caregiverId: string, babyId: string): Promise<boolean> {
  const access = await db.query.caregiverBabyAccess.findFirst({
    where: and(
      eq(caregiverBabyAccess.caregiverId, caregiverId),
      eq(caregiverBabyAccess.babyId, babyId),
      eq(caregiverBabyAccess.status, "active")
    )
  });
  return Boolean(access);
}

/** Called by route handlers (events.ts, invites.ts, ...) after a successful write. */
export function broadcastToHousehold(babyId: string, message: SyncMessage) {
  for (const conn of connections) {
    caregiverHasAccess(conn.caregiverId, babyId).then((allowed) => {
      if (allowed && conn.socket.readyState === conn.socket.OPEN) {
        conn.socket.send(JSON.stringify(message));
      }
    });
  }
}

async function sendCatchUp(socket: WebSocket, caregiverId: string, since: number) {
  const accessRows = await db.query.caregiverBabyAccess.findMany({
    where: and(eq(caregiverBabyAccess.caregiverId, caregiverId), eq(caregiverBabyAccess.status, "active"))
  });
  const babyIds = accessRows.map((r) => r.babyId);

  for (const babyId of babyIds) {
    const events = await db.query.careEvents.findMany({
      where: and(eq(careEvents.babyId, babyId), gt(careEvents.updatedAt, new Date(since)))
    });
    for (const event of events) {
      const message: SyncMessage = {
        entity: "care_event",
        op: event.deletedAt ? "delete" : "create",
        record: event
      };
      socket.send(JSON.stringify(message));
    }
  }
}

export function registerSyncSocket(app: FastifyInstance) {
  app.get<{ Querystring: { token?: string; since?: string } }>(
    "/sync",
    { websocket: true },
    async (connection, request) => {
      const socket = connection.socket as WebSocket;
      const { token, since } = request.query;

      if (!token) {
        socket.close(4001, "missing_token");
        return;
      }
      const device = await db.query.caregiverDevices.findFirst({
        where: eq(caregiverDevices.deviceTokenHash, hashToken(token))
      });
      if (!device) {
        socket.close(4001, "invalid_token");
        return;
      }

      const conn: Connection = { socket, caregiverId: device.caregiverId };
      connections.add(conn);

      await sendCatchUp(socket, device.caregiverId, since ? Number(since) : 0);

      // Allows a client to push a queued offline write immediately rather than
      // waiting for its next REST retry (contracts/api.md "Real-time Sync Channel").
      socket.on("message", (raw: Buffer) => {
        request.log.info({ msg: raw.toString() }, "sync client message (informational; writes go via REST)");
      });

      socket.on("close", () => connections.delete(conn));
    }
  );
}
