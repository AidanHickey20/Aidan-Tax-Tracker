import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { validate, registerSchema } from "@/lib/validations";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = validate(registerSchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // Create default settings
    await prisma.userSettings.create({
      data: { userId: user.id, refDate: new Date() },
    });

    // Create default accounts
    await prisma.userAccount.createMany({
      data: [
        { userId: user.id, name: "Checking", category: "CASH", sortOrder: 0 },
        { userId: user.id, name: "Savings", category: "CASH", sortOrder: 1 },
        { userId: user.id, name: "Business", category: "CASH", sortOrder: 2 },
      ],
    });

    // Create trial subscription
    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: "TRIAL",
        status: "ACTIVE",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, name).catch(() => {});

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
