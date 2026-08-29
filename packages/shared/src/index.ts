export type ApiSuccess<T> = { data: T };
export type ApiError = { error: { code: string; message: string; details?: unknown } };

export const PROFILE_DRAFT_KEY = "sia-profile-draft";
