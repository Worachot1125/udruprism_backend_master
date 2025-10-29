import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const { token } = await req.json().catch(() => ({}));
    const secret = process.env.RECAPTCHA_SECRET;
    if (!secret || !token) {
        return NextResponse.json({ ok: false }, { status: 400 });
    }

    const google = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
    });
    const data = await google.json().catch(() => ({}));

    return NextResponse.json({ ok: !!data?.success });
}
