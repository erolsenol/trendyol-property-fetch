-- CreateTable
CREATE TABLE "Offer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Offer_url_key" ON "Offer"("url");
