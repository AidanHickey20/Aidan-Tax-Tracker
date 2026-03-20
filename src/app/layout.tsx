import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { PrivacyProvider } from "@/components/PrivacyProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import TopBar from "@/components/TopBar";
import SessionProvider from "@/components/SessionProvider";
import SubscriptionProvider from "@/components/SubscriptionProvider";
import TrialBanner from "@/components/TrialBanner";
import OnboardingTour from "@/components/OnboardingTour";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "REtaxly",
  description: "Personal finance and accounting tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem("theme")==="light")document.documentElement.classList.add("light")}catch(e){}` }} />
      </head>
      <body className={`${geist.variable} font-sans antialiased`}>
        <SessionProvider>
          <SubscriptionProvider>
          <ThemeProvider>
          <PrivacyProvider>
            <OnboardingTour />
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-auto">
                <TrialBanner />
                <TopBar />
                <main className="flex-1 px-8 pb-8 pt-4">{children}</main>
              </div>
            </div>
          </PrivacyProvider>
          </ThemeProvider>
          </SubscriptionProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
