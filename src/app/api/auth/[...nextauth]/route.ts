/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/auth/[...nextauth]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,        // ตรวจให้มีจริงทั้งคู่
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },                       // v4 OK
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider === "google") {
        (token as any).provider = "google";
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          provider: (token as any).provider,          // เพิ่มฟิลด์เสริม
        },
      };
    },
  },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
