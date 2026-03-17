"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-100 text-center mb-2">Reset your password</h1>

        {sent ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-lg p-8 text-center">
            <div className="w-12 h-12 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-slate-300 mb-4">
              If an account exists for <strong>{email}</strong>, we sent a password reset link.
            </p>
            <p className="text-sm text-slate-500">Check your inbox and spam folder.</p>
            <Link href="/login" className="block mt-6 text-sm text-emerald-400 hover:text-emerald-300 font-medium">
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-400 text-center mb-6">
              Enter your email and we&apos;ll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-xl shadow-lg p-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
              <p className="text-center text-sm text-slate-400">
                <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
                  Back to login
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
