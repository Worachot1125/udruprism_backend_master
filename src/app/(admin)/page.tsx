// src/app/(admin)/page.tsx
import type { Metadata } from "next";
import React from "react";

import { AnalyticsFilterProvider } from "@/context/AnalyticsFilterContext";
import FiltersPanel from "@/components/analytics/FiltersPanel";

import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
// import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import UsersByGroupCard from "@/components/analytics/UsersByGroupCard";
import UsageVsPolicyLimitCard from "@/components/analytics/UsageVsPolicyLimitCard";
import TokenUsageStatisticsChart from "@/components/analytics/TokenUsageStatisticsChart";

export const metadata: Metadata = {
  title: "Prism",
  description: "This is Prism.",
};

export default function Ecommerce() {
  return (
    // 👇 ต้องมี provider ครอบทุก component ที่เรียก useAnalyticsFilter
    <AnalyticsFilterProvider>
      <div className="space-y-4 md:space-y-6">
        {/* ฟิลเตอร์ */}
        <FiltersPanel />

        {/* เนื้อหาหลัก */}
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 space-y-6 xl:col-span-7">
            <EcommerceMetrics />
            <MonthlySalesChart />
          </div>

          <div className="col-span-12 xl:col-span-5">
            <MonthlyTarget />
          </div>

          <div className="col-span-12">
            <TokenUsageStatisticsChart />
          </div>

          <div className="col-span-12 xl:col-span-5">
            <UsersByGroupCard />
          </div>
          <div className="col-span-12 xl:col-span-7">
            <UsageVsPolicyLimitCard />
          </div>
        </div>
      </div>
    </AnalyticsFilterProvider>
  );
}
