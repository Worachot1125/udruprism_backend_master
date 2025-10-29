// src/components/admin/common/AdminCardTable.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import Image from "next/image";
import Badge from "@/components/ui/badge/Badge";
import { useAdminsDB } from "@/lib/admin/adminDb";

const PLACEHOLDER = "/images/user/user-1.jpg";

export default function AdminCardTable() {
  // ดึงรายการแอดมินมา 10 แถวแรกสำหรับตัวอย่างตาราง
  const { items } = useAdminsDB({ autoInit: true, pageSize: 10 });

  // สร้าง rows สำหรับแสดงผล
  const rows = React.useMemo(() => {
    return (items ?? []).slice(0, 10).map((u) => {
      const full =
        [u.prefix, u.firstname, u.lastname].filter(Boolean).join(" ").trim() ||
        u.email;
      return {
        id: u.id,
        user: {
          image: (u as any).image ?? PLACEHOLDER,
          name: full,
          role: u.department ?? "Admin",
        },
        // เดิม projectName มาจาก group; ตอนนี้ใช้ department แทน
        projectName: u.department ?? "—",
        // ยังไม่มีข้อมูลทีมจริง ๆ ใน adminDb — ปล่อยเป็นค่าว่าง
        teamImages: [] as string[],
        status: "Active" as "Active" | "Cancel",
        budget: "—",
      };
    });
  }, [items]);

  if (!rows.length) {
    return (
      <div className="rounded-xl border p-6 text-sm text-gray-500">
        No admins yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[900px]">
          <table className="w-full">
            <thead className="border-b border-gray-100 dark:border-white/[0.05]">
              <tr>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-500">
                  User
                </th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-500">
                  Department
                </th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-500">
                  Team
                </th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-500">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-500">
                  Budget
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {rows.map((item) => (
                <tr key={item.id}>
                  {/* User */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full">
                        <Image
                          src={item.user.image}
                          alt={item.user.name}
                          width={40}
                          height={40}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">
                          {item.user.name}
                        </p>
                        <p className="text-xs text-gray-500">{item.user.role}</p>
                      </div>
                    </div>
                  </td>

                  {/* Department */}
                  <td className="px-5 py-4 text-gray-600 dark:text-gray-400">
                    {item.projectName}
                  </td>

                  {/* Team */}
                  <td className="px-5 py-4">
                    <div className="flex -space-x-2">
                      {item.teamImages.map((img, index) => (
                        <div
                          key={index}
                          className="h-7 w-7 overflow-hidden rounded-full border-2 border-white dark:border-gray-800"
                        >
                          <Image src={img} alt={`team-${index}`} width={28} height={28} />
                        </div>
                      ))}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <Badge size="sm" color={item.status === "Active" ? "success" : "error"}>
                      {item.status}
                    </Badge>
                  </td>

                  {/* Budget */}
                  <td className="px-5 py-4 text-gray-600 dark:text-gray-400">
                    {item.budget}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
