-- CreateEnum
CREATE TYPE "WorkflowPlan" AS ENUM ('AI_PLUS_HUMAN', 'HUMAN_ONLY', 'AI_ONLY');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "plan" "WorkflowPlan" NOT NULL DEFAULT 'AI_PLUS_HUMAN';
