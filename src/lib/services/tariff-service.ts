import { tariffSchema, type TariffInput } from "@/lib/domain/tariff";
import type { Tariff } from "@/lib/domain/types";
import type { TariffRepository } from "@/lib/repositories/types";

export type { TariffInput };

export function createTariffService({ tariffRepo }: { tariffRepo: TariffRepository }) {
  return {
    async getTariff(): Promise<Tariff | null> {
      return tariffRepo.get();
    },

    async saveTariff(input: TariffInput): Promise<Tariff> {
      const parsed = tariffSchema.parse(input);
      return tariffRepo.set(parsed);
    },
  };
}

export type TariffService = ReturnType<typeof createTariffService>;
