import { getTenantContainer } from "@/lib/container";
import { requireTenant } from "@/lib/auth/tenant";
import { TariffManager } from "@/components/tariffs/tariff-manager";

export const dynamic = "force-dynamic";

export default async function TariffPage() {
  const tariff = await getTenantContainer(await requireTenant()).tariffService.getTariff();
  return <TariffManager tariff={tariff} />;
}
