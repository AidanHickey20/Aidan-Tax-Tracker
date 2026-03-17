import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendWelcomeEmail(email: string, name: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  await getResend().emails.send({
    from: process.env.EMAIL_FROM || "Taxora <noreply@resend.dev>",
    to: email,
    subject: "Welcome to Taxora!",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1e293b;">Welcome to Taxora${name ? `, ${name}` : ""}!</h2>
        <p style="color: #475569;">You're all set with a <strong>14-day free trial</strong> with full access to every feature, including the AI Tax Advisor, Investment Tracker, and Deal Tracker.</p>
        <p style="color: #475569;">Here's how to get started:</p>
        <ol style="color: #475569;">
          <li>Head to <strong>Weekly Entry</strong> to log your first week of income and expenses</li>
          <li>Check out <strong>Settings</strong> to customize your accounts and goals</li>
          <li>Explore the <strong>Dashboard</strong> to see your tax picture</li>
        </ol>
        <a href="${baseUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">Go to Taxora</a>
        <p style="color: #94a3b8; font-size: 14px;">Questions? Just reply to this email.</p>
      </div>
    `,
  });
}

export async function sendTrialEndingEmail(email: string, name: string, daysLeft: number) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  await getResend().emails.send({
    from: process.env.EMAIL_FROM || "Taxora <noreply@resend.dev>",
    to: email,
    subject: daysLeft > 0 ? `Your Taxora trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}` : "Your Taxora trial has ended",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1e293b;">${daysLeft > 0 ? `Your trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}` : "Your free trial has ended"}</h2>
        <p style="color: #475569;">${daysLeft > 0
          ? `Hi${name ? ` ${name}` : ""}, your 14-day free trial is almost over. Choose a plan to keep using all your favorite features.`
          : `Hi${name ? ` ${name}` : ""}, your free trial has ended. Choose a plan to continue using Taxora.`
        }</p>
        <p style="color: #475569;"><strong>Basic — $9.99/mo:</strong> Income tracking, tax estimates, exports, and net worth dashboard.</p>
        <p style="color: #475569;"><strong>Pro — $19.99/mo:</strong> Everything in Basic plus AI Tax Advisor, Investment Tracker, and Deal Tracker.</p>
        <a href="${baseUrl}/billing" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">Choose a Plan</a>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  await getResend().emails.send({
    from: process.env.EMAIL_FROM || "Taxora <noreply@resend.dev>",
    to: email,
    subject: "Reset your Taxora password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1e293b;">Reset your password</h2>
        <p style="color: #475569;">Click the button below to reset your Taxora password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">Reset Password</a>
        <p style="color: #94a3b8; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
