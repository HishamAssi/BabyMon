const DEVICE_TOKEN_KEY = "babymon.deviceToken";
const CAREGIVER_ID_KEY = "babymon.caregiverId";
const ACTIVE_BABY_ID_KEY = "babymon.activeBabyId";

export function getDeviceToken(): string | null {
  return localStorage.getItem(DEVICE_TOKEN_KEY);
}

export function getCaregiverId(): string | null {
  return localStorage.getItem(CAREGIVER_ID_KEY);
}

export function getActiveBabyId(): string | null {
  return localStorage.getItem(ACTIVE_BABY_ID_KEY);
}

export function setActiveBabyId(babyId: string) {
  localStorage.setItem(ACTIVE_BABY_ID_KEY, babyId);
}

/** Persists the identity returned by a successful invite redemption (FR-020/022). */
export function storeDeviceIdentity(deviceToken: string, caregiverId: string, babyId: string) {
  localStorage.setItem(DEVICE_TOKEN_KEY, deviceToken);
  localStorage.setItem(CAREGIVER_ID_KEY, caregiverId);
  setActiveBabyId(babyId);
}

export function clearDeviceIdentity() {
  localStorage.removeItem(DEVICE_TOKEN_KEY);
  localStorage.removeItem(CAREGIVER_ID_KEY);
  localStorage.removeItem(ACTIVE_BABY_ID_KEY);
}

export function isJoined(): boolean {
  return Boolean(getDeviceToken());
}

class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown
  ) {
    super(`API error ${status}`);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getDeviceToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`/api${path}`, { ...init, headers });
  const body = await res.json().catch(() => undefined);
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" })
};
