"use client";

import * as React from "react";
import { twMerge } from "tailwind-merge";

/** ขนาดปุ่ม */
export type ButtonSize = "sm" | "md" | "lg";

/** โทน/สไตล์ปุ่ม */
export type ButtonVariant = "primary" | "outline" | "ghost" | "danger";

/** Props หลักของปุ่ม */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSize;
  variant?: ButtonVariant;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  loading?: boolean;
}

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:text-white",
  outline:
    "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:text-gray-400",
  ghost:
    "bg-transparent text-gray-800 hover:bg-gray-100 disabled:text-gray-400",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300 disabled:text-white",
};

const baseClass =
  "inline-flex items-center justify-center rounded-lg transition-colors whitespace-nowrap select-none disabled:cursor-not-allowed";

/** ปุ่มมาตรฐานที่ project ใช้ */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    size = "md",
    variant = "primary",
    startIcon,
    endIcon,
    loading = false,
    children,
    disabled,
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;
  const cls = twMerge(baseClass, sizeClass[size], variantClass[variant], className);

  return (
    <button ref={ref} className={cls} disabled={isDisabled} {...rest}>
      {/* Start icon / spinner */}
      {loading ? (
        <span className="mr-2 inline-flex items-center">
          <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
            <path d="M22 12a10 10 0 0 1-10 10" fill="none" stroke="currentColor" strokeWidth="4" />
          </svg>
        </span>
      ) : (
        startIcon && <span className="mr-2 inline-flex items-center">{startIcon}</span>
      )}

      <span className="inline-block">{children}</span>

      {endIcon && !loading && <span className="ml-2 inline-flex items-center">{endIcon}</span>}
    </button>
  );
});

export default Button;
