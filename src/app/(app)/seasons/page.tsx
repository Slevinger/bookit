import { getTenantContainer } from "@/lib/container";
import { requireTenant } from "@/lib/auth/tenant";
import { SeasonManager } from "@/components/seasons/season-manager";

export const dynamic = "force-dynamic";

export default async function SeasonsPage() {
  const { seasonService } = getTenantContainer(await requireTenant());
  const thisYear = new Date().getFullYear();
  const years = [thisYear, thisYear + 1];
  // Lazily import this year and next so "every new year" is covered automatically.
  const config = await seasonService.ensureYears(years).catch(() => seasonService.getSeason());
  return <SeasonManager config={config} years={years} />;
}
