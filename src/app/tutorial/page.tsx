"use client";

import { useState } from "react";
import Link from "next/link";
import { useSubscription } from "@/components/SubscriptionProvider";

const TUTORIAL_SECTIONS = [
  {
    id: "weekly-entry",
    title: "Logging Your Weekly Entry",
    time: "0:00",
    description:
      "Every week, open the Weekly Entry page and log your income, business expenses, personal expenses, and owner draws. The form pre-fills recurring items you've set up so you don't have to re-enter the same things every week.",
    steps: [
      "Go to Weekly Entry from the sidebar",
      "Confirm the week dates are correct",
      "Add income items (commissions, referral fees, etc.)",
      "Add business expenses (marketing, MLS fees, gas, etc.)",
      "Add personal expenses and owner draws if applicable",
      "Enter your account balances for the week",
      "Log any investment contributions",
      "Add mileage driven for business",
      "Click Save Weekly Entry",
    ],
  },
  {
    id: "recurring",
    title: "Setting Up Recurring Items",
    time: "2:30",
    description:
      "Recurring items auto-populate your weekly entry form so you don't have to manually enter the same expenses every time. Set up your regular income, subscriptions, and bills here.",
    steps: [
      "Go to Recurring & Reminders from the sidebar",
      "Click + Add Item",
      "Enter the description, amount, and category",
      "Choose Weekly or Monthly frequency",
      "Set a scheduled day if it's on a specific day",
      "Active items will pre-fill in your Weekly Entry form",
    ],
  },
  {
    id: "dashboard",
    title: "Reading Your Dashboard",
    time: "4:15",
    description:
      "Your dashboard is your financial command center. It shows year-to-date income, expenses, estimated taxes, net worth, and more. The chart tracks your weekly income vs. expenses over time.",
    steps: [
      "YTD Income shows all income logged this year",
      "Est. Taxable Profit = Income minus Business Expenses",
      "Est. Tax Liability shows federal, state, SE, and municipal taxes",
      "The income goal bar at the top tracks progress toward your annual target",
      "Click Est. Net Worth to see the full breakdown",
    ],
  },
  {
    id: "settings",
    title: "Configuring Your Settings",
    time: "6:00",
    description:
      "Settings control your financial starting points — bank balance, home value, loans, and income goal. These feed into your net worth calculations and the progress bar at the top of the page.",
    steps: [
      "Go to Settings from the sidebar",
      "Set your Annual Income Goal (shown in the top progress bar)",
      "Enter your Reference Date and Starting Bank Balance",
      "Fill in Home Value, Mortgage Balance, and rates if applicable",
      "Add Student Loan and Car Loan details if applicable",
      "Set your expected Investment Growth Rate",
      "Click Save Settings",
    ],
  },
  {
    id: "accounts",
    title: "Managing Your Accounts",
    time: "7:30",
    description:
      "Customize which accounts appear in your weekly entry form. You can add bank accounts, investment accounts, crypto wallets — and group them together for clean organization.",
    steps: [
      "Go to Settings, then manage accounts from the Weekly Entry form",
      "Default accounts (Checking, Savings, Business) are created automatically",
      "Add new accounts for any financial accounts you want to track",
      "Group accounts together (e.g., 'Fidelity - Roth IRA', 'Fidelity - Brokerage')",
      "Balances entered in Weekly Entry flow into your Net Worth page",
    ],
  },
  {
    id: "tax-advisor",
    title: "Using the AI Tax Advisor",
    time: "9:00",
    badge: "PRO",
    description:
      "The AI Tax Advisor analyzes your financial data and provides personalized tax strategies. Ask it questions about deductions, quarterly estimates, entity structure, and more.",
    steps: [
      "Find the AI Tax Advisor section on your Dashboard",
      "Ask questions like 'What deductions am I missing?'",
      "Ask 'How much should my quarterly estimated payments be?'",
      "Ask about S-Corp election, home office deduction, vehicle expenses",
      "The advisor sees your actual income and expense data for accurate advice",
    ],
  },
  {
    id: "investments",
    title: "Tracking Investments & Crypto",
    time: "10:30",
    description:
      "Add stocks and crypto to your portfolio to see real-time values, gains/losses, and growth projections. Set up auto-invest amounts that pre-fill in your weekly entry.",
    steps: [
      "Find the Investment Portfolio section on your Dashboard",
      "Click Add Investment to track a stock or crypto",
      "Enter the ticker symbol, shares owned, and average cost",
      "Set a Recurring Amount for auto-invest tracking",
      "Live prices update automatically from market data",
      "Click any investment to see detailed performance and projections",
    ],
  },
  {
    id: "deals",
    title: "Tracking Real Estate Deals",
    time: "12:00",
    badge: "PRO",
    description:
      "The Deal Tracker lets you manage real estate transactions from lead through closing. Track expenses, steps, and commission for each deal.",
    steps: [
      "Go to Deal Tracker from the sidebar",
      "Click + New Deal to start tracking a transaction",
      "Enter property details, client info, and expected commission",
      "Add deal steps (listing appointment, offer, inspection, closing)",
      "Track deal-specific expenses (photography, staging, etc.)",
      "Mark the deal as Closed Won or Closed Lost when complete",
    ],
  },
  {
    id: "export",
    title: "Exporting for Your Accountant",
    time: "13:30",
    description:
      "At tax time, export your full year of data as a clean spreadsheet your CPA can use directly. No more scrambling for receipts or digging through bank statements.",
    steps: [
      "Go to Accountant Export from the sidebar",
      "Review the year-to-date summary",
      "Click Export to download a formatted spreadsheet",
      "Send the file to your CPA or tax preparer",
      "All income, expenses, mileage, and categories are included",
    ],
  },
];

export default function TutorialPage() {
  const { plan, daysLeft } = useSubscription();
  const [activeSection, setActiveSection] = useState("weekly-entry");

  const isTrial = plan === "TRIAL";

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Getting Started</h2>
          <p className="text-sm text-slate-500 mt-1">
            Learn how to use every feature of Taxora
            {isTrial && daysLeft !== null && (
              <span className="ml-2 text-emerald-600 font-medium">
                — {daysLeft} days left in your free trial
              </span>
            )}
          </p>
        </div>
        <Link
          href="/entry"
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          Start Your First Entry
        </Link>
      </div>

      {/* Video Section */}
      <div className="bg-slate-900 rounded-xl overflow-hidden mb-8 shadow-lg">
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          {/* Replace this src with your actual tutorial video URL */}
          <iframe
            className="absolute inset-0 w-full h-full"
            src="https://www.youtube.com/embed/VIDEO_ID_HERE?autoplay=1&loop=1&playlist=VIDEO_ID_HERE&rel=0"
            title="Taxora Tutorial"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Full Walkthrough Tutorial</p>
            <p className="text-slate-400 text-sm">Watch the complete guide or jump to a section below</p>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {TUTORIAL_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full transition-colors ${
                  activeSection === section.id
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {section.time}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section Navigation + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Section Nav */}
        <div className="lg:col-span-1">
          <nav className="space-y-1 sticky top-6">
            {TUTORIAL_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  activeSection === section.id
                    ? "bg-emerald-50 text-emerald-700 font-medium"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="flex-1">{section.title}</span>
                {section.badge && (
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                    {section.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Active Section Detail */}
        <div className="lg:col-span-3">
          {TUTORIAL_SECTIONS.filter((s) => s.id === activeSection).map((section) => (
            <div key={section.id} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-semibold text-slate-800">{section.title}</h3>
                {section.badge && (
                  <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    {section.badge}
                  </span>
                )}
                <span className="text-xs text-slate-400 ml-auto">{section.time} in video</span>
              </div>
              <p className="text-sm text-slate-600 mb-6">{section.description}</p>
              <div className="space-y-3">
                {section.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-slate-700">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Start Checklist */}
      <div className="mt-8 bg-gradient-to-r from-emerald-50 to-slate-50 border border-emerald-200 rounded-xl p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Quick Start Checklist</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Set your income goal", href: "/settings" },
            { label: "Configure your accounts", href: "/settings" },
            { label: "Add recurring income & expenses", href: "/recurring" },
            { label: "Log your first weekly entry", href: "/entry" },
            { label: "Review your dashboard", href: "/" },
            { label: "Try the AI Tax Advisor", href: "/" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all"
            >
              <div className="w-5 h-5 rounded border-2 border-slate-300 flex-shrink-0" />
              <span className="text-sm text-slate-700">{item.label}</span>
              <svg className="w-4 h-4 text-slate-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
