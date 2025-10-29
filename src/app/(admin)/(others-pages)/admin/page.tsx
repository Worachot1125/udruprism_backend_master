import AdminManager from "@/components/admin/admin/AdminManager";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Admin",
  description:
    "This is Next.js Basic Table  page for TailAdmin  Tailwind CSS Admin Dashboard Template",
  // other metadata
};

export default function ModelPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Management/Admin" />
      <div className="space-y-6">
         <AdminManager />
      </div>
    </div>
  );
}
