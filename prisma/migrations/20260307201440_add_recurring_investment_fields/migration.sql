-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TrackedInvestment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "shares" REAL NOT NULL DEFAULT 0,
    "avgCost" REAL NOT NULL DEFAULT 0,
    "recurringAmount" REAL NOT NULL DEFAULT 0,
    "recurringDay" INTEGER NOT NULL DEFAULT -1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_TrackedInvestment" ("avgCost", "createdAt", "id", "name", "shares", "symbol", "type") SELECT "avgCost", "createdAt", "id", "name", "shares", "symbol", "type" FROM "TrackedInvestment";
DROP TABLE "TrackedInvestment";
ALTER TABLE "new_TrackedInvestment" RENAME TO "TrackedInvestment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
