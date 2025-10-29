export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPE = ["openid", "email", "profile"].join(" ");
const STATE_COOKIE = "g_oauth_state";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const next = url.searchParams.get("next") || "/";

    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI!;
    if (!clientId || !redirectUri) {
        return NextResponse.json(
            { error: "Missing GOOGLE_CLIENT_ID/GOOGLE_REDIRECT_URI" },
            { status: 500 }
        );
    }

    // สร้าง state กัน CSRF และพก next ติดไปด้วย
    const nonce = crypto.randomBytes(16).toString("hex");
    const state = JSON.stringify({ nonce, next });

    // เก็บ state ลง cookie (httpOnly)
    (await
        // เก็บ state ลง cookie (httpOnly)
        cookies()).set(STATE_COOKIE, state, {
            httpOnly: true,
            sameSite: "lax",
            secure: false, // โปรดตั้ง true ถ้าเป็น https
            path: "/",
            maxAge: 60 * 10, // 10 นาที
        });

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: SCOPE,
        access_type: "online",
        include_granted_scopes: "true",
        prompt: "consent",
        state: nonce,
    });

    return NextResponse.redirect(`${AUTH_URL}?${params.toString()}`);
}
