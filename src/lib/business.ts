import { prisma } from "@/lib/prisma";

// The models whose rows belong to a specific business.
// Used when adopting a user's legacy (null-businessId) rows into their default.
async function adoptOrphanRows(userId: string, businessId: string) {
  await Promise.all([
    prisma.weeklyEntry.updateMany({ where: { userId, businessId: null }, data: { businessId } }),
    prisma.recurringItem.updateMany({ where: { userId, businessId: null }, data: { businessId } }),
    prisma.deal.updateMany({ where: { userId, businessId: null }, data: { businessId } }),
    prisma.reminder.updateMany({ where: { userId, businessId: null }, data: { businessId } }),
    prisma.document.updateMany({ where: { userId, businessId: null }, data: { businessId } }),
  ]);
}

export async function getBusinesses(userId: string) {
  return prisma.business.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });
}

/**
 * Ensure the user has at least one business and return the default (first) one.
 * On first creation it also "adopts" any of the user's existing rows that have
 * no businessId yet — so migrating a live account never loses or hides data,
 * and it self-heals any rows the old code left behind during the rollout.
 */
export async function ensureDefaultBusiness(userId: string) {
  const existing = await prisma.business.findFirst({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });
  if (existing) {
    await adoptOrphanRows(userId, existing.id);
    return existing;
  }

  const business = await prisma.business.create({
    data: { userId, name: "Business 1", sortOrder: 0 },
  });

  // Seed the business's tax settings from the user's existing settings so the
  // first business behaves exactly as before the split.
  const us = await prisma.userSettings.findUnique({ where: { userId } });
  await prisma.businessSettings.create({
    data: {
      businessId: business.id,
      incomeGoal: us?.incomeGoal ?? 0,
      filingStatus: us?.filingStatus ?? "SINGLE",
      state: us?.state ?? "OH",
      stateTaxRate: us?.stateTaxRate ?? 0.035,
      municipalTaxRate: us?.municipalTaxRate ?? 0.02,
      mileageRate: us?.mileageRate ?? 0.7,
      additionalW2Income: us?.additionalW2Income ?? 0,
      rentalIncome: us?.rentalIncome ?? 0,
      savedDescriptions: us?.savedDescriptions ?? undefined,
    },
  });

  await adoptOrphanRows(userId, business.id);
  return business;
}

/**
 * Resolve the business the user is currently working in. Falls back to (and
 * creates) the default business if none is active or the stored active id no
 * longer belongs to the user. Always returns a valid business id.
 */
export async function getActiveBusinessId(userId: string): Promise<string> {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const activeId = settings?.activeBusinessId;

  if (activeId) {
    const owned = await prisma.business.findFirst({ where: { id: activeId, userId } });
    if (owned) return owned.id;
  }

  const def = await ensureDefaultBusiness(userId);
  if (settings && settings.activeBusinessId !== def.id) {
    await prisma.userSettings.update({
      where: { userId },
      data: { activeBusinessId: def.id },
    });
  }
  return def.id;
}

/** Verify a business id belongs to the user; throws if not. */
export async function assertBusinessOwned(userId: string, businessId: string) {
  const owned = await prisma.business.findFirst({ where: { id: businessId, userId } });
  if (!owned) throw new Error("Business not found");
  return owned;
}
