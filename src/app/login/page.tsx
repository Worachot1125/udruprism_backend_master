// src/app/login/page.tsx
import SignInForm from "@/components/auth/SignInForm";
import Image from "next/image";

export const dynamic = "force-dynamic"; // กัน prerender error กับหน้าที่มีการ auth

export default function LoginPage() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* ฝั่งซ้าย */}
      <div className="flex items-center justify-center px-6 py-10 lg:px-12">
        <div className="w-full max-w-md">
          <SignInForm />
        </div>
      </div>

      {/* ฝั่งขวา */}
      <div className="flex flex-col items-center justify-center bg-[#0A1E5E] text-white px-6 py-10">
        <Image
          src="/images/prims_profile.png"
          alt="Prism Logo"
          width={220}
          height={220}
          priority
          className="mb-6"
        />
        <h1 className="text-3xl font-bold">Prism</h1>
        <p className="mt-2 text-center text-base max-w-sm">
          Your trusted admin dashboard for better control.
        </p>
      </div>
    </div>
  );
}
