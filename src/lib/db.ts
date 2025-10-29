// src/lib/db.ts
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

neonConfig.fetchConnectionCache = true;

// แปลง URL แบบ -pooler => non-pooler และเอา query ssl ออก (HTTP driver ไม่ต้องใช้)
const raw = process.env.POSTGRES_URL!;
const DATABASE_URL = raw.replace("-pooler.", ".").replace("?sslmode=require", "");

// สร้าง HTTP client + drizzle
const sql = neon(DATABASE_URL);
export const db = drizzle(sql);
