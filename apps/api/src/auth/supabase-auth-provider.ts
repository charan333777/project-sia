import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthIdentity, AuthProvider } from "./auth-provider.js";

export class SupabaseAuthProvider implements AuthProvider {
  private readonly client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async verifyAccessToken(token: string): Promise<AuthIdentity | null> {
    const { data, error } = await this.client.auth.getUser(token);
    if (error || !data.user) return null;
    return { userId: data.user.id, email: data.user.email };
  }
}
