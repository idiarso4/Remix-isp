/*
  Warnings:

  - You are about to drop the column `channel` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `recipient_id` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `recipient_type` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `sent_at` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `employee_id` on the `ticket_notes` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `ticket_notes` table. All the data in the column will be lost.
  - You are about to drop the column `changed_at` on the `ticket_status_history` table. All the data in the column will be lost.
  - You are about to drop the column `changed_by` on the `ticket_status_history` table. All the data in the column will be lost.
  - You are about to drop the column `from_status` on the `ticket_status_history` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `ticket_status_history` table. All the data in the column will be lost.
  - You are about to drop the column `to_status` on the `ticket_status_history` table. All the data in the column will be lost.
  - You are about to drop the `employee_performance` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `user_id` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `content` to the `ticket_notes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by_id` to the `ticket_notes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `changed_by_id` to the `ticket_status_history` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `ticket_status_history` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "employee_performance" DROP CONSTRAINT "employee_performance_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "ticket_notes" DROP CONSTRAINT "ticket_notes_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "ticket_status_history" DROP CONSTRAINT "ticket_status_history_changed_by_fkey";

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "channel",
DROP COLUMN "recipient_id",
DROP COLUMN "recipient_type",
DROP COLUMN "sent_at",
DROP COLUMN "status",
ADD COLUMN     "is_read" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "read_at" TIMESTAMP(3),
ADD COLUMN     "related_id" TEXT,
ADD COLUMN     "related_type" TEXT,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ticket_notes" DROP COLUMN "employee_id",
DROP COLUMN "note",
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "created_by_id" TEXT NOT NULL,
ADD COLUMN     "is_internal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ticket_status_history" DROP COLUMN "changed_at",
DROP COLUMN "changed_by",
DROP COLUMN "from_status",
DROP COLUMN "reason",
DROP COLUMN "to_status",
ADD COLUMN     "changed_by_id" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "resolution_notes" TEXT,
ADD COLUMN     "resolution_time_hours" DECIMAL(8,2);

-- DropTable
DROP TABLE "employee_performance";

-- DropEnum
DROP TYPE "NotificationChannel";

-- DropEnum
DROP TYPE "NotificationStatus";

-- DropEnum
DROP TYPE "RecipientType";

-- CreateTable
CREATE TABLE "employee_performance_metrics" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "total_tickets_resolved" INTEGER NOT NULL DEFAULT 0,
    "average_resolution_time" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "customer_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_performance_metrics_employee_id_key" ON "employee_performance_metrics"("employee_id");

-- AddForeignKey
ALTER TABLE "ticket_notes" ADD CONSTRAINT "ticket_notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_status_history" ADD CONSTRAINT "ticket_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_performance_metrics" ADD CONSTRAINT "employee_performance_metrics_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
