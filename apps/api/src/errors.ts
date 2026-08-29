export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const unauthorized = () => new AppError(401, "UNAUTHORIZED", "Please log in to continue.");
export const profileNotFound = () => new AppError(404, "PROFILE_NOT_FOUND", "We couldn't find that Sia profile.");
