"use client";

import { usePathname } from "next/navigation";
import IncomeGoalBar from "./IncomeGoalBar";
import PrivacyToggle from "./PrivacyToggle";

const PUBLIC_ROUTES = new Set(["/login", "/signup", "/welcome", "/forgot-password", "/reset-password", "/terms", "/privacy"]);

export default function TopBar() {
  const pathname = usePathname();
  if (PUBLIC_ROUTES.has(pathname)) return null;

  return (
    <div className="flex items-start justify-between gap-4 px-8 pt-6 pb-0">
      <div className="flex-1 min-w-0">
        <IncomeGoalBar />
      </div>
      <div className="flex-shrink-0 pt-0.5">
        <PrivacyToggle />
      </div>
    </div>
  );
}
