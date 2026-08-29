export type AuthIdentity = {
  userId: string;
  email?: string;
};

export interface AuthProvider {
  verifyAccessToken(token: string): Promise<AuthIdentity | null>;
}
