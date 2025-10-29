// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// ชี้ให้ชัดว่าจะโหลดจาก .env.local (หรือเปลี่ยนเป็น ".env" ถ้าคุณเก็บไว้ที่นั่น)
dotenv.config({ path: ".env.local" });

if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is missing. Put it in .env.local");
}

export default defineConfig({
    schema: "./src/lib/schema.ts",   // แก้ path ให้ตรงของคุณ
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.POSTGRES_URL!,
    },
    // ตัวเลือกเสริม:
    // strict: true,
});
