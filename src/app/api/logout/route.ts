import { NextResponse } from "next/server";

// POST /api/logout
export async function POST(req: Request) {
    // 1) เตรียม redirect ไปยัง NextAuth v4 signout (ต้องคงเป็น POST → ใช้ 307)
    const url = new URL("/api/auth/signout", req.url);
    url.searchParams.set("callbackUrl", "/login");

    // 2) สร้าง Response และลบคุกกี้ custom ที่ middleware ใช้ (เช่น prism_session)
    const res = NextResponse.redirect(url, { status: 307 });

    // ลบคุกกี้ custom ของคุณที่ใช้เช็คสิทธิ์ (แก้ชื่อให้ตรงกับของจริง)
    res.cookies.delete("prism_session");

    // (ถ้ามีคุกกี้ custom อื่นๆ ให้ลบเพิ่มได้ที่นี่)
    // res.cookies.delete("another_cookie");

    return res;
}