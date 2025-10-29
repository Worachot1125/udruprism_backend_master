// src/components/auth/SignUpForm.tsx
"use client";

import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Link from "next/link";
import React, { useCallback, useMemo, useState } from "react";

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  // simple local form state (ถ้าใช้ react-hook-form ได้ก็ย้ายภายหลังได้เลย)
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => !!fname.trim() && !!lname.trim() && !!email.trim() && !!pwd && isChecked && !submitting,
    [fname, lname, email, pwd, isChecked, submitting]
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      setSubmitting(true);
      setError(null);
      try {
        // TODO: call your API here
        // await fetch("/api/signup", { method: "POST", body: JSON.stringify({ fname, lname, email, pwd }) })
        // ตัวอย่าง: แค่หน่วง simulate
        await new Promise((r) => setTimeout(r, 600));
        // สำเร็จ: ทำ redirect หรือแสดงข้อความสำเร็จ
        // router.push("/signin");
        alert("Signed up (demo). Replace with your API call.");
      } catch (err) {
        console.error(err);
        setError("Sign up failed. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [canSubmit, email, fname, lname, pwd]
  );

  return (
    <div className="no-scrollbar flex w-full flex-1 flex-col overflow-y-auto lg:w-1/2">
      <div className="mx-auto mb-5 w-full max-w-md sm:pt-10">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          {/* Inline ChevronLeftIcon */}
          <svg
            className="mr-2 h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to dashboard
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="text-title-sm mb-2 font-semibold text-gray-800 dark:text-white/90 sm:text-title-md">
              Sign Up
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your email and password to sign up!
            </p>
          </div>

          <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-3 rounded-lg bg-gray-100 px-7 py-3 text-sm font-normal text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-800 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
                title="Sign up with Google (demo)"
                onClick={() => alert("Google Sign up demo — wire your auth flow")}
              >
                {/* Google inline SVG */}
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9087 16.6126L16.0924 16.6305C17.7788 15.1041 18.7511 12.8583 18.7511 10.1944Z"
                    fill="#4285F4"
                  />
                  <path
                    d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26943C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z"
                    fill="#EB4335"
                  />
                </svg>
                Sign up with Google
              </button>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-3 rounded-lg bg-gray-100 px-7 py-3 text-sm font-normal text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-800 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
                title="Sign up with X (demo)"
                onClick={() => alert("X Sign up demo — wire your auth flow")}
              >
                {/* X (Twitter) inline SVG */}
                <svg width="21" height="20" viewBox="0 0 21 20" fill="none" className="fill-current" aria-hidden="true">
                  <path d="M15.6705 1.875H18.4272L12.4047 8.75833L19.4897 18.125H13.9422L9.59717 12.4442L4.62554 18.125H1.86721L8.30887 10.7625L1.51221 1.875H7.20054L11.128 7.0675L15.6705 1.875ZM14.703 16.475H16.2305L6.37054 3.43833H4.73137L14.703 16.475Z" />
                </svg>
                Sign up with X
              </button>
            </div>

            <div className="relative py-3 sm:py-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white p-2 text-gray-400 dark:bg-gray-900 sm:px-5 sm:py-2">Or</span>
              </div>
            </div>

            <form onSubmit={onSubmit} noValidate>
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* First Name */}
                  <div className="sm:col-span-1">
                    <Label htmlFor="fname">
                      First Name<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="fname"
                      name="fname"
                      autoComplete="given-name"
                      placeholder="Enter your first name"
                      value={fname}
                      onChange={(e) => setFname(e.target.value)}
                      required
                    />
                  </div>

                  {/* Last Name */}
                  <div className="sm:col-span-1">
                    <Label htmlFor="lname">
                      Last Name<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="lname"
                      name="lname"
                      autoComplete="family-name"
                      placeholder="Enter your last name"
                      value={lname}
                      onChange={(e) => setLname(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email">
                    Email<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <Label htmlFor="password">
                    Password<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={pwd}
                      onChange={(e) => setPwd(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-4 top-1/2 z-30 -translate-y-1/2 p-1"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {/* Inline Eye/EyeClose icons */}
                      {showPassword ? (
                        // Eye (open)
                        <svg
                          className="h-5 w-5 text-gray-500 dark:text-gray-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        // Eye (closed)
                        <svg
                          className="h-5 w-5 text-gray-500 dark:text-gray-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <path d="M3 3l18 18" />
                          <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" />
                          <path d="M16.24 16.24A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.11-5.69" />
                          <path d="M14.12 5.1A10.94 10.94 0 0 1 23 12a21.8 21.8 0 0 1-2.06 2.88" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Use 8+ characters with a mix of letters, numbers & symbols.
                  </p>
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-center gap-3">
                  <Checkbox className="h-5 w-5" checked={isChecked} onChange={setIsChecked} />
                  <p className="inline-block text-gray-500 dark:text-gray-400">
                    By creating an account means you agree to the{" "}
                    <Link href="/terms" className="text-gray-800 underline underline-offset-2 dark:text-white/90">
                      Terms and Conditions
                    </Link>
                    , and our{" "}
                    <Link href="/privacy" className="text-gray-800 underline underline-offset-2 dark:text-white/90">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canSubmit}
                    title={!isChecked ? "Please accept terms to continue" : undefined}
                  >
                    {submitting ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Signing Up…
                      </>
                    ) : (
                      "Sign Up"
                    )}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-center text-sm font-normal text-gray-700 dark:text-gray-400 sm:text-start">
                Already have an account?{" "}
                <Link href="/signin" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
