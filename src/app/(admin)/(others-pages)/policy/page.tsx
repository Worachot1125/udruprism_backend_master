import GroupManager from "@/components/admin/policies/PolicyManager";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "UDRU Prism",
  description:
    "Backend for UDRU Prism.",
  // other metadata
};

export default function PolicyPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Management/Policy" />
      <div className="space-y-6">
          <GroupManager />
      </div>
    </div>
  );
}
