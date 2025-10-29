"use client";
import React from "react";

export default function Section({
  title,
  actions,
  children,
  className,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border p-4 shadow-sm
                  border-gray-200 bg-white
                  dark:border-gray-800 dark:bg-white/[0.03]
                  ${className ?? ""}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
