// src/lib/auth-server.ts
import NextAuth, { type AuthOptions } from "next-auth";
import Google from "next-auth/providers/google";

const config: AuthOptions = {
  providers: [Google({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })],
  session: { strategy: "jwt" as const },
};

export const { handlers: { GET, POST }, auth, signIn, signOut } = NextAuth(config);
