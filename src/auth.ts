// src/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";
import type { Session, Account } from "next-auth";

export const {
  handlers, // { GET, POST }
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    // อย่าใส่ `as const` เพื่อไม่ให้กลายเป็น readonly tuple
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({
      token,
      account,
    }: {
      token: JWT;
      account?: Account | null;
    }): Promise<JWT> {
      if (account?.provider === "google") {
        // ใช้ module augmentation (ไฟล์ .d.ts ด้านล่าง) เพื่อให้พ้น type error
        token.provider = "google";
      }
      return token;
    },

    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT;
    }): Promise<Session> {
      return {
        ...session,
        user: {
          ...session.user,
          // อ่านค่าเสริมจาก JWT (มีประกาศ type augmentation แล้ว)
          provider: (token as JWT & { provider?: string }).provider,
        } as Session["user"],
      };
    },
  },
  debug: process.env.NODE_ENV === "development",
});
