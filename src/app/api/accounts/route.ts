import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";
import { validate, createUserAccountSchema, updateUserAccountSchema, deleteByIdSchema } from "@/lib/validations";
import { canUserEdit } from "@/lib/subscription";

const EXPIRED_MSG = { error: "Your trial has ended. Choose a plan to continue editing." };

const DEFAULT_ACCOUNTS = [
  { name: "Checking", category: "CASH", group: null, sortOrder: 0 },
  { name: "Savings", category: "CASH", group: null, sortOrder: 1 },
  { name: "Business", category: "CASH", group: null, sortOrder: 2 },
  { name: "Tax Savings", category: "CASH", group: null, sortOrder: 3 },
];

export async function GET() {
  const userId = await requireUserId();

  let accounts = await prisma.userAccount.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });

  // Auto-create defaults for new users
  if (accounts.length === 0) {
    await prisma.userAccount.createMany({
      data: DEFAULT_ACCOUNTS.map((a) => ({ ...a, userId })),
    });
    accounts = await prisma.userAccount.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
    });
  }

  return NextResponse.json(accounts);
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (!(await canUserEdit(userId))) return NextResponse.json(EXPIRED_MSG, { status: 403 });
  const body = await request.json();
  const parsed = validate(createUserAccountSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const account = await prisma.userAccount.create({
    data: {
      userId,
      name: parsed.data.name,
      category: parsed.data.category,
      group: parsed.data.group || null,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });

  return NextResponse.json(account, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const userId = await requireUserId();
  if (!(await canUserEdit(userId))) return NextResponse.json(EXPIRED_MSG, { status: 403 });
  const body = await request.json();
  const parsed = validate(updateUserAccountSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const existing = await prisma.userAccount.findFirst({
    where: { id: parsed.data.id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const account = await prisma.userAccount.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name ?? existing.name,
      category: parsed.data.category ?? existing.category,
      group: parsed.data.group !== undefined ? parsed.data.group : existing.group,
      sortOrder: parsed.data.sortOrder ?? existing.sortOrder,
      isActive: parsed.data.isActive ?? existing.isActive,
    },
  });

  return NextResponse.json(account);
}

export async function DELETE(request: NextRequest) {
  const userId = await requireUserId();
  if (!(await canUserEdit(userId))) return NextResponse.json(EXPIRED_MSG, { status: 403 });
  const body = await request.json();
  const parsed = validate(deleteByIdSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { id } = parsed.data;

  const existing = await prisma.userAccount.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.userAccount.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
