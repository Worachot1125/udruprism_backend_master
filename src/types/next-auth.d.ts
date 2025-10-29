// src/types/next-auth.d.ts
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      provider?: string;
    } | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    provider?: string;
  }
}
