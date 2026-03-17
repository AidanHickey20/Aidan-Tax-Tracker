import Link from "next/link";

export const metadata = { title: "Terms of Service — Taxora" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/welcome" className="text-xl font-bold text-emerald-400">Taxora</Link>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-12 prose prose-slate prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-sm text-slate-400">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using Taxora (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>

        <h2>2. Description of Service</h2>
        <p>Taxora is a financial tracking and accounting tool designed for self-employed real estate professionals. The Service provides income/expense tracking, tax estimation, and related tools. Taxora is not a licensed CPA, tax advisor, or financial advisor. All tax estimates and AI-generated advice are for informational purposes only.</p>

        <h2>3. Accounts</h2>
        <p>You are responsible for maintaining the security of your account credentials. You must provide accurate information during registration. You may not share your account with others.</p>

        <h2>4. Subscriptions and Billing</h2>
        <p>Paid features require an active subscription. Subscriptions are billed monthly through Stripe. You may cancel at any time through the Billing page. Free trials provide full access for 14 days. No refunds are provided for partial billing periods.</p>

        <h2>5. Acceptable Use</h2>
        <p>You agree not to: use the Service for illegal purposes, attempt to gain unauthorized access, interfere with the Service&apos;s operation, or resell access to the Service.</p>

        <h2>6. Data and Privacy</h2>
        <p>Your use of the Service is also governed by our <Link href="/privacy" className="text-emerald-600">Privacy Policy</Link>. You retain ownership of all data you enter into the Service.</p>

        <h2>7. Disclaimer</h2>
        <p>The Service is provided &quot;as is&quot; without warranties of any kind. Tax estimates are approximations and should not be relied upon as professional tax advice. Always consult a qualified CPA or tax professional before making financial decisions.</p>

        <h2>8. Limitation of Liability</h2>
        <p>Taxora shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service, including but not limited to inaccurate tax estimates or financial losses.</p>

        <h2>9. Changes to Terms</h2>
        <p>We may update these terms at any time. Continued use of the Service after changes constitutes acceptance of the updated terms.</p>

        <h2>10. Contact</h2>
        <p>For questions about these terms, contact us at the email address associated with your account.</p>
      </div>
    </div>
  );
}
