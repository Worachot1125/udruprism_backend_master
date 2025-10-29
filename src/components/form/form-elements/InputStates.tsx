"use client";

import * as React from "react";
import { twMerge } from "tailwind-merge";

export type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** แสดงสถานะ error (มีผลกับสี border/ข้อความ) */
  error?: boolean;
  /** แสดงสถานะ success (ถ้า error เป็น true จะไม่โชว์ success) */
  success?: boolean;
  /** ข้อความบอกใบ้/คำอธิบายใต้ช่อง (รองรับทั้ง error/success/neutral) */
  hint?: string;
  /** เพื่อยังคงความเข้ากันได้ ถ้า project เดิมใช้ errorMessage */
  errorMessage?: string;
};

const base =
  "block w-full rounded-lg border px-3 h-11 text-sm transition-colors disabled:cursor-not-allowed disabled:bg-gray-100";
const neutral =
  "border-gray-300 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const errorCls =
  "border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-100";
const successCls =
  "border-emerald-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

const hintBase = "mt-1 text-xs";
const hintError = "text-rose-600";
const hintSuccess = "text-emerald-600";
const hintNeutral = "text-gray-500";

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      className,
      error,
      success,
      hint,
      errorMessage,
      // ทำให้เป็น controlled/unstyled ตามที่ผู้ใช้ส่งมา
      ...rest
    },
    ref
  ) => {
    // รองรับทั้ง error และ errorMessage (ถ้ามี errorMessage จะถือว่า error)
    const isError = Boolean(error || errorMessage);
    const isSuccess = Boolean(success && !isError);

    const inputCls = twMerge(
      base,
      isError ? errorCls : isSuccess ? successCls : neutral,
      className
    );

    const shownHint = isError ? errorMessage ?? hint : hint;

    return (
      <div>
        <input
          ref={ref}
          aria-invalid={isError || undefined}
          className={inputCls}
          {...rest}
        />
        {shownHint ? (
          <div
            className={twMerge(
              hintBase,
              isError ? hintError : isSuccess ? hintSuccess : hintNeutral
            )}
          >
            {shownHint}
          </div>
        ) : null}
      </div>
    );
  }
);
InputField.displayName = "InputField";

export default InputField;
