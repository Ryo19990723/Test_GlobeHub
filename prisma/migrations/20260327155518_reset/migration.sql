/*
  Warnings:

  - You are about to drop the `Audio` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `audioNoteId` on the `Spot` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Audio_tripId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Audio";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spotId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversation_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Turn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Turn_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TokenUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "spotId" TEXT,
    "yearMonth" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Spot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "name" TEXT,
    "placeName" TEXT,
    "lat" REAL,
    "lng" REAL,
    "address" TEXT,
    "category" TEXT,
    "impressionRemarks" TEXT,
    "nextTravelerTips" TEXT,
    "notes" TEXT,
    "atmosphere" TEXT,
    "cost" TEXT,
    "duration" TEXT,
    "rating" INTEGER,
    "locationSource" TEXT,
    "meta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Spot_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Spot" ("address", "createdAt", "id", "lat", "lng", "name", "notes", "tripId") SELECT "address", "createdAt", "id", "lat", "lng", "name", "notes", "tripId" FROM "Spot";
DROP TABLE "Spot";
ALTER TABLE "new_Spot" RENAME TO "Spot";
CREATE INDEX "Spot_tripId_idx" ON "Spot"("tripId");
CREATE TABLE "new_Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "city" TEXT,
    "country" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "peopleCount" TEXT,
    "companyType" TEXT,
    "purpose" TEXT,
    "groupType" TEXT,
    "cityNotes" TEXT,
    "heroUrl" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "safetyTips" TEXT,
    "transportTips" TEXT,
    "travelTips" TEXT,
    "memorableMoment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publishedAt" DATETIME,
    CONSTRAINT "Trip_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Trip" ("authorId", "city", "cityNotes", "country", "createdAt", "groupType", "id", "peopleCount", "publishedAt", "purpose", "status", "summary", "title", "updatedAt") SELECT "authorId", "city", "cityNotes", "country", "createdAt", "groupType", "id", "peopleCount", "publishedAt", "purpose", "status", "summary", "title", "updatedAt" FROM "Trip";
DROP TABLE "Trip";
ALTER TABLE "new_Trip" RENAME TO "Trip";
CREATE INDEX "Trip_status_createdAt_idx" ON "Trip"("status", "createdAt");
CREATE INDEX "Trip_status_publishedAt_idx" ON "Trip"("status", "publishedAt");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "passwordHash" TEXT,
    "displayName" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "instagramUrl" TEXT,
    "xUrl" TEXT,
    "location" TEXT,
    "isRegistered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "displayName", "id") SELECT "createdAt", "displayName", "id" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_spotId_key" ON "Conversation"("spotId");

-- CreateIndex
CREATE INDEX "Conversation_spotId_idx" ON "Conversation"("spotId");

-- CreateIndex
CREATE INDEX "Turn_conversationId_idx" ON "Turn"("conversationId");

-- CreateIndex
CREATE INDEX "TokenUsage_userId_yearMonth_idx" ON "TokenUsage"("userId", "yearMonth");

-- CreateIndex
CREATE INDEX "TokenUsage_yearMonth_idx" ON "TokenUsage"("yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "TokenUsage_userId_spotId_yearMonth_key" ON "TokenUsage"("userId", "spotId", "yearMonth");
