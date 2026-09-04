import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { AuthProvider } from "./auth/auth-provider.js";
import { AppError, unauthorized } from "./errors.js";
import type { ProfileRepository } from "./repositories/profile-repository.js";
import type { NearbyRepository } from "./repositories/nearby-repository.js";
import { ProfileService } from "./services/profile-service.js";
import { MAX_PROFILE_PHOTO_BYTES, type ProfilePhotoStorage } from "./services/profile-photo-storage.js";
import { NearbyService } from "./services/nearby-service.js";
import {
  nearbyIdParamsSchema,
  nearbyMeetActionInputSchema,
  nearbyMeetStatusInputSchema,
  nearbyProfileParamsSchema,
  nearbySignalActionInputSchema,
  profileInputSchema,
  profileStatusInputSchema,
  profileUpdateSchema,
  publicUsernameParamsSchema,
} from "@sia/validation";

export type AppDependencies = {
  authProvider: AuthProvider;
  profileRepository: ProfileRepository;
  nearbyRepository: NearbyRepository;
  profilePhotoStorage?: ProfilePhotoStorage;
  webOrigin?: string;
  logger?: boolean;
};

function bearerToken(header?: string) {
  if (!header?.startsWith("Bearer ")) throw unauthorized();
  const token = header.slice(7).trim();
  if (!token) throw unauthorized();
  return token;
}

function optionalBearerToken(header?: string) {
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

/**
 * Rate limiting counts per signed-in user, not per IP.
 *
 * Sia is used in rooms where everyone shares one network, so an IP bucket throttles a whole
 * meetup as though it were a single person — the situation Nearby exists for. The `sub` claim
 * is read for bucketing only and never trusted: routes still verify the token themselves, so a
 * forged value changes which counter a request lands on and nothing else. Requests without a
 * usable token fall back to the IP bucket, which keeps a ceiling on anonymous traffic.
 */
function rateLimitKey(request: FastifyRequest) {
  const token = optionalBearerToken(request.headers.authorization);
  const parts = token?.split(".");
  if (parts?.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as { sub?: unknown };
      if (typeof payload.sub === "string" && payload.sub.length > 0 && payload.sub.length <= 64) {
        return `u:${payload.sub}`;
      }
    } catch {
      // Unparseable token — fall through to the IP bucket.
    }
  }
  return `ip:${request.ip}`;
}

export async function buildApp(dependencies: AppDependencies) {
  const app = Fastify({ logger: dependencies.logger ?? false });
  const profiles = new ProfileService(dependencies.profileRepository, dependencies.profilePhotoStorage);
  const nearby = new NearbyService(dependencies.nearbyRepository);

  await app.register(cors, {
    origin: dependencies.webOrigin ?? "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  await app.register(helmet);
  await app.register(multipart, {
    limits: { files: 1, fileSize: MAX_PROFILE_PHOTO_BYTES },
  });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute", keyGenerator: rateLimitKey });

  app.addHook("onRequest", async (request, reply) => {
    if (request.url.startsWith("/api/v1/nearby")) {
      reply.header("Cache-Control", "no-store");
      reply.header("Permissions-Policy", "geolocation=(self)");
    }
  });

  async function authenticatedUser(authorization?: string) {
    const identity = await dependencies.authProvider.verifyAccessToken(bearerToken(authorization));
    if (!identity) throw unauthorized();
    return identity;
  }

  app.get("/api/v1/health", async () => ({ data: { status: "ok" } }));

  app.post("/api/v1/profiles", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (request, reply) => {
    const user = await authenticatedUser(request.headers.authorization);
    const input = profileInputSchema.parse(request.body);
    const profile = await profiles.create(user.userId, input);
    return reply.code(201).send({ data: profile });
  });

  app.get("/api/v1/profiles/me", async (request) => {
    const user = await authenticatedUser(request.headers.authorization);
    return { data: await profiles.getMine(user.userId) };
  });

  app.patch("/api/v1/profiles/me", async (request) => {
    const user = await authenticatedUser(request.headers.authorization);
    const input = profileUpdateSchema.parse(request.body);
    return { data: await profiles.updateMine(user.userId, input) };
  });

  app.put("/api/v1/profiles/me/status", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (request) => {
    const user = await authenticatedUser(request.headers.authorization);
    return { data: await profiles.setStatus(user.userId, profileStatusInputSchema.parse(request.body)) };
  });

  app.delete("/api/v1/profiles/me/status", async (request) => {
    const user = await authenticatedUser(request.headers.authorization);
    return { data: await profiles.clearStatus(user.userId) };
  });

  app.post("/api/v1/profiles/me/photo", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request) => {
    const user = await authenticatedUser(request.headers.authorization);
    let file;
    try {
      file = await request.file();
      if (!file) throw new Error("missing file");
      const bytes = await file.toBuffer();
      return { data: await profiles.uploadPhoto(user.userId, bytes) };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(400, "INVALID_PROFILE_PHOTO", "Choose a JPEG, PNG, or WebP photo smaller than 5 MB.");
    }
  });

  app.delete("/api/v1/profiles/me/photo", async (request) => {
    const user = await authenticatedUser(request.headers.authorization);
    return { data: await profiles.removePhoto(user.userId) };
  });

  app.get("/api/v1/public/profiles/:username", async (request) => {
    const { username } = publicUsernameParamsSchema.parse(request.params);
    return { data: await profiles.getPublic(username) };
  });

  app.get("/api/v1/nearby", async (request) => {
    const user = await authenticatedUser(request.headers.authorization);
    return { data: await nearby.snapshot(user.userId) };
  });

  app.put("/api/v1/nearby/presence", { config: { rateLimit: { max: 40, timeWindow: "1 minute" } } }, async (request) => {
    const user = await authenticatedUser(request.headers.authorization);
    return { data: await nearby.updatePresence(user.userId, request.body) };
  });

  app.delete("/api/v1/nearby/presence", async (request) => {
    const user = await authenticatedUser(request.headers.authorization);
    return { data: await nearby.hide(user.userId) };
  });

  app.post("/api/v1/nearby/signals", { config: { rateLimit: { max: 12, timeWindow: "1 minute" } } }, async (request) => {
    const user = await authenticatedUser(request.headers.authorization);
    return { data: await nearby.sendSignal(user.userId, request.body) };
  });

  app.patch("/api/v1/nearby/signals/:id", async (request) => {
    const user = await authenticatedUser(request.headers.authorization);
    const { id } = nearbyIdParamsSchema.parse(request.params);
    const { action } = nearbySignalActionInputSchema.parse(request.body);
    return { data: await nearby.respondToSignal(user.userId, id, action) };
  });

  app.post("/api/v1/nearby/connections/:id/meet-plans", async (request) => {
    const user = await authenticatedUser(request.headers.authorization);
    const { id } = nearbyIdParamsSchema.parse(request.params);
    return { data: await nearby.proposeMeeting(user.userId, id, request.body) };
  });

  app.patch("/api/v1/nearby/meet-plans/:id", async (request) => {
    const user = await authenticatedUser(request.headers.authorization);
    const { id } = nearbyIdParamsSchema.parse(request.params);
    const { action } = nearbyMeetActionInputSchema.parse(request.body);
    return { data: await nearby.respondToMeeting(user.userId, id, action) };
  });

  app.post("/api/v1/nearby/meet-plans/:id/statuses", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (request) => {
    const user = await authenticatedUser(request.headers.authorization);
    const { id } = nearbyIdParamsSchema.parse(request.params);
    const { code } = nearbyMeetStatusInputSchema.parse(request.body);
    return { data: await nearby.addMeetingStatus(user.userId, id, code) };
  });

  app.post("/api/v1/nearby/blocks/:profileId", async (request) => {
    const user = await authenticatedUser(request.headers.authorization);
    const { profileId } = nearbyProfileParamsSchema.parse(request.params);
    return { data: await nearby.block(user.userId, profileId) };
  });

  app.post("/api/v1/nearby/reports", { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } }, async (request) => {
    const user = await authenticatedUser(request.headers.authorization);
    return { data: await nearby.report(user.userId, request.body) };
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ error: { code: "NOT_FOUND", message: "That endpoint does not exist." } });
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: { code: "VALIDATION_ERROR", message: "Please check the information you entered.", details: error.flatten().fieldErrors },
      });
    }
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
      });
    }
    // @fastify/rate-limit throws a plain error carrying a status code rather than an AppError.
    // Without this branch a throttled client is told the server broke, gets no signal to back
    // off, and every throttle is logged as an unhandled fault.
    if ((error as { statusCode?: unknown }).statusCode === 429) {
      return reply.code(429).send({
        error: { code: "RATE_LIMITED", message: "That’s a lot of requests. Give it a moment and try again." },
      });
    }
    request.log.error({ err: error }, "Unhandled request error");
    return reply.code(500).send({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } });
  });

  return app;
}
