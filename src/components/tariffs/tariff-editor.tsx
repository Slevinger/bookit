"use client";

import { Plus, X } from "lucide-react";
import type { Tariff } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

export interface TariffCombinationDraft {
  key: number;
  adults: string;
  children: string;
  price: string;
}

export interface TariffDraft {
  adultPrice: string;
  childPrice: string;
  combinations: TariffCombinationDraft[];
}

export const emptyTariffDraft = (): TariffDraft => ({
  adultPrice: "",
  childPrice: "",
  combinations: [],
});

export const tariffToDraft = (tariff?: Tariff | null): TariffDraft =>
  tariff
    ? {
        adultPrice: tariff.adultPrice ? String(tariff.adultPrice) : "",
        childPrice: tariff.childPrice ? String(tariff.childPrice) : "",
        combinations: tariff.combinations.map((c, i) => ({
          key: i,
          adults: String(c.adults),
          children: String(c.children),
          price: String(c.price),
        })),
      }
    : emptyTariffDraft();

/** Converts editor state to a `Tariff`, dropping incomplete combination rows. */
export const draftToTariff = (draft: TariffDraft): Tariff => ({
  adultPrice: Number(draft.adultPrice || 0),
  childPrice: Number(draft.childPrice || 0),
  combinations: draft.combinations
    .filter((c) => c.adults !== "" && c.children !== "" && c.price !== "")
    .map((c) => ({
      adults: Number(c.adults),
      children: Number(c.children),
      price: Number(c.price),
    })),
});

export function TariffEditor({
  value,
  onChange,
}: {
  value: TariffDraft;
  onChange: (next: TariffDraft) => void;
}) {
  const { t } = useI18n();

  const setCombination = (key: number, patch: Partial<TariffCombinationDraft>) =>
    onChange({
      ...value,
      combinations: value.combinations.map((c) => (c.key === key ? { ...c, ...patch } : c)),
    });

  const addCombination = () =>
    onChange({
      ...value,
      combinations: [
        ...value.combinations,
        {
          key: value.combinations.reduce((max, c) => Math.max(max, c.key), -1) + 1,
          adults: "2",
          children: "0",
          price: "",
        },
      ],
    });

  const removeCombination = (key: number) =>
    onChange({ ...value, combinations: value.combinations.filter((c) => c.key !== key) });

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="tariff-adult" className="text-base">
            {t("tariff.adultPrice")}
          </Label>
          <Input
            id="tariff-adult"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            className="h-13 text-base"
            placeholder="0"
            value={value.adultPrice}
            onChange={(e) => onChange({ ...value, adultPrice: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tariff-child" className="text-base">
            {t("tariff.childPrice")}
          </Label>
          <Input
            id="tariff-child"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            className="h-13 text-base"
            placeholder="0"
            value={value.childPrice}
            onChange={(e) => onChange({ ...value, childPrice: e.target.value })}
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{t("tariff.perNightHint")}</p>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">{t("tariff.combinations")}</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addCombination}>
            <Plus className="size-4" /> {t("tariff.addCombination")}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{t("tariff.combinationsHint")}</p>

        {value.combinations.length > 0 && (
          <div className="grid gap-2">
            <div className="grid grid-cols-[1fr_1fr_1.3fr_auto] items-center gap-2 px-1 text-sm text-muted-foreground">
              <span>{t("tariff.adults")}</span>
              <span>{t("tariff.children")}</span>
              <span>{t("tariff.price")}</span>
              <span className="w-9" />
            </div>
            {value.combinations.map((combo) => (
              <div
                key={combo.key}
                className="grid grid-cols-[1fr_1fr_1.3fr_auto] items-center gap-2"
              >
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  aria-label={t("tariff.adults")}
                  className="h-12 text-base"
                  value={combo.adults}
                  onChange={(e) => setCombination(combo.key, { adults: e.target.value })}
                />
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  aria-label={t("tariff.children")}
                  className="h-12 text-base"
                  value={combo.children}
                  onChange={(e) => setCombination(combo.key, { children: e.target.value })}
                />
                <Input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  aria-label={t("tariff.price")}
                  className="h-12 text-base"
                  placeholder="0"
                  value={combo.price}
                  onChange={(e) => setCombination(combo.key, { price: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label={t("tariff.removeCombination")}
                  onClick={() => removeCombination(combo.key)}
                >
                  <X className="size-5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
