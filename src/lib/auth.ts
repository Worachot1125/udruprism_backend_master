/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/auth/[...nextauth]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,        // ตรวจ env ให้ครบ
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,// ชื่อแปรต้องตรง
    }),
  ],
  session: { strategy: "jwt" },
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
          provider: (token as any).provider,
        },
      };
    },
  },
  debug: process.env.NODE_ENV === "development",
};

// v4/v5-compat pattern: ได้ handler ฟังก์ชันเดียว แล้ว export เป็น GET/POST
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
