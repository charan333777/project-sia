import type { ApiError, ApiSuccess } from "@sia/shared";
import type {
  NearbyDuration,
  NearbyIntent,
  NearbyMeetAction,
  NearbyMeetPlanInput,
  NearbyMeetStatusCode,
  NearbyPresenceInput,
  NearbyReportInput,
  NearbySignalAction,
  NearbySnapshot,
  Profile,
  ProfileInput,
  ProfileUpdate,
} from "@sia/validation";

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiRequestError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string) {
  const hasFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      ...(!hasFormData ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = (await response.json()) as ApiSuccess<T> | ApiError;
  if (!response.ok || "error" in body) {
    const error = "error" in body ? body.error : { code: "REQUEST_FAILED", message: "Request failed." };
    throw new ApiRequestError(error.code, error.message, response.status, error.details);
  }
  return body.data;
}

export const api = {
  createProfile: (input: ProfileInput, token: string) =>
    request<Profile>("/profiles", { method: "POST", body: JSON.stringify(input) }, token),
  getMyProfile: (token: string) => request<Profile>("/profiles/me", {}, token),
  updateProfile: (input: ProfileUpdate, token: string) =>
    request<Profile>("/profiles/me", { method: "PATCH", body: JSON.stringify(input) }, token),
  uploadProfilePhoto: (file: Blob, token: string) => {
    const form = new FormData();
    form.append("photo", file, "profile-photo.webp");
    return request<Profile>("/profiles/me/photo", { method: "POST", body: form }, token);
  },
  removeProfilePhoto: (token: string) =>
    request<Profile>("/profiles/me/photo", { method: "DELETE" }, token),
  getPublicProfile: (username: string) =>
    request<Profile>(`/public/profiles/${encodeURIComponent(username)}`, { cache: "no-store" }),
  getNearby: (token: string) => request<NearbySnapshot>("/nearby", { cache: "no-store" }, token),
  updateNearbyPresence: (input: NearbyPresenceInput, token: string) =>
    request<NearbySnapshot>("/nearby/presence", { method: "PUT", body: JSON.stringify(input) }, token),
  hideNearby: (token: string) => request<NearbySnapshot>("/nearby/presence", { method: "DELETE" }, token),
  sendNearbySignal: (targetProfileId: string, intent: NearbyIntent, token: string) =>
    request<NearbySnapshot>("/nearby/signals", { method: "POST", body: JSON.stringify({ target_profile_id: targetProfileId, intent }) }, token),
  respondNearbySignal: (signalId: string, action: NearbySignalAction, token: string) =>
    request<NearbySnapshot>(`/nearby/signals/${signalId}`, { method: "PATCH", body: JSON.stringify({ action }) }, token),
  proposeNearbyMeet: (connectionId: string, input: NearbyMeetPlanInput, token: string) =>
    request<NearbySnapshot>(`/nearby/connections/${connectionId}/meet-plans`, { method: "POST", body: JSON.stringify(input) }, token),
  respondNearbyMeet: (meetPlanId: string, action: NearbyMeetAction, token: string) =>
    request<NearbySnapshot>(`/nearby/meet-plans/${meetPlanId}`, { method: "PATCH", body: JSON.stringify({ action }) }, token),
  sendNearbyMeetStatus: (meetPlanId: string, code: NearbyMeetStatusCode, token: string) =>
    request<NearbySnapshot>(`/nearby/meet-plans/${meetPlanId}/statuses`, { method: "POST", body: JSON.stringify({ code }) }, token),
  blockNearbyProfile: (profileId: string, token: string) =>
    request<NearbySnapshot>(`/nearby/blocks/${profileId}`, { method: "POST" }, token),
  reportNearbyProfile: (input: NearbyReportInput, token: string) =>
    request<{ reported: boolean }>("/nearby/reports", { method: "POST", body: JSON.stringify(input) }, token),
};
