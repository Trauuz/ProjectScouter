import "server-only";

import { eq } from "drizzle-orm";

import { getDatabase } from "@/server/database/client";
import {
  accountMonthlyUsage,
  researchRuns,
  usageReservations,
} from "@/server/database/schema";

export async function deleteAccountData(userId: string): Promise<void> {
  await getDatabase().transaction(async (transaction) => {
    await transaction.delete(researchRuns).where(eq(researchRuns.userId, userId));
    await transaction
      .delete(usageReservations)
      .where(eq(usageReservations.userId, userId));
    await transaction
      .delete(accountMonthlyUsage)
      .where(eq(accountMonthlyUsage.userId, userId));
  });
}
