// app/layout.tsx
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Outfit } from "next/font/google";
import "./globals.css";

import SessionProvider from "@/components/auth/SessionProvider";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
// import PassiveEventsProvider from "./PassiveEventsProvider";

const outfit = Outfit({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.className} dark:bg-gray-900`}>
        {/* <PassiveEventsProvider /> */}
        <SessionProvider>
          <ThemeProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
