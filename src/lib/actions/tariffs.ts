"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { getTenantContainer } from "@/lib/container";
import { requireTenant } from "@/lib/auth/tenant";
import type { TariffInput } from "@/lib/services/tariff-service";
import type { Tariff } from "@/lib/domain/types";
import type { ActionResult } from "./bookings";

function toError(error: unknown): string {
  if (error instanceof ZodError) return error.issues.map((i) => i.message).join(". ");
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function saveTariffAction(input: TariffInput): Promise<ActionResult<Tariff>> {
  try {
    const { tariffService } = getTenantContainer(await requireTenant());
    const tariff = await tariffService.saveTariff(input);
    revalidatePath("/tariff");
    revalidatePath("/calendar");
    revalidatePath("/bookings");
    return { ok: true, data: tariff };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
