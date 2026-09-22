import { closeDatabase } from "../server/database/client";
import { getProviderUsageLedger } from "../server/provider-usage/infrastructure/drizzle-provider-usage-ledger";

async function main(): Promise<void> {
  const candidate = process.argv[2] ?? "daily";
  if (!new Set(["daily", "monthly"]).has(candidate)) {
    throw new Error("Usage: provider-usage-summary.ts daily|monthly");
  }
  const period = candidate === "daily" ? "day" : "month";
  try {
    const summary = await getProviderUsageLedger().summarize(period);
    process.stdout.write(`${JSON.stringify({
      event: "provider_usage.summary",
      generatedAt: new Date().toISOString(),
      ...summary,
    })}\n`);
  } finally {
    await closeDatabase();
  }
}

void main();
