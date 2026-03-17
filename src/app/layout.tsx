import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { PrivacyProvider } from "@/components/PrivacyProvider";
import TopBar from "@/components/TopBar";
import SessionProvider from "@/components/SessionProvider";
import SubscriptionProvider from "@/components/SubscriptionProvider";
import TrialBanner from "@/components/TrialBanner";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Taxora",
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
                <TopBar />
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
