import { api } from "./apiClient.js";

export interface CaregiverSummary {
  caregiverId: string;
  displayName: string;
  status: "active" | "revoked";
}

let cache: Map<string, CaregiverSummary> | null = null;

export async function loadCaregivers(babyId: string, force = false): Promise<CaregiverSummary[]> {
  if (cache && !force) return [...cache.values()];
  const { caregivers } = await api.get<{ caregivers: CaregiverSummary[] }>(`/babies/${babyId}/caregivers`);
  cache = new Map(caregivers.map((c) => [c.caregiverId, c]));
  return caregivers;
}

export function caregiverName(caregiverId: string): string {
  return cache?.get(caregiverId)?.displayName ?? "Someone";
}
