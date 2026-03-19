"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";

interface TourStep {
  title: string;
  description: string;
  target: string | null; // data-tour attribute value, null for intro/outro
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to REtaxly!",
    description: "Let's take a quick tour of your new financial dashboard. This will only take a minute.",
    target: null,
  },
  {
    title: "Dashboard",
    description: "Your financial command center. See your income, expenses, tax estimates, and net profit all in one place.",
    target: "/",
  },
  {
    title: "Weekly Entry",
    description: "Log your income and expenses each week. This is where all your financial data starts.",
    target: "/entry",
  },
  {
    title: "Past Weeks",
    description: "Review and edit previous weekly entries. Great for catching anything you missed.",
    target: "/history",
  },
  {
    title: "Recurring & Reminders",
    description: "Set up recurring income, expenses, and investments that repeat weekly or monthly. Add reminders so you never miss a payment.",
    target: "/recurring",
  },
  {
    title: "Net Worth",
    description: "Track your total net worth across all accounts — cash, investments, crypto, and debts.",
    target: "/net-worth",
  },
  {
    title: "Deal Tracker",
    description: "Manage your real estate deals from contract to close. Track fix & flips, wholesale deals, and realtor transactions.",
    target: "/deals",
  },
  {
    title: "Accountant Export",
    description: "Generate clean, organized reports ready to hand off to your CPA at tax time.",
    target: "/export",
  },
  {
    title: "Settings",
    description: "Customize your tax rates, filing status, accounts, and more to match your situation.",
    target: "/settings",
  },
  {
    title: "You're all set!",
    description: "Start by heading to Weekly Entry to log your first week. You can always revisit Getting Started from the sidebar.",
    target: null,
  },
];

export default function OnboardingTour() {
  const { status } = useSession();
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);
  const [checked, setChecked] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== "authenticated" || checked) return;
    setChecked(true);
    fetch("/api/tutorial")
      .then((r) => r.json())
      .then((data) => {
        if (!data.hasSeenTutorial) setShow(true);
      })
      .catch(() => {});
  }, [status, checked]);

  // Position tooltip next to the target sidebar item
  useEffect(() => {
    if (!show) return;
    const current = TOUR_STEPS[step];
    if (!current.target) {
      setTooltipPos(null);
      return;
    }

    const el = document.querySelector(`[data-tour="${current.target}"]`) as HTMLElement | null;
    if (!el) {
      setTooltipPos(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    const top = rect.top + rect.height / 2;
    const left = rect.right + 16; // 16px gap from sidebar item
    setTooltipPos({ top, left });
  }, [step, show]);

  const dismiss = useCallback(() => {
    setShow(false);
    fetch("/api/tutorial", { method: "POST" }).catch(() => {});
  }, []);

  if (!show) return null;

  const current = TOUR_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === TOUR_STEPS.length - 1;
  const progress = ((step + 1) / TOUR_STEPS.length) * 100;
  const isCentered = !current.target || !tooltipPos;

  // Highlight ring around current sidebar item
  const highlightEl = current.target
    ? (document.querySelector(`[data-tour="${current.target}"]`) as HTMLElement | null)
    : null;
  const highlightRect = highlightEl?.getBoundingClientRect();

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop with cutout for highlighted element */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {highlightRect && (
              <rect
                x={highlightRect.left - 4}
                y={highlightRect.top - 4}
                width={highlightRect.width + 8}
                height={highlightRect.height + 8}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#tour-mask)"
          style={{ pointerEvents: "auto" }}
        />
      </svg>

      {/* Highlight border around target element */}
      {highlightRect && (
        <div
          className="absolute border-2 border-emerald-400 rounded-lg pointer-events-none"
          style={{
            top: highlightRect.top - 4,
            left: highlightRect.left - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
            boxShadow: "0 0 0 4px rgba(16, 185, 129, 0.2)",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className={`absolute ${isCentered ? "inset-0 flex items-center justify-center p-4" : ""}`}
        style={
          !isCentered && tooltipPos
            ? { top: tooltipPos.top, left: tooltipPos.left, transform: "translateY(-50%)" }
            : undefined
        }
      >
        <div className={`bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-80 overflow-hidden ${
          !isCentered ? "relative" : ""
        }`}>
          {/* Arrow pointing left toward sidebar item */}
          {!isCentered && (
            <div
              className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0"
              style={{
                borderTop: "8px solid transparent",
                borderBottom: "8px solid transparent",
                borderRight: "8px solid #475569",
              }}
            />
          )}

          {/* Progress bar */}
          <div className="h-1 bg-slate-700">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-5">
            {/* Step counter + skip */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400 font-medium">
                {step + 1} of {TOUR_STEPS.length}
              </span>
              <button
                onClick={dismiss}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Skip tour
              </button>
            </div>

            {/* Icon for intro/outro */}
            {!current.target && (
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                {isFirst ? (
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            )}

            <h3 className="text-base font-semibold text-slate-100 mb-1.5">{current.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">{current.description}</p>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              {!isFirst ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Back
                </button>
              ) : (
                <div />
              )}
              {isLast ? (
                <button
                  onClick={dismiss}
                  className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  Get Started
                </button>
              ) : (
                <button
                  onClick={() => setStep(step + 1)}
                  className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  {isFirst ? "Start Tour" : "Next"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
