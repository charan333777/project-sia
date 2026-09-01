import type { ApiError, ApiSuccess } from "@sia/shared";
import type { Profile, ProfileInput, ProfileUpdate } from "@sia/validation";

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
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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
  getPublicProfile: (username: string) =>
    request<Profile>(`/public/profiles/${encodeURIComponent(username)}`, { cache: "no-store" }),
};
