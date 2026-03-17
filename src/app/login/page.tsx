"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Redirect to the landing page, preserving query params
    const params = searchParams.toString();
    window.location.href = `/welcome${params ? `?${params}` : ""}`;
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <p className="text-slate-500">Redirecting...</p>
    </div>
  );
}
