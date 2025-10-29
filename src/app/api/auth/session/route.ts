// src/app/api/auth/session/route.ts
export const runtime = "nodejs";
export const revalidate = 0; // no cache

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type SessionUser = { email?: string; name?: string; picture?: string };

// เผื่อกรณี cookie เป็น JSON หรือ JWT (พยายามถอด payload ให้)
function tryParseSession(raw: string): SessionUser | null {
  // 1) ลอง parse เป็น JSON ตรง ๆ
  try {
    const j = JSON.parse(raw);
    if (j && typeof j === "object") return j as SessionUser;
  } catch {}

  // 2) ลอง parse เป็น JWT (ดึง payload ตรงกลาง)
  try {
    const payloadB64 = raw.split(".")[1];
    if (payloadB64) {
      const json = Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
      const j = JSON.parse(json);
      if (j && typeof j === "object") return j as SessionUser;
    }
  } catch {}

  return null;
}

export async function GET() {
  const jar = await cookies(); // ✅ ต้อง await
  const raw = jar.get("session")?.value; // ต้องตรงกับชื่อคุกกี้ที่ตั้งไว้ตอน callback/login

  if (!raw) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const data = tryParseSession(raw);

  if (!data?.email) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // (ถ้าต้องการบังคับเฉพาะ SUPER_ADMIN จาก .env ให้เปิดใช้บล็อกนี้)
  // if (process.env.SUPER_ADMIN && data.email.toLowerCase() !== process.env.SUPER_ADMIN.toLowerCase()) {
  //   return NextResponse.json({ authenticated: false }, { status: 403 });
  // }

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        email: data.email,
        name: data.name ?? null,
        image: data.picture ?? null,
      },
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
