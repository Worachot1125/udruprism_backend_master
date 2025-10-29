import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Message from "@/components/reports/messages/MessageReports";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "UDRU Prism",
  description:
    "Backend for UDRU Prism.",
  // other metadata
};

export default function pageMessage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Reports/Massage" />
      <div className="space-y-6">
        <Message />
      </div>
    </div>
  )
}
