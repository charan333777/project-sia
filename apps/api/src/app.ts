import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { ZodError } from "zod";
import type { AuthProvider } from "./auth/auth-provider.js";
import { AppError, unauthorized } from "./errors.js";
import type { ProfileRepository } from "./repositories/profile-repository.js";
import { ProfileService } from "./services/profile-service.js";
import { profileInputSchema, profileUpdateSchema, publicUsernameParamsSchema } from "@sia/validation";

export type AppDependencies = {
  authProvider: AuthProvider;
  profileRepository: ProfileRepository;
  webOrigin?: string;
  logger?: boolean;
};

function bearerToken(header?: string) {
  if (!header?.startsWith("Bearer ")) throw unauthorized();
  const token = header.slice(7).trim();
  if (!token) throw unauthorized();
  return token;
}

export async function buildApp(dependencies: AppDependencies) {
  const app = Fastify({ logger: dependencies.logger ?? false });
  const profiles = new ProfileService(dependencies.profileRepository);

  await app.register(cors, {
    origin: dependencies.webOrigin ?? "http://localhost:3000",
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
  });
  await app.register(helmet);
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

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

  app.get("/api/v1/public/profiles/:username", async (request) => {
    const { username } = publicUsernameParamsSchema.parse(request.params);
    return { data: await profiles.getPublic(username) };
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
    request.log.error({ err: error }, "Unhandled request error");
    return reply.code(500).send({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } });
  });

  return app;
}
