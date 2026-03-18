import { Resend } from "resend";
import { getSeasonalPromo } from "./seasonal-promo";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendWelcomeEmail(email: string, name: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const firstName = name ? name.split(" ")[0] : "";

  await getResend().emails.send({
    from: process.env.EMAIL_FROM || "Taxora <noreply@resend.dev>",
    to: email,
    subject: "Welcome to Taxora — let's get your finances on track",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 40px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #10b981; letter-spacing: -0.5px;">Taxora</h1>
          <p style="margin: 8px 0 0; font-size: 14px; color: #94a3b8;">Smart finances for self-employed professionals</p>
        </div>

        <!-- Body -->
        <div style="padding: 40px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="margin: 0 0 16px; font-size: 22px; color: #1e293b; font-weight: 600;">Welcome${firstName ? `, ${firstName}` : ""}!</h2>
          <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.6;">
            Thanks for signing up. Your account is live with a <strong>14-day free trial</strong> — full access to every feature, no credit card required.
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${baseUrl}" style="display: inline-block; background: #059669; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Get Started</a>
          </div>

          <!-- Quick Start Steps -->
          <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #1e293b;">Here's a quick way to hit the ground running:</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top; width: 32px;">
                <div style="width: 24px; height: 24px; background: #ecfdf5; color: #059669; border-radius: 50%; text-align: center; line-height: 24px; font-size: 13px; font-weight: 700;">1</div>
              </td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">
                <p style="margin: 0; font-size: 14px; color: #1e293b; font-weight: 500;">Log your first week</p>
                <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">Head to Weekly Entry and add your income and expenses.</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                <div style="width: 24px; height: 24px; background: #ecfdf5; color: #059669; border-radius: 50%; text-align: center; line-height: 24px; font-size: 13px; font-weight: 700;">2</div>
              </td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">
                <p style="margin: 0; font-size: 14px; color: #1e293b; font-weight: 500;">Customize your settings</p>
                <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">Set your filing status, tax rates, and accounts.</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; vertical-align: top;">
                <div style="width: 24px; height: 24px; background: #ecfdf5; color: #059669; border-radius: 50%; text-align: center; line-height: 24px; font-size: 13px; font-weight: 700;">3</div>
              </td>
              <td style="padding: 12px 16px;">
                <p style="margin: 0; font-size: 14px; color: #1e293b; font-weight: 500;">Check your dashboard</p>
                <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">See your tax estimates, net worth, and financial overview.</p>
              </td>
            </tr>
          </table>

          <!-- Divider -->
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 24px;" />

          <!-- What's Included -->
          <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #1e293b;">Your trial includes:</p>
          <p style="margin: 0 0 6px; font-size: 13px; color: #475569; line-height: 1.5;">
            &#10003; Weekly income &amp; expense tracking &nbsp;&bull;&nbsp;
            &#10003; Tax estimation calculator &nbsp;&bull;&nbsp;
            &#10003; Net worth dashboard &nbsp;&bull;&nbsp;
            &#10003; AI Tax Advisor &nbsp;&bull;&nbsp;
            &#10003; Investment &amp; crypto tracker &nbsp;&bull;&nbsp;
            &#10003; Real estate deal tracker &nbsp;&bull;&nbsp;
            &#10003; Accountant-ready exports
          </p>

          <!-- Footer -->
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="margin: 0; font-size: 13px; color: #94a3b8; text-align: center;">
            Questions? Just reply to this email — we're happy to help.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendTrialEndingEmail(email: string, name: string, daysLeft: number) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const promo = getSeasonalPromo();

  await getResend().emails.send({
    from: process.env.EMAIL_FROM || "Taxora <noreply@resend.dev>",
    to: email,
    subject: daysLeft > 0 ? `Your Taxora trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} — ${promo.badge}` : `Your Taxora trial has ended — ${promo.badge}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: #059669; color: white; text-align: center; padding: 8px; border-radius: 8px 8px 0 0; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">${promo.name.toUpperCase()} — LIMITED TIME</div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1e293b; margin: 0 0 12px;">${daysLeft > 0 ? `Your trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}` : "Your free trial has ended"}</h2>
          <p style="color: #475569;">${daysLeft > 0
            ? `Hi${name ? ` ${name}` : ""}, your 14-day free trial is almost over. Choose a plan to keep using all your favorite features.`
            : `Hi${name ? ` ${name}` : ""}, your free trial has ended. Choose a plan to continue using Taxora.`
          }</p>
          <p style="color: #475569;"><strong>Basic — <span style="text-decoration: line-through; color: #94a3b8;">${promo.basicOriginal}</span> $9.99/mo:</strong> Income tracking, tax estimates, exports, and net worth dashboard.</p>
          <p style="color: #475569;"><strong>Pro — <span style="text-decoration: line-through; color: #94a3b8;">${promo.proOriginal}</span> $19.99/mo:</strong> Everything in Basic plus AI Tax Advisor, Investment Tracker, and Deal Tracker.</p>
          <a href="${baseUrl}/billing" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">Choose a Plan</a>
        </div>
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
