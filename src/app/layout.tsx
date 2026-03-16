import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { PrivacyProvider } from "@/components/PrivacyProvider";
import PrivacyToggle from "@/components/PrivacyToggle";
import IncomeGoalBar from "@/components/IncomeGoalBar";
import SessionProvider from "@/components/SessionProvider";
import SubscriptionProvider from "@/components/SubscriptionProvider";
import TrialBanner from "@/components/TrialBanner";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tax Tracker",
  description: "Personal finance and accounting tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} font-sans antialiased`}>
        <SessionProvider>
          <SubscriptionProvider>
          <PrivacyProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-auto">
                <TrialBanner />
                <div className="flex items-start justify-between gap-4 px-8 pt-6 pb-0">
                  <div className="flex-1 min-w-0">
                    <IncomeGoalBar />
                  </div>
                  <div className="flex-shrink-0 pt-0.5">
                    <PrivacyToggle />
                  </div>
                </div>
                <main className="flex-1 px-8 pb-8 pt-4">{children}</main>
              </div>
            </div>
          </PrivacyProvider>
          </SubscriptionProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
