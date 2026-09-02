import { config as loadEnvironment } from "dotenv";
import { SupabaseAuthProvider } from "./auth/supabase-auth-provider.js";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { PostgresProfileRepository } from "./repositories/postgres-profile-repository.js";
import { PostgresNearbyRepository } from "./repositories/postgres-nearby-repository.js";

loadEnvironment({ path: [".env", "../../.env"], quiet: true });

const config = loadConfig();
const app = await buildApp({
  authProvider: new SupabaseAuthProvider(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY),
  profileRepository: PostgresProfileRepository.connect(config.DATABASE_URL),
  nearbyRepository: PostgresNearbyRepository.connect(config.DATABASE_URL),
  webOrigin: config.WEB_ORIGIN,
  logger: true,
});

try {
  await app.listen({ port: config.PORT, host: config.HOST });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
