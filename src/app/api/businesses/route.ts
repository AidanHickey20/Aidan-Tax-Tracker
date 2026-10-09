import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";
import {
  getBusinesses,
  ensureDefaultBusiness,
  getActiveBusinessId,
  assertBusinessOwned,
} from "@/lib/business";
import { logError } from "@/lib/logger";

// GET — list the user's businesses plus which one is active and whether the
// multi-business feature is turned on.
export async function GET() {
  try {
    const userId = await requireUserId();
    await ensureDefaultBusiness(userId);
    const [businesses, activeBusinessId, settings] = await Promise.all([
      getBusinesses(userId),
      getActiveBusinessId(userId),
      prisma.userSettings.findUnique({ where: { userId }, select: { multiBusinessEnabled: true } }),
    ]);
    return NextResponse.json({
      businesses,
      activeBusinessId,
      multiBusinessEnabled: settings?.multiBusinessEnabled ?? false,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load businesses";
    if (message !== "Unauthorized") logError("businesses.list_failed", e);
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}

// POST — create a new business, seeding its tax settings from the active one.
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 100) {
      return NextResponse.json({ error: "A business name is required (max 100 chars)." }, { status: 400 });
    }

    const count = await prisma.business.count({ where: { userId } });
    if (count >= 20) {
      return NextResponse.json({ error: "You can have at most 20 businesses." }, { status: 400 });
    }

    // Seed new business settings from the current active business, if any.
    const activeId = await getActiveBusinessId(userId);
    const activeSettings = await prisma.businessSettings.findUnique({ where: { businessId: activeId } });

    const business = await prisma.business.create({
      data: {
        userId,
        name,
        sortOrder: count,
        settings: {
          create: {
            filingStatus: activeSettings?.filingStatus ?? "SINGLE",
            state: activeSettings?.state ?? "OH",
            stateTaxRate: activeSettings?.stateTaxRate ?? 0.035,
            municipalTaxRate: activeSettings?.municipalTaxRate ?? 0.02,
            mileageRate: activeSettings?.mileageRate ?? 0.7,
          },
        },
      },
    });
    return NextResponse.json(business);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create business";
    if (message !== "Unauthorized") logError("businesses.create_failed", e);
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}

// PATCH — rename a business, switch the active business, or toggle the feature.
//   { action: "rename", businessId, name }
//   { action: "setActive", businessId }
//   { action: "toggle", enabled }
export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();

    if (body.action === "toggle") {
      await ensureDefaultBusiness(userId);
      await prisma.userSettings.update({
        where: { userId },
        data: { multiBusinessEnabled: !!body.enabled },
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "rename") {
      await assertBusinessOwned(userId, body.businessId);
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length > 100) {
        return NextResponse.json({ error: "A business name is required (max 100 chars)." }, { status: 400 });
      }
      await prisma.business.update({ where: { id: body.businessId }, data: { name } });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "setActive") {
      await assertBusinessOwned(userId, body.businessId);
      await prisma.userSettings.update({
        where: { userId },
        data: { activeBusinessId: body.businessId },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update business";
    if (message !== "Unauthorized" && message !== "Business not found") {
      logError("businesses.update_failed", e);
    }
    const status = message === "Unauthorized" ? 401 : message === "Business not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE — remove a business and all its data (cascade). Refuses to delete the
// last remaining business; reassigns the active business if needed.
export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { id } = await request.json();
    if (typeof id !== "string") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    await assertBusinessOwned(userId, id);

    const count = await prisma.business.count({ where: { userId } });
    if (count <= 1) {
      return NextResponse.json(
        { error: "You can't delete your only business." },
        { status: 400 }
      );
    }

    await prisma.business.delete({ where: { id } });

    // If the deleted business was active, switch to another.
    const settings = await prisma.userSettings.findUnique({ where: { userId } });
    if (settings?.activeBusinessId === id || !settings?.activeBusinessId) {
      const next = await prisma.business.findFirst({ where: { userId }, orderBy: { sortOrder: "asc" } });
      await prisma.userSettings.update({
        where: { userId },
        data: { activeBusinessId: next?.id ?? null },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to delete business";
    if (message !== "Unauthorized" && message !== "Business not found") {
      logError("businesses.delete_failed", e);
    }
    const status = message === "Unauthorized" ? 401 : message === "Business not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
