import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata = { title: "Privacy Policy — Taxora" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/welcome"><Logo size="md" /></Link>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-12 prose prose-slate prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-slate-400">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

        <h2>1. Information We Collect</h2>
        <p><strong>Account Information:</strong> Name, email address, and password (hashed) when you create an account. If you sign in with Google, we receive your name, email, and profile picture.</p>
        <p><strong>Financial Data:</strong> Income, expenses, mileage, account balances, investment holdings, and deal information that you voluntarily enter into the Service.</p>
        <p><strong>Billing Information:</strong> Payment processing is handled by Stripe. We do not store credit card numbers. We store your Stripe customer ID and subscription status.</p>

        <h2>2. How We Use Your Information</h2>
        <p>We use your information to: provide and improve the Service, process payments, send account-related communications (password resets, billing notices), and calculate tax estimates.</p>

        <h2>3. AI Tax Advisor</h2>
        <p>The AI Tax Advisor feature sends your questions to OpenAI for processing. Your financial data is not sent to OpenAI — only the messages you type in the chat. OpenAI&apos;s data usage is governed by their privacy policy.</p>

        <h2>4. Data Sharing</h2>
        <p>We do not sell your personal or financial data. We share data only with: Stripe (payment processing), OpenAI (AI chat feature, Pro plan only), and as required by law.</p>

        <h2>5. Data Security</h2>
        <p>We use industry-standard security measures including encrypted connections (HTTPS), hashed passwords (bcrypt), and secure database hosting. However, no method of transmission over the Internet is 100% secure.</p>

        <h2>6. Data Retention</h2>
        <p>Your data is retained as long as your account is active. You may request deletion of your account and all associated data by contacting us.</p>

        <h2>7. Your Rights</h2>
        <p>You may: access and export your data at any time through the Service, request correction of inaccurate data, request deletion of your account, and opt out of non-essential communications.</p>

        <h2>8. Cookies</h2>
        <p>We use essential cookies for authentication and session management. We do not use third-party tracking cookies.</p>

        <h2>9. Changes to This Policy</h2>
        <p>We may update this policy at any time. We will notify you of significant changes via email or in-app notice.</p>

        <h2>10. Contact</h2>
        <p>For privacy-related questions, contact us at the email address associated with your account.</p>
      </div>
    </div>
  );
}
