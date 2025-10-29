import { NextResponse } from "next/server";

export async function POST() {
    const res = NextResponse.json({ ok: true });

    // คุกกี้ custom ของแอป
    ["prism_session", "session"].forEach((n) => res.cookies.delete(n));

    // คุกกี้ non-auth ของ NextAuth/Google (ไม่จำเป็นต้องลบ แต่ถ้าอยากโล่ง)
    ["next-auth.callback-url", "next-auth.csrf-token", "g_oauth_state"].forEach((n) =>
        res.cookies.delete(n)
    );

    // หมายเหตุ: session-token ของ NextAuth เราให้ signOut() จัดการ (คุณทำแล้ว)

    return res;
}