// src/app/api/auth/google/callback/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const next = url.searchParams.get("next") || "/";

    if (!code) {
        return NextResponse.redirect(new URL("/signin?error=google_no_code", req.url));
    }

    // 1) แลก code เป็น access_token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI!, // http://localhost:3000/api/auth/google/callback
            grant_type: "authorization_code",
        }),
    });

    if (!tokenRes.ok) {
        return NextResponse.redirect(new URL("/signin?error=google_token_failed", req.url));
    }

    const tokens = await tokenRes.json();

    // 2) ดึงข้อมูลโปรไฟล์ผู้ใช้จาก Google
    const meRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!meRes.ok) {
        return NextResponse.redirect(new URL("/signin?error=google_profile_failed", req.url));
    }

    const me = (await meRes.json()) as { email?: string; name?: string; picture?: string };

    // 3) ตรวจสิทธิ์ Super Admin (อีเมลต้องตรง EXACT)
    const superAdmin = (process.env.SUPER_ADMIN || "").trim().toLowerCase();
    const email = (me.email || "").trim().toLowerCase();

    if (!email || !superAdmin || email !== superAdmin) {
        // ไม่อนุญาต → ส่งไปหน้าห้ามเข้า
        return NextResponse.redirect(new URL("/unauthorized?reason=not_super_admin", req.url));
    }

    // 4) สร้าง session/cookie ของคุณเองตามระบบที่โปรเจกต์ใช้
    //    ด้านล่างเป็นตัวอย่าง minimal ด้วย cookie ชื่อ "session"
    const res = NextResponse.redirect(new URL(next, req.url));
    res.cookies.set("session", JSON.stringify({ email, name: me.name, picture: me.picture }), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 7 วัน
    });
    return res;
}
