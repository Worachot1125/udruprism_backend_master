/* eslint-disable @typescript-eslint/no-explicit-any */
// /* eslint-disable @typescript-eslint/no-unused-vars */
// import { NextResponse } from "next/server";
// import { db } from "@/lib/db";
// import { policy, user } from "@/lib/schema";
// import { inArray, eq } from "drizzle-orm";

// export async function POST(req: Request) {
//     const body = await req.json().catch(() => ({}));
//     const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
//     if (!ids.length) return NextResponse.json({ ok: false, error: "EMPTY" }, { status: 400 });

//     await db.transaction(async (tx) => {
//         await tx.update(user).set({ policyId: null }).where(inArray(user.policyId, ids));
//         await tx.delete(policy).where(inArray(policy.id, ids));
//     });

//     return NextResponse.json({ ok: true, deleted: ids.length });
// }

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { policy, user } from "@/lib/schema";
import { inArray } from "drizzle-orm";

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length) return NextResponse.json({ ok: true, deleted: 0 });

        await db.update(user).set({ policyId: null }).where(inArray(user.policyId, ids));
        await db.delete(policy).where(inArray(policy.id, ids));

        return NextResponse.json({ ok: true, deleted: ids.length });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
    }
}