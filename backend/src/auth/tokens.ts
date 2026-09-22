import { createHash, randomBytes } from "node:crypto";
import { customAlphabet } from "nanoid";

const inviteAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
export const generateInviteCode = customAlphabet(inviteAlphabet, 8);

export function generateDeviceToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
