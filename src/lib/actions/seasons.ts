"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { getTenantContainer } from "@/lib/container";
import { requireTenant } from "@/lib/auth/tenant";
import type { HighSeasonRange, SeasonConfig } from "@/lib/domain/types";
import type { ActionResult } from "./bookings";

function toError(error: unknown): string {
  if (error instanceof ZodError) return error.issues.map((i) => i.message).join(". ");
  return error instanceof Error ? error.message : "Something went wrong.";
}

function revalidateSeason() {
  revalidatePath("/seasons");
  revalidatePath("/calendar");
}

export async function importSeasonYearAction(year: number): Promise<ActionResult<SeasonConfig>> {
  try {
    const { seasonService } = getTenantContainer(await requireTenant());
    const config = await seasonService.importYears([year]);
    revalidateSeason();
    return { ok: true, data: config };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function saveSeasonRangesAction(
  ranges: HighSeasonRange[],
): Promise<ActionResult<SeasonConfig>> {
  try {
    const { seasonService } = getTenantContainer(await requireTenant());
    const config = await seasonService.saveManualRanges(ranges);
    revalidateSeason();
    return { ok: true, data: config };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
